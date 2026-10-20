import React, { useEffect, useMemo, useState } from 'react';
import { Box, Camera, ExternalLink, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../api.js';
import { fmt } from '../utils/format.js';
import { VirtualFittingRoom } from '../components/VirtualFittingRoom.jsx';
import { GarmentPhotoStudio } from '../components/GarmentPhotoStudio.jsx';
import { BUILT_IN_RA_MODELS } from '../data/builtinRaModels.js';

const emptyForm = {
  producto_id: '',
  modelo_url: '',
  imagen_url: '',
  ios_modelo_url: '',
  escala: '1 1 1',
  ubicacion: 'floor',
  activo: true
};

function ARModel({ item, compact = false }) {
  return (
    <model-viewer
      class={compact ? 'ar-model ar-model--compact' : 'ar-model'}
      src={item.modelo_url}
      ios-src={item.ios_modelo_url || undefined}
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-scale="auto"
      ar-placement={item.ubicacion || 'floor'}
      camera-controls
      auto-rotate
      shadow-intensity="1"
      scale={item.escala || '1 1 1'}
      touch-action="pan-y"
      alt={`Modelo 3D de ${item.producto || 'prenda'}`}
    >
      <button slot="ar-button" className="ar-button">
        <Camera size={16} />
        Ver en mi espacio
      </button>
    </model-viewer>
  );
}

export function AR({ products = [], variants = [], user }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = user?.rol === 'admin';
  const visibleItems = items.filter((item) => /\.(glb|gltf|usdz)(?:$|[?#])/i.test(item.modelo_url || ''));
  const localRaModels = BUILT_IN_RA_MODELS.filter((demo) => !visibleItems.some((item) => item.modelo_url === demo.modelo_url));
  const raGallery = [...visibleItems, ...localRaModels];

  async function load() {
    try {
      const data = await api.get('/ar');
      setItems(data);
      if (!selected) {
        const usableModels = data.filter((item) => /\.(glb|gltf|usdz)(?:$|[?#])/i.test(item.modelo_url || ''));
        const firstUsableModel = usableModels.find((item) => /vestido elegante/i.test(item.producto || item.nombre || '')) || usableModels[0];
        setSelected(firstUsableModel || BUILT_IN_RA_MODELS.find((item) => /vestido/i.test(item.categoria)) || BUILT_IN_RA_MODELS[0] || null);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  const configuredProductIds = useMemo(() => new Set(items.map((item) => item.producto_id)), [items]);
  const availableProducts = products.filter((p) => !configuredProductIds.has(p.id) || editingId);

  function startCreate() {
    setEditingId(null);
    setFormOpen(true);
    setForm(emptyForm);
    setError('');
  }

  function startEdit(item) {
    setEditingId(item.id);
    setFormOpen(true);
    setForm({
      producto_id: String(item.producto_id),
      modelo_url: item.modelo_url || '',
      imagen_url: item.imagen_url || '',
      ios_modelo_url: item.ios_modelo_url || '',
      escala: item.escala || '1 1 1',
      ubicacion: item.ubicacion || 'floor',
      activo: item.activo
    });
    setError('');
  }

  function cancel() {
    setEditingId(null);
    setFormOpen(false);
    setForm(emptyForm);
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      if (editingId) {
        const updated = await api.put(`/ar/${editingId}`, form);
        setItems((current) => current.map((item) => item.id === editingId ? updated : item));
        setSelected(updated);
      } else {
        const created = await api.post('/ar', {
          ...form,
          producto_id: Number(form.producto_id)
        });
        setItems((current) => [created, ...current]);
        setSelected(created);
      }
      cancel();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(item) {
    try {
      const updated = await api.put(`/ar/${item.id}`, { activo: !item.activo });
      setItems((current) => current.map((row) => row.id === item.id ? updated : row));
      if (selected?.id === item.id) setSelected(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!confirm(`Eliminar la configuracion de RA de "${item.producto}"?`)) return;
    try {
      await api.delete(`/ar/${item.id}`);
      setItems((current) => current.filter((row) => row.id !== item.id));
      if (selected?.id === item.id) setSelected(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="ar-page">
      <div className="panel ar-intro">
        <div className="panel-title">
          <Camera size={20} />
          <h2>Realidad aumentada</h2>
        </div>
        <p className="muted">
          Visualiza una representacion 3D de la prenda y, desde un telefono compatible,
          colócala virtualmente en el entorno real.
        </p>
        <a className="ghost ar-public-link" href="/ar" target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Abrir catalogo publico de RA
        </a>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="ar-layout">
        <div className="panel">
          <div className="panel-title">
            <Box size={20} />
          <h2>Modelos de producto para RA</h2>
          </div>
          <div className="ar-cards">
            {raGallery.filter((item) => item.activo !== false).map((item) => (
              <button
                type="button"
                className={`ar-card ${selected?.id === item.id ? 'ar-card--selected' : ''}`}
                key={item.id}
                onClick={() => setSelected(item)}
              >
                {item.imagen_url
                  ? <img src={item.imagen_url} alt="" />
                  : <div className="ar-card-placeholder"><Box size={28} /></div>}
                <strong>{item.producto}</strong>
                <small>{item.categoria || 'Prenda'}{String(item.id).startsWith('ra-demo-') ? ' · Modelo de muestra' : ''}</small>
              </button>
            ))}
            <p className="muted small">Los modelos de muestra son plantillas 3D/RA; no representan inventario ni están vinculados a un producto comercial.</p>
          </div>
        </div>

        <div className="panel ar-preview-panel">
          {selected ? (
            <>
              <div className="row-between">
                <div>
                  <div className="panel-title">
                    <Camera size={20} />
                    <h2>{selected.producto}</h2>
                  </div>
                  <p className="muted small">{selected.descripcion || 'Visualizacion 3D de la prenda.'}</p>
                </div>
                <strong>{selected.precio_base != null ? fmt(selected.precio_base, 'NIO') : '—'}</strong>
              </div>
              <ARModel item={selected} />
              <p className="muted small ar-help">
                En un celular compatible, pulsa <strong>Ver en mi espacio</strong> para abrir la experiencia de RA.
              </p>
            </>
          ) : (
            <div className="empty-state">
              <Camera size={36} />
              <strong>Selecciona una prenda</strong>
              <span>El modelo 3D aparecerá aquí.</span>
            </div>
          )}
        </div>
      </div>

      <VirtualFittingRoom products={products} variants={variants} arItems={items} productId={selected?.producto_id} />

      {isAdmin && (
        <details className="garment-photo-admin">
          <summary>Agregar una prenda nueva desde fotografías</summary>
          <GarmentPhotoStudio products={products} />
        </details>
      )}

      {isAdmin && (
        <div className="panel">
          <div className="row-between">
            <div>
              <div className="panel-title">
                <Box size={20} />
              <h2>Configuración de modelos para RA</h2>
              </div>
              <p className="muted small">Asocia un modelo GLB/GLTF a un producto existente para visualizarlo en 3D o RA. Esta configuración no lo prepara para vestir un avatar.</p>
            </div>
            <button type="button" className="ghost" onClick={startCreate}><Plus size={15} /> Agregar RA</button>
          </div>

          {formOpen && (
            <form className="grid-form" onSubmit={save}>
              <label className="field">
                <span>Producto</span>
                <select
                  required
                  value={form.producto_id}
                  disabled={editingId !== null}
                  onChange={(e) => setForm({ ...form, producto_id: e.target.value })}
                >
                  <option value="">Seleccionar producto</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>{product.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Modelo 3D (.glb)</span>
                <input required value={form.modelo_url} placeholder="/models/mi-prenda.glb o URL https://..." onChange={(e) => setForm({ ...form, modelo_url: e.target.value })} />
              </label>
              <label className="field">
                <span>Imagen previa (opcional)</span>
                <input value={form.imagen_url} placeholder="/images/vestido.jpg" onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} />
              </label>
              <label className="field">
                <span>Modelo iOS USDZ (opcional)</span>
                <input value={form.ios_modelo_url} placeholder="https://.../modelo.usdz" onChange={(e) => setForm({ ...form, ios_modelo_url: e.target.value })} />
              </label>
              <label className="field">
                <span>Escala</span>
                <input value={form.escala} onChange={(e) => setForm({ ...form, escala: e.target.value })} />
              </label>
              <label className="field">
                <span>Superficie</span>
                <select value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}>
                  <option value="floor">Piso / superficie horizontal</option>
                  <option value="wall">Pared / superficie vertical</option>
                </select>
              </label>
              <label className="check-row">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                <span>Disponible para RA</span>
              </label>
              <div className="row">
                <button type="submit"><Save size={15} /> {editingId ? 'Actualizar' : 'Guardar'}</button>
                <button type="button" className="ghost" onClick={cancel}><X size={15} /> Cancelar</button>
              </div>
            </form>
          )}

          <div className="table-wrap">
            <table>
              <thead><tr><th>Producto</th><th>Modelo</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.producto}</td>
                    <td><code>{item.modelo_url}</code></td>
                    <td>
                      <button type="button" className={item.activo ? 'status-active' : 'status-off'} onClick={() => toggle(item)}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="row-actions">
                      <button type="button" className="ghost" onClick={() => startEdit(item)}><Pencil size={14} /> Editar</button>
                      <button type="button" className="ghost danger" onClick={() => remove(item)}><Trash2 size={14} /> Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export function PublicAR() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  const localRaModels = BUILT_IN_RA_MODELS.filter((demo) => !items.some((item) => item.modelo_url === demo.modelo_url));
  const raGallery = [...items, ...localRaModels];

  useEffect(() => {
    fetch(`${apiUrl}/ar/public`)
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar el catalogo de RA.');
        return response.json();
      })
      .then((data) => {
        const usableModels = data.filter((item) => /\.(glb|gltf|usdz)(?:$|[?#])/i.test(item.modelo_url || ''));
        setItems(usableModels);
        setSelected(usableModels.find((item) => /vestido elegante/i.test(item.producto || item.nombre || '')) || usableModels[0] || BUILT_IN_RA_MODELS[0] || null);
      })
      .catch((err) => setError(err.message));
  }, [apiUrl]);

  return (
    <main className="public-ar">
      <header className="public-ar-header">
        <div>
          <span>GLORY'S BOUTIQUE</span>
          <h1>Visualiza tu prenda en realidad aumentada</h1>
          <p>Selecciona una prenda y ábrela en tu espacio desde un teléfono compatible.</p>
        </div>
        <a href="/" className="ghost">Ir al sistema</a>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="public-ar-grid">
        <aside className="panel">
          <h2>Catálogo</h2>
          <div className="public-ar-list">
            {raGallery.map((item) => (
              <button type="button" key={item.id} className={selected?.id === item.id ? 'ar-list-item selected' : 'ar-list-item'} onClick={() => setSelected(item)}>
                <span>{item.producto}</span>
                <small>{item.categoria || 'Prenda'}{String(item.id).startsWith('ra-demo-') ? ' · Modelo de muestra' : ''}</small>
              </button>
            ))}
            {!items.length && !error && <p className="muted small">Modelos de muestra disponibles. No representan inventario ni productos comerciales.</p>}
          </div>
        </aside>

        <section className="panel public-ar-viewer">
          {selected && (
            <>
              <div className="public-ar-info">
                <div>
                  <span className="eyebrow">Prenda seleccionada</span>
                  <h2>{selected.producto}</h2>
                  <p>{selected.descripcion || 'Explora el modelo y colócalo en tu espacio.'}</p>
                </div>
                {selected.precio_base != null && <strong>{fmt(selected.precio_base, 'NIO')}</strong>}
              </div>
              <ARModel item={selected} />
              <p className="muted small">La función de RA depende de la compatibilidad del dispositivo y navegador. En dispositivos compatibles aparecerá el botón para entrar en RA.</p>
            </>
          )}
        </section>
      </div>
      <VirtualFittingRoom
        products={items}
        arItems={items}
        productId={selected?.producto_id}
        variants={items.flatMap((item) => (item.variantes || []).map((variant) => ({ ...variant, producto_id: item.producto_id })))}
      />
    </main>
  );
}
