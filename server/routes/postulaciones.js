const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

async function crearNotificacion(usuarioId, mensaje, tipo, referenciaId = null) {
  await supabaseAdmin.from('notificaciones').insert({
    usuario_id: usuarioId,
    mensaje,
    tipo,
    referencia_id: referenciaId
  });
}

// POST /api/postulaciones - postular a oferta
router.post('/', requireAuth, async (req, res) => {
  const { oferta_id } = req.body;

  if (!oferta_id) {
    return res.status(400).json({ error: 'ID de oferta requerido' });
  }

  // Verificar que la oferta existe y es activa
  const { data: oferta } = await supabaseAdmin
    .from('publicaciones')
    .select('id, tipo, titulo, usuario_id, activo, fecha_fin')
    .eq('id', oferta_id)
    .single();

  if (!oferta || oferta.tipo !== 'oferta') {
    return res.status(404).json({ error: 'Oferta no encontrada' });
  }

  if (!oferta.activo || new Date(oferta.fecha_fin) < new Date()) {
    return res.status(400).json({ error: 'Esta oferta ya no está disponible' });
  }

  if (oferta.usuario_id === req.user.id) {
    return res.status(400).json({ error: 'No puedes postularte a tu propia oferta' });
  }

  // Verificar que el usuario tiene CV
  if (!req.user.cv_url) {
    return res.status(400).json({
      error: 'Debes subir tu CV antes de postularte',
      redirect: '/pages/perfil.html'
    });
  }

  // Verificar postulación duplicada
  const { data: yaPostulado } = await supabaseAdmin
    .from('postulaciones')
    .select('id')
    .eq('oferta_id', oferta_id)
    .eq('postulante_id', req.user.id)
    .single();

  if (yaPostulado) {
    return res.status(400).json({ error: 'Ya te has postulado a esta oferta' });
  }

  const { data, error } = await supabaseAdmin
    .from('postulaciones')
    .insert({
      oferta_id,
      postulante_id: req.user.id,
      cv_url: req.user.cv_url,
      estado: 'recibido'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Error al registrar postulación' });

  // Notificar al postulante
  await crearNotificacion(
    req.user.id,
    `Tu postulación a "${oferta.titulo}" fue recibida exitosamente.`,
    'postulacion',
    data.id
  );

  // Notificar al empleador
  await crearNotificacion(
    oferta.usuario_id,
    `${req.user.nombre} se postuló a tu oferta "${oferta.titulo}".`,
    'postulacion',
    data.id
  );

  return res.status(201).json({ message: 'Postulación enviada exitosamente', postulacion: data });
});

// GET /api/mis-postulaciones
router.get('/mis-postulaciones', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('postulaciones')
    .select(`
      *,
      publicaciones(id, titulo, ubicacion, detalles, usuario_id, usuarios(nombre))
    `)
    .eq('postulante_id', req.user.id)
    .order('fecha_postulacion', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/postulaciones/oferta/:ofertaId - empleador ve postulaciones de su oferta
router.get('/oferta/:ofertaId', requireAuth, async (req, res) => {
  const { ofertaId } = req.params;

  // Verificar propiedad
  const { data: oferta } = await supabaseAdmin
    .from('publicaciones')
    .select('usuario_id')
    .eq('id', ofertaId)
    .single();

  if (!oferta || (oferta.usuario_id !== req.user.id && req.user.rol !== 'admin')) {
    return res.status(403).json({ error: 'No tienes acceso a estas postulaciones' });
  }

  const { data, error } = await supabaseAdmin
    .from('postulaciones')
    .select('*, usuarios(nombre, email, whatsapp, cv_url)')
    .eq('oferta_id', ofertaId)
    .order('fecha_postulacion', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// PATCH /api/postulaciones/:id/estado - cambiar estado
router.patch('/:id/estado', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = ['recibido', 'en_revision', 'contratado', 'rechazado'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  // Obtener postulación con datos de oferta
  const { data: postulacion } = await supabaseAdmin
    .from('postulaciones')
    .select('*, publicaciones(titulo, usuario_id)')
    .eq('id', id)
    .single();

  if (!postulacion) {
    return res.status(404).json({ error: 'Postulación no encontrada' });
  }

  // Solo el empleador o admin puede cambiar el estado
  if (
    postulacion.publicaciones.usuario_id !== req.user.id &&
    req.user.rol !== 'admin'
  ) {
    return res.status(403).json({ error: 'No tienes permiso para esta acción' });
  }

  const { data, error } = await supabaseAdmin
    .from('postulaciones')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Error al actualizar estado' });

  // Mensajes por estado
  const mensajes = {
    en_revision: `Tu postulación a "${postulacion.publicaciones.titulo}" está siendo revisada.`,
    contratado: `¡Felicitaciones! Has sido seleccionado para "${postulacion.publicaciones.titulo}".`,
    rechazado: `Tu postulación a "${postulacion.publicaciones.titulo}" no fue seleccionada. ¡Sigue intentando!`
  };

  if (mensajes[estado]) {
    await crearNotificacion(postulacion.postulante_id, mensajes[estado], 'estado', id);
  }

  return res.json({ message: 'Estado actualizado', postulacion: data });
});

module.exports = router;
