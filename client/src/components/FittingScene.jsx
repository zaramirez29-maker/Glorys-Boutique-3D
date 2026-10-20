import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function findGarment(root) {
  const garment = root.getObjectByName('Prenda');
  if (!garment) return null;
  const clone = garment.clone(true);
  clone.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
  });
  return clone;
}

function cloneStandaloneModel(root) {
  const clone = root.clone(true);
  clone.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
  });
  return clone;
}

function cloneElegantDress(root) {
  const group = new THREE.Group();
  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    if (!object.isMesh || /char1|avatar|body/i.test(object.name)) return;
    const clone = object.clone(true);
    clone.matrix.copy(object.matrixWorld);
    clone.matrixAutoUpdate = false;
    clone.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone();
    });
    group.add(clone);
  });
  return group.children.length ? group : null;
}

function alignGarmentToAvatar(avatar, garment) {
  const avatarBox = new THREE.Box3().setFromObject(avatar);
  const garmentBox = new THREE.Box3().setFromObject(garment);
  const avatarSize = avatarBox.getSize(new THREE.Vector3());
  const garmentSize = garmentBox.getSize(new THREE.Vector3());
  if (!avatarSize.y || !garmentSize.y) return;

  garment.scale.setScalar((avatarSize.y * 0.76) / garmentSize.y);
  garment.updateMatrixWorld(true);
  const alignedBox = new THREE.Box3().setFromObject(garment);
  const avatarCenter = avatarBox.getCenter(new THREE.Vector3());
  const garmentCenter = alignedBox.getCenter(new THREE.Vector3());
  garment.position.x += avatarCenter.x - garmentCenter.x;
  garment.position.z += avatarCenter.z - garmentCenter.z + 0.035;
  garment.position.y += avatarBox.min.y + avatarSize.y * 0.08 - alignedBox.min.y;
}

export function FittingScene({ avatarSrc, garmentSrc, garmentMode = 'standalone', alt }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#faf9fc');
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.target.set(0, 1, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8aebe, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const loader = new GLTFLoader();
    let disposed = false;
    let animationFrame;
    const loaded = [];
    let avatarObject = null;
    let garmentObject = null;

    function addAvatar(gltf) {
      if (disposed) return;
      const avatar = gltf.scene;
      avatar.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => { material.side = THREE.FrontSide; });
          }
        }
      });
      scene.add(avatar);
      loaded.push(avatar);
      avatarObject = avatar;
      if (garmentMode === 'elegant-dress' && garmentObject) alignGarmentToAvatar(avatarObject, garmentObject);
    }

    function addGarment(gltf) {
      if (disposed) return;
      const garment = garmentMode === 'elegant-dress'
        ? cloneElegantDress(gltf.scene)
        : garmentMode === 'fitting-composite'
        ? findGarment(gltf.scene)
        : cloneStandaloneModel(gltf.scene);
      if (!garment) return;
      scene.add(garment);
      loaded.push(garment);
      garmentObject = garment;
      if (garmentMode === 'elegant-dress' && avatarObject) alignGarmentToAvatar(avatarObject, garmentObject);
    }

    if (avatarSrc) loader.load(avatarSrc, addAvatar);
    if (garmentSrc) loader.load(garmentSrc, addGarment);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    camera.position.set(0, 1.05, 4.2);

    const render = () => {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      controls.dispose();
      loaded.forEach((object) => {
        object.traverse((child) => {
          if (!child.isMesh) return;
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        });
      });
      renderer.dispose();
    };
  }, [avatarSrc, garmentSrc]);

  return <canvas ref={canvasRef} className="fitting-scene" role="img" aria-label={alt} />;
}
