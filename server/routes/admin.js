const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');

async function crearNotificacion(usuarioId, mensaje, tipo, referenciaId = null) {
  await supabaseAdmin.from('notificaciones').insert({
    usuario_id: usuarioId,
    mensaje,
    tipo,
    referencia_id: referenciaId
  });
}

// GET /admin/solicitudes
router.get('/solicitudes', requireAdmin, async (req, res) => {
  const { estado } = req.query;

  let query = supabaseAdmin
    .from('solicitudes_pago')
    .select('*, usuarios(nombre, email)')
    .order('fecha_solicitud', { ascending: false });

  if (estado) query = query.eq('estado', estado);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// PATCH /admin/solicitudes/:id - verificar o denegar pago
router.patch('/solicitudes/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!['pago_verificado', 'denegado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const { data: solicitud } = await supabaseAdmin
    .from('solicitudes_pago')
    .select('*, usuarios(nombre, email)')
    .eq('id', id)
    .single();

  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const { data, error } = await supabaseAdmin
    .from('solicitudes_pago')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Notificar al usuario
  if (estado === 'pago_verificado') {
    await crearNotificacion(
      solicitud.usuario_id,
      `¡Tu pago fue verificado! Ya puedes completar los datos de tu publicación (solicitud #${id}).`,
      'publicacion',
      parseInt(id)
    );
  } else {
    await crearNotificacion(
      solicitud.usuario_id,
      `Tu pago para la solicitud #${id} fue denegado. Contáctanos por WhatsApp para más información.`,
      'publicacion',
      parseInt(id)
    );
  }

  return res.json({ message: 'Estado actualizado', solicitud: data });
});

// GET /admin/publicaciones
router.get('/publicaciones', requireAdmin, async (req, res) => {
  const { tipo, activo } = req.query;

  let query = supabaseAdmin
    .from('publicaciones')
    .select('*, usuarios(nombre, email)')
    .order('created_at', { ascending: false });

  if (tipo) query = query.eq('tipo', tipo);
  if (activo !== undefined) query = query.eq('activo', activo === 'true');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// PATCH /admin/publicaciones/:id/desactivar
router.patch('/publicaciones/:id/desactivar', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('publicaciones')
    .update({ activo: false })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Publicación desactivada', publicacion: data });
});

// PATCH /admin/publicaciones/:id/activar
router.patch('/publicaciones/:id/activar', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('publicaciones')
    .update({ activo: true })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Publicación activada', publicacion: data });
});

// PATCH /admin/publicaciones/:id/editar
router.patch('/publicaciones/:id/editar', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, ubicacion, detalles } = req.body;

  const updates = {};
  if (titulo) updates.titulo = titulo;
  if (descripcion) updates.descripcion = descripcion;
  if (ubicacion) updates.ubicacion = ubicacion;
  if (detalles) updates.detalles = detalles;

  const { data, error } = await supabaseAdmin
    .from('publicaciones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Publicación actualizada', publicacion: data });
});

// GET /admin/postulaciones
router.get('/postulaciones', requireAdmin, async (req, res) => {
  const { oferta_id, estado } = req.query;

  let query = supabaseAdmin
    .from('postulaciones')
    .select(`
      *,
      usuarios(nombre, email, whatsapp),
      publicaciones(titulo, usuario_id)
    `)
    .order('fecha_postulacion', { ascending: false });

  if (oferta_id) query = query.eq('oferta_id', oferta_id);
  if (estado) query = query.eq('estado', estado);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /admin/usuarios
router.get('/usuarios', requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, email, nombre, whatsapp, rol, cv_url, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// PATCH /admin/usuarios/:id/bloquear
router.patch('/usuarios/:id/bloquear', requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Deshabilitar en auth
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: '876600h' // 100 años
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Usuario bloqueado' });
});

// PATCH /admin/usuarios/:id/desbloquear
router.patch('/usuarios/:id/desbloquear', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: 'none'
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Usuario desbloqueado' });
});

// GET /admin/stats - estadísticas generales
router.get('/stats', requireAdmin, async (req, res) => {
  const [usuarios, publicaciones, postulaciones, solicitudes] = await Promise.all([
    supabaseAdmin.from('usuarios').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('publicaciones').select('id', { count: 'exact', head: true }).eq('activo', true),
    supabaseAdmin.from('postulaciones').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('solicitudes_pago').select('id', { count: 'exact', head: true }).eq('estado', 'esperando_confirmacion')
  ]);

  return res.json({
    total_usuarios: usuarios.count || 0,
    publicaciones_activas: publicaciones.count || 0,
    total_postulaciones: postulaciones.count || 0,
    solicitudes_pendientes: solicitudes.count || 0
  });
});

// GET /admin/config
router.get('/config', requireAdmin, async (req, res) => {
  return res.json({
    whatsapp_admin: process.env.WHATSAPP_ADMIN_NUMBER,
    precio_basico: 5,
    dias_basico: 10,
    precio_destacado: 10,
    dias_destacado: 20
  });
});

module.exports = router;
