import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ImagePlus, ScanSearch, Trash2, Upload } from 'lucide-react';

const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const VIEW_OPTIONS = [
  ['front', 'Frontal'], ['back', 'Posterior'], ['left', 'Lateral izquierda'], ['right', 'Lateral derecha'],
  ['neck', 'Cuello / escote'], ['sleeves', 'Mangas'], ['texture', 'Textura'], ['details', 'Botones / detalles']
];
const GARMENT_CATEGORIES = ['Vestido', 'Camisa', 'Blusa', 'Camiseta', 'Camisola', 'Polo', 'Chaqueta', 'Suéter', 'Sudadera', 'Pantalón', 'Jeans', 'Shorts', 'Bermudas', 'Falda', 'Leggings', 'Enterizo', 'Conjunto', 'Zapatos', 'Tenis', 'Sandalias', 'Botas', 'Bolso', 'Gorra', 'Accesorio'];

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function GarmentPhotoStudio({ products = [] }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [productId, setProductId] = useState('');
  const [category, setCategory] = useState('Vestido');
  const [audience, setAudience] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [captureView, setCaptureView] = useState('front');
  const [images, setImages] = useState([]);
  const imagesRef = useRef(images);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
  }, []);

  async function addFiles(fileList, defaultView = 'front') {
    setError('');
    setNotice('');
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) {
      setError(`Puedes conservar hasta ${MAX_IMAGES} fotografías en este borrador. Elimina alguna antes de agregar más.`);
      return;
    }

    const accepted = [];
    const rejected = [];
    for (const file of files) {
      if (!(ALLOWED_TYPES.has(file.type) || ALLOWED_EXTENSIONS.test(file.name))) {
        rejected.push(`${file.name}: formato no permitido.`);
        continue;
      }
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: el tamaño debe ser menor de 12 MB.`);
        continue;
      }
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
        if (!bitmap.width || !bitmap.height) throw new Error('Imagen sin dimensiones.');
        if (bitmap.width * bitmap.height > MAX_PIXELS) throw new Error('Imagen con resolución demasiado grande.');
      } catch {
        rejected.push(`${file.name}: imagen inválida o con resolución superior a 40 megapíxeles.`);
        continue;
      } finally {
        bitmap?.close();
      }
      accepted.push({ id: makeId(), file, url: URL.createObjectURL(file), view: defaultView });
    }
    if (accepted.length) {
      setImages((current) => [...current, ...accepted]);
      setNotice(`${accepted.length} fotografía${accepted.length === 1 ? '' : 's'} agregada${accepted.length === 1 ? '' : 's'} al borrador temporal de esta sesión.`);
    }
    if (rejected.length) setError(rejected.join(' '));
  }

  async function startCamera() {
    setError('');
    setNotice('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere HTTPS o localhost y un navegador compatible.');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
    } catch (cameraError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(cameraError.name === 'NotAllowedError'
        ? 'No se concedió permiso para la cámara. Puedes habilitarlo desde los permisos del navegador.'
        : cameraError.message || 'No se pudo iniciar la cámara.');
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setError('No se pudo crear la fotografía. Inténtalo de nuevo.');
      return;
    }
    await addFiles([new File([blob], `prenda-${captureView}-${Date.now()}.jpg`, { type: 'image/jpeg' })], captureView);
  }

  function updateView(id, view) {
    setImages((current) => current.map((image) => image.id === id ? { ...image, view } : image));
  }

  function removeImage(id) {
    setImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((image) => image.id !== id);
    });
  }

  const completedViews = new Set(images.map((image) => image.view));
  const viewCount = completedViews.size;
  const quality = viewCount < 2
    ? 'Cobertura muy limitada: una vista no muestra la geometría oculta.'
    : viewCount < 4
      ? 'Cobertura parcial: las vistas adicionales reducen, pero no eliminan, la estimación de partes ocultas.'
      : 'Cobertura de varias vistas: la reconstrucción aún requerirá revisión y ajuste manual.';

  return (
    <section className="panel garment-photo-studio">
      <div className="panel-title"><ScanSearch size={20} /><h2>Preparar modelo 3D desde fotografías</h2></div>
      <p className="muted small">Flujo administrativo de captura y revisión de imágenes de un producto existente. Las imágenes permanecen temporalmente en este navegador.</p>

      <div className="grid-form garment-photo-meta">
        <label className="field"><span>Producto registrado</span>
          <select value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">Seleccionar producto</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}
          </select>
        </label>
        <label className="field"><span>Categoría</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {GARMENT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="field"><span>Público objetivo</span>
          <select value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="">Seleccionar</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option><option value="unisex">Unisex</option>
          </select>
        </label>
        <label className="field"><span>Grupo de edad</span>
          <select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>
            <option value="">Seleccionar</option><option value="adulto">Adulto</option><option value="infantil">Infantil</option>
          </select>
        </label>
      </div>

      <div className="garment-photo-guidance">
        <strong>Vistas de referencia ({viewCount}/8 cubiertas)</strong>
        <p>Las etiquetas clasifican las fotos que aportas; no son modelos ni prendas ya disponibles. Elige una vista antes de capturar o subir y corrígela en cada miniatura si hace falta.</p>
        <div className="garment-photo-view-chips">
          {VIEW_OPTIONS.map(([value, label]) => <span className={completedViews.has(value) ? 'complete' : ''} key={value}>{label}</span>)}
        </div>
        <p>{quality}</p>
        <p>Usa buena iluminación, fondo limpio, prenda extendida o bien colocada, distancia constante y fotos nítidas. Evita sombras fuertes y objetos que cubran la prenda.</p>
      </div>

      <div className="garment-photo-actions">
        <label className="field garment-view-select"><span>Vista que vas a capturar/subir</span>
          <select value={captureView} onChange={(event) => setCaptureView(event.target.value)}>
            {VIEW_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        {!cameraActive
          ? <button type="button" className="ghost" onClick={startCamera}><Camera size={15} /> Activar cámara</button>
          : <>
              <button type="button" onClick={capturePhoto}><Camera size={15} /> Capturar vista</button>
              <button type="button" className="ghost" onClick={stopCamera}><CameraOff size={15} /> Apagar cámara</button>
            </>}
        <button type="button" className="ghost" onClick={() => fileInputRef.current?.click()}><ImagePlus size={15} /> Seleccionar fotografías</button>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple onChange={(event) => { addFiles(event.target.files, captureView); event.target.value = ''; }} />
      </div>

      {cameraActive && <div className="garment-capture-view"><video ref={videoRef} muted playsInline aria-label="Vista previa para fotografiar el producto" /></div>}

      <div className={`garment-photo-drop ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files, captureView); }}>
        <Upload size={18} /><span>Arrastra y suelta JPG, PNG o WEBP aquí. Máximo 8 imágenes y 12 MB por archivo.</span>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}
      {notice && <p className="garment-photo-status" aria-live="polite">{notice}</p>}

      {images.length > 0 && <div className="garment-photo-grid">
        {images.map((image) => (
          <article className="garment-photo-card" key={image.id}>
            <img src={image.url} alt={`Vista ${VIEW_OPTIONS.find(([id]) => id === image.view)?.[1] || ''} de ${image.file.name}`} />
            <div className="garment-photo-card-meta"><span title={image.file.name}>{image.file.name}</span><button type="button" className="ghost danger" aria-label={`Eliminar ${image.file.name}`} onClick={() => removeImage(image.id)}><Trash2 size={14} /></button></div>
            <label className="field"><span>Clasificar vista</span>
              <select value={image.view} onChange={(event) => updateView(image.id, event.target.value)}>
                {VIEW_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <small>{(image.file.size / (1024 * 1024)).toFixed(2)} MB</small>
          </article>
        ))}
      </div>}

      <div className="garment-photo-provider-note" role="status">
        <strong>Este paso todavía no crea el modelo 3D.</strong>
        <span>Solo prepara fotos de referencia. No se envían al servidor ni se conservan al cerrar o recargar la página. Para generar una prenda hace falta integrar un método de reconstrucción y revisar su resultado; por ahora no hay ninguno configurado.</span>
        <button type="button" disabled title="No hay un método de reconstrucción conectado">Generación 3D no disponible</button>
      </div>
      {!productId && <p className="muted small">Selecciona un producto real antes de preparar su solicitud. Las imágenes de este borrador siguen solo en la memoria del navegador.</p>}
    </section>
  );
}
