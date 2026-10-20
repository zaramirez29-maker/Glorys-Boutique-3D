import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
const MODEL_URL = '/models/pose/pose_landmarker_lite.task';
const EDGES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]
];
const REQUIRED_POINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

function drawPose(canvas, landmarks) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;
  context.lineWidth = Math.max(3, canvas.width * 0.004);
  context.lineCap = 'round';
  context.strokeStyle = '#f6b8dc';
  for (const [from, to] of EDGES) {
    const a = landmarks[from];
    const b = landmarks[to];
    if ((a.visibility ?? 0) < 0.45 || (b.visibility ?? 0) < 0.45) continue;
    context.beginPath();
    context.moveTo(a.x * canvas.width, a.y * canvas.height);
    context.lineTo(b.x * canvas.width, b.y * canvas.height);
    context.stroke();
  }
  context.fillStyle = '#fff';
  for (const index of REQUIRED_POINTS) {
    const point = landmarks[index];
    if ((point.visibility ?? 0) < 0.45) continue;
    context.beginPath();
    context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(3, canvas.width * 0.006), 0, Math.PI * 2);
    context.fill();
  }
}

function inspectFrame(landmarks) {
  if (!landmarks) return 'No se detecta el cuerpo. Aléjate un poco y colócate frente a la cámara.';
  const visible = REQUIRED_POINTS.every((index) => {
    const point = landmarks[index];
    return point && (point.visibility ?? 0) >= 0.55 && point.x >= 0.015 && point.x <= 0.985 && point.y >= 0.015 && point.y <= 0.985;
  });
  return visible
    ? 'Cuerpo completo dentro del encuadre.'
    : 'No se ven con claridad todas las partes. Aleja la cámara y encuadra desde la cabeza hasta los pies.';
}

export function CameraPosePreview() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Activa la cámara cuando estés listo. El video se analiza localmente en este navegador.');
  const [error, setError] = useState('');

  function stopCamera() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (canvasRef.current) canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setActive(false);
    setBusy(false);
    setMessage('Cámara apagada. El video no se almacena.');
  }

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    landmarkerRef.current?.close();
  }, []);

  async function startCamera() {
    setBusy(true);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Este navegador no permite usar la cámara aquí. Usa HTTPS o localhost y un navegador compatible.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55
      });
      setActive(true);
      setMessage('Buscando el cuerpo completo…');

      const render = () => {
        const canvas = canvasRef.current;
        const currentVideo = videoRef.current;
        if (!canvas || !currentVideo || !landmarkerRef.current) return;
        if (currentVideo.readyState >= 2 && currentVideo.currentTime !== lastVideoTimeRef.current) {
          if (canvas.width !== currentVideo.videoWidth || canvas.height !== currentVideo.videoHeight) {
            canvas.width = currentVideo.videoWidth;
            canvas.height = currentVideo.videoHeight;
            canvas.parentElement.style.aspectRatio = `${currentVideo.videoWidth} / ${currentVideo.videoHeight}`;
          }
          const result = landmarkerRef.current.detectForVideo(currentVideo, performance.now());
          const landmarks = result.landmarks?.[0];
          drawPose(canvas, landmarks);
          setMessage(inspectFrame(landmarks));
          lastVideoTimeRef.current = currentVideo.currentTime;
        }
        animationRef.current = requestAnimationFrame(render);
      };
      animationRef.current = requestAnimationFrame(render);
    } catch (cameraError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      setError(cameraError.name === 'NotAllowedError'
        ? 'No se concedió permiso para la cámara. Puedes autorizarlo desde los permisos del navegador.'
        : cameraError.message || 'No se pudo iniciar la cámara.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="camera-pose-panel" aria-label="Seguimiento corporal con cámara">
      <div className="camera-pose-heading">
        <div>
          <strong><ScanLine size={17} /> Seguimiento corporal</strong>
          <p>Detecta puntos de cabeza, hombros, brazos, cadera, rodillas y tobillos.</p>
        </div>
        {active
          ? <button type="button" className="ghost" onClick={stopCamera}><CameraOff size={15} /> Apagar cámara</button>
          : <button type="button" onClick={startCamera} disabled={busy}><Camera size={15} /> {busy ? 'Preparando…' : 'Activar cámara'}</button>}
      </div>

      <div className="camera-pose-view" hidden={!active && !busy}>
        <video ref={videoRef} muted playsInline aria-label="Vista previa de la cámara" />
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      {error && <p className="camera-pose-message camera-pose-error" role="alert">{error}</p>}
      {!error && <p className="camera-pose-message" aria-live="polite">{message}</p>}
      <p className="camera-pose-note">Vista de validación de pose; todavía no coloca ropa sobre el cuerpo ni calcula tallas. La cámara se activa solo al pulsar el botón y se detiene al apagarla o salir de esta vista.</p>
    </section>
  );
}
