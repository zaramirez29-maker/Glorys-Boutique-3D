/**
 * @file API del modulo de realidad aumentada para visualizacion de prendas.
 * Mantiene la configuracion 3D/RA separada de los datos comerciales del producto.
 */
import { Router } from 'express';
import { Producto, ProductoAR, ProductoVariante, Categoria, Subcategoria } from '../models/index.js';
import { requireAuth, requireRole } from '../auth/middleware.js';
import { asyncHandler, sendCreated } from '../utils/http.js';

export const arRouter = Router();

function formatAR(row) {
  const data = row.get ? row.get({ plain: true }) : row;
  const producto = data.productoInfo || data.producto || {};
  return {
    id: data.id,
    producto_id: data.producto_id,
    producto: producto.nombre || null,
    descripcion: producto.descripcion || null,
    precio_base: producto.precio_base != null ? Number(producto.precio_base) : null,
    precio_usd: producto.precio_usd != null ? Number(producto.precio_usd) : null,
    categoria: producto.categoriaInfo?.nombre || null,
    subcategoria: producto.subcategoriaInfo?.nombre || null,
    modelo_url: data.modelo_url,
    imagen_url: data.imagen_url,
    ios_modelo_url: data.ios_modelo_url,
    activo: !!data.activo,
    escala: data.escala || '1 1 1',
    ubicacion: data.ubicacion || 'floor',
    variantes: (producto.variantes || []).map((variant) => ({
      id: variant.id,
      color: variant.color,
      talla: variant.talla
    }))
  };
}

const PRODUCT_INCLUDE = [
  { model: Categoria, as: 'categoriaInfo', attributes: ['nombre'] },
  { model: Subcategoria, as: 'subcategoriaInfo', attributes: ['nombre'] }
];

arRouter.get('/public', asyncHandler(async (_req, res) => {
  const rows = await ProductoAR.findAll({
    where: { activo: true },
    include: [{
      model: Producto,
      as: 'productoInfo',
      attributes: ['nombre', 'descripcion', 'precio_base', 'precio_usd'],
      include: [...PRODUCT_INCLUDE, {
        model: ProductoVariante,
        as: 'variantes',
        attributes: ['id', 'color', 'talla']
      }]
    }],
    order: [[{ model: Producto, as: 'productoInfo' }, 'nombre', 'ASC']]
  });
  res.json(rows.map(formatAR));
}));

arRouter.use(requireAuth);

arRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await ProductoAR.findAll({
    include: [{
      model: Producto,
      as: 'productoInfo',
      attributes: ['nombre', 'descripcion', 'precio_base', 'precio_usd'],
      include: PRODUCT_INCLUDE
    }],
    order: [['id', 'DESC']]
  });
  res.json(rows.map(formatAR));
}));

arRouter.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const {
    producto_id,
    modelo_url,
    imagen_url,
    ios_modelo_url,
    activo = true,
    escala = '1 1 1',
    ubicacion = 'floor'
  } = req.body;

  if (!producto_id || !modelo_url) {
    res.status(400).json({ message: 'El producto y la URL del modelo 3D son obligatorios.' });
    return;
  }

  const producto = await Producto.findByPk(producto_id);
  if (!producto) {
    res.status(404).json({ message: 'Producto no encontrado.' });
    return;
  }

  const exists = await ProductoAR.findOne({ where: { producto_id } });
  if (exists) {
    res.status(409).json({ message: 'Este producto ya tiene una configuracion de RA.' });
    return;
  }

  const row = await ProductoAR.create({
    producto_id,
    modelo_url: String(modelo_url).trim(),
    imagen_url: imagen_url || null,
    ios_modelo_url: ios_modelo_url || null,
    activo: !!activo,
    escala: escala || '1 1 1',
    ubicacion: ubicacion === 'wall' ? 'wall' : 'floor'
  });

  const created = await ProductoAR.findByPk(row.id, {
    include: [{ model: Producto, as: 'productoInfo', attributes: ['nombre', 'descripcion', 'precio_base', 'precio_usd'], include: PRODUCT_INCLUDE }]
  });
  sendCreated(res, formatAR(created));
}));

arRouter.put('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const row = await ProductoAR.findByPk(req.params.id);
  if (!row) {
    res.status(404).json({ message: 'Configuracion de RA no encontrada.' });
    return;
  }

  const fields = ['modelo_url', 'imagen_url', 'ios_modelo_url', 'escala', 'ubicacion'];
  const patch = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) patch[field] = req.body[field];
  }
  if (req.body.activo !== undefined) patch.activo = !!req.body.activo;
  if (patch.modelo_url !== undefined && !String(patch.modelo_url).trim()) {
    res.status(400).json({ message: 'La URL del modelo 3D no puede quedar vacia.' });
    return;
  }
  if (patch.ubicacion !== undefined) patch.ubicacion = patch.ubicacion === 'wall' ? 'wall' : 'floor';

  await row.update(patch);
  const updated = await ProductoAR.findByPk(row.id, {
    include: [{ model: Producto, as: 'productoInfo', attributes: ['nombre', 'descripcion', 'precio_base', 'precio_usd'], include: PRODUCT_INCLUDE }]
  });
  res.json(formatAR(updated));
}));

arRouter.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const deleted = await ProductoAR.destroy({ where: { id: req.params.id } });
  if (!deleted) {
    res.status(404).json({ message: 'Configuracion de RA no encontrada.' });
    return;
  }
  res.status(204).end();
}));
