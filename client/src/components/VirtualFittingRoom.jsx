import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, RotateCcw, Shirt, UserRound } from 'lucide-react';
import { fmt } from '../utils/format.js';
import { CameraPosePreview } from './CameraPosePreview.jsx';
import { FittingScene } from './FittingScene.jsx';

const AVATAR_SRC = '/models/avatars/woman-neutral.glb';
const DRESS_LOOK_SRC = '/models/try-on/looks/woman-vestido-elegante.glb';
const AVATAR_FOV_DEG = 30;
const GARMENT_CATEGORY_MAP = {
  camiseta: 'camiseta', camisetas: 'camiseta', camisa: 'camisa', camisas: 'camisa',
  blusa: 'blusa', blusas: 'blusa', pantalon: 'pantalon', pantalones: 'pantalon',
  jean: 'jeans', jeans: 'jeans', vestido: 'vestido', vestidos: 'vestido',
  falda: 'falda', faldas: 'falda', chaqueta: 'chaqueta', chaquetas: 'chaqueta',
  camisola: 'camisola', camisolas: 'camisola', polo: 'polo', sueter: 'sueter',
  shorts: 'shorts', bermuda: 'bermudas', bermudas: 'bermudas',
  legging: 'leggings', leggings: 'leggings', enterizo: 'enterizo', enterizos: 'enterizo',
  conjunto: 'conjunto', conjuntos: 'conjunto', zapato: 'zapatos', zapatos: 'zapatos',
  tenis: 'tenis', zapatilla: 'tenis', zapatillas: 'tenis', calzado: 'tenis',
  sandalia: 'sandalias', sandalias: 'sandalias', bota: 'botas', botas: 'botas',
  bolso: 'bolso', accesorio: 'accesorio',
};

function normalizeText(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function productCategory(product) {
  return product.categoria || product.subcategoria || 'Sin categoría';
}

function wardrobeType(product) {
  // `categoria` can be broad (“Ropa”); the actual garment is often stored in
  // subcategory or only named in the product title.
  const candidates = [product.subcategoria, product.nombre, product.producto, product.categoria]
    .map((value) => normalizeText(value || '').trim());
  for (const candidate of candidates) {
    const exact = GARMENT_CATEGORY_MAP[candidate];
    if (exact) return exact;
    const match = Object.entries(GARMENT_CATEGORY_MAP).find(([label]) => candidate.includes(label));
    if (match) return match[1];
  }
  return null;
}

function fittingModelPath(garmentType) {
  return garmentType ? `/models/fitting/femenino-${garmentType}.glb` : null;
}

function frameAvatar(viewer) {
  if (!viewer?.loaded || typeof viewer.getDimensions !== 'function') return;
  const dimensions = viewer.getDimensions();
  const center = viewer.getBoundingBoxCenter();
  const rect = viewer.getBoundingClientRect();
  if (!dimensions?.y || !rect.width || !rect.height) return;

  const verticalFov = AVATAR_FOV_DEG * Math.PI / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * rect.width / rect.height);
  const fill = 0.86;
  const verticalDistance = dimensions.y / (2 * Math.tan(verticalFov / 2) * fill);
  const horizontalDistance = dimensions.x / (2 * Math.tan(horizontalFov / 2) * fill);
  const radius = Math.max(verticalDistance, horizontalDistance, dimensions.z / (2 * fill));

  viewer.cameraTarget = `${center.x}m ${center.y}m ${center.z}m`;
  viewer.cameraOrbit = `0deg 90deg ${radius}m`;
  viewer.jumpCameraToGoal();
}

/**
 * The fitting catalog only lists real products supplied by the commercial catalog.
 * A product's existing AR model is deliberately not reused as a worn garment.
 */
export function VirtualFittingRoom({ products = [], variants = [], arItems = [], productId }) {
  const [selectedId, setSelectedId] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [modelError, setModelError] = useState(false);

  useEffect(() => {
    if (productId != null) setSelectedId(String(productId));
  }, [productId]);

  const catalog = useMemo(() => {
    const configured = new Map(arItems.map((item) => [String(item.producto_id), item]));
    const sourceProducts = products.length ? products : arItems;
    return sourceProducts.map((item) => {
      const id = String(item.id ?? item.producto_id ?? '');
      const ar = configured.get(id) || item;
      return {
        ...item,
        id,
        nombre: item.nombre || item.producto || 'Producto sin nombre',
        categoria: item.categoria || ar.categoria,
        precio_base: item.precio_base ?? ar.precio_base,
        precio_usd: item.precio_usd ?? ar.precio_usd,
        imagen_url: item.imagen_url || ar.imagen_url || null,
        modelo_url: item.modelo_url || ar.modelo_url || null,
      };
    }).filter((item) => item.id);
  }, [products, arItems]);

  const defaultDressingProduct = catalog.find((item) => normalizeText(item.nombre).includes('vestido elegante'));
  const selected = catalog.find((item) => item.id === selectedId) || defaultDressingProduct || catalog[0] || null;
  const selectedVariants = variants.filter((variant) => String(variant.producto_id) === selected?.id);
  const colors = [...new Set(selectedVariants.map((variant) => variant.color).filter(Boolean))];
  const sizes = [...new Set(selectedVariants.map((variant) => variant.talla).filter(Boolean))];
  const garmentType = selected ? wardrobeType(selected) : null;
  // El avatar de la experiencia debe conservarse siempre. Los GLB de ropa
  // no deben reemplazarlo por otra figura femenina.
  const selectedModelPath = String(selected?.modelo_url || '').split(/[?#]/)[0].replace(/\/$/, '');
  const isElegantDress = /vestido-elegante-demo\.glb$/i.test(selectedModelPath)
    || normalizeText(selected?.nombre).includes('vestido elegante');
  const garmentSrc = isElegantDress ? DRESS_LOOK_SRC : null;
  const garmentMode = isElegantDress ? 'elegant-dress' : 'none';
  const activeAvatarSrc = AVATAR_SRC;

  return (
    <section className="panel fitting-room">
      <header className="fitting-heading">
        <div>
          <div className="panel-title"><Shirt size={20} /><h2>Probador virtual</h2></div>
          <p className="muted small">Elige un producto del catálogo. Arrastra el avatar para girarlo y usa la rueda para acercar.</p>
        </div>
      </header>

      <div className="fitting-experience">
        <aside className="fitting-catalog" aria-label="Catálogo real de productos">
          <h3>Productos</h3>
          {catalog.length ? catalog.map((product) => (
            <button
              type="button"
              key={product.id}
              className={`fitting-product${selected?.id === product.id ? ' selected' : ''}`}
              aria-pressed={selected?.id === product.id}
              onClick={() => setSelectedId(product.id)}
            >
              {product.imagen_url
                ? <img src={product.imagen_url} alt="" loading="lazy" />
                : <span className="fitting-product-placeholder"><Shirt size={20} /></span>}
              <span className="fitting-product-copy">
                <strong>{product.nombre}</strong>
                <small>{productCategory(product)}</small>
                <small>{product.precio_base != null ? fmt(product.precio_base, 'NIO') : product.precio_usd != null ? fmt(product.precio_usd, 'USD') : 'Precio no registrado'}</small>
              </span>
              {selected?.id === product.id && <Check size={16} />}
            </button>
          )) : <p className="muted small">No hay productos disponibles para mostrar en esta sesión.</p>}
        </aside>

        <div className="fitting-center">
          <FittingScene
            avatarSrc={activeAvatarSrc}
            garmentSrc={garmentSrc}
            garmentMode={garmentMode}
            alt="Avatar humano 3D de mujer adulta con la prenda seleccionada"
          />
          {modelError && <p className="fitting-error" role="alert">No se pudo cargar el modelo 3D local. Comprueba que el servidor frontend esté activo.</p>}
          <p className="fitting-caption">{isElegantDress ? 'Vestido elegante aplicado en una composición 3D compatible.' : 'Avatar femenino conservado. Esta prenda aún no tiene un modelo 3D compatible para vestirlo.'}</p>
        </div>

        <aside className="fitting-details" aria-live="polite">
          <h3>Detalles de la selección</h3>
          {selected ? <>
            {selected.imagen_url && <img className="fitting-detail-image" src={selected.imagen_url} alt={`Fotografía de ${selected.nombre}`} />}
            <h4>{selected.nombre}</h4>
            <p>{productCategory(selected)}</p>
            <strong className="fitting-price">{selected.precio_base != null ? fmt(selected.precio_base, 'NIO') : selected.precio_usd != null ? fmt(selected.precio_usd, 'USD') : 'Precio no registrado'}</strong>
            {colors.length > 0 && <p><b>Colores registrados:</b> {colors.join(', ')}</p>}
            {sizes.length > 0 && <p><b>Tallas registradas:</b> {sizes.join(', ')}</p>}
            <p className="fitting-limit-note">Los colores y tallas corresponden a las variantes registradas del producto.</p>
          </> : <p className="muted small">Selecciona un producto del catálogo.</p>}
          <div className="fitting-avatar-status"><UserRound size={16} /><span><b>Avatar:</b> mujer adulta</span></div>
        </aside>
      </div>

      <button type="button" className="ghost fitting-camera-toggle" onClick={() => setCameraOpen((open) => !open)}>
        <Camera size={15} /> {cameraOpen ? 'Cerrar cámara y postura' : 'Comprobar cámara y postura'}
      </button>
      {cameraOpen && <CameraPosePreview />}
    </section>
  );
}
