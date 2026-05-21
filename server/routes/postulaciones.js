const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, optionalAuth } = require('../middleware/auth');

async function crearNotificacion(usuarioId, mensaje, tipo, referenciaId = null) {
  await supabaseAdmin.from('notificaciones').insert({
    usuario_id: usuarioId, mensaje, tipo, referencia_id: referenciaId
  });
}

// GET /api/publicaciones — listado con filtros
router.get('/', optionalAuth, async (req, res) => {
  const { tipo, categoria, destacado, q, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = supabaseAdmin
      .from('publicaciones')
      .select('*, usuarios(id, nombre, whatsapp)', { count: 'exact' })
      .eq('activo', true)
      .gte('fecha_fin', new Date().toISOString())
      .order('destacado', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (tipo)      query = query.eq('tipo', tipo);
    if (destacado === 'true') query = query.eq('destacado', true);
    if (q)         query = query.ilike('titulo', `%${q}%`);
    if (categoria) query = query.contains('detalles', { categoria });

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({
      publicaciones: data,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch {
    return res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

// GET /api/publicaciones/mis-publicaciones  <- ANTES de /:id
router.get('/mis-publicaciones', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('publicaciones')
    .select('*, solicitudes_pago(plan, estado)')
    .eq('usuario_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/publicaciones/calificaciones  <- ANTES de /:id
router.post('/calificaciones', requireAuth, async (req, res) => {
  const { servicio_id, estrellas, comentario } = req.body;

  if (!servicio_id || !estrellas || estrellas < 1 || estrellas > 5)
    return res.status(400).json({ error: 'Servicio y calificación (1-5) son requeridos' });

  const { data: servicio } = await supabaseAdmin
    .from('publicaciones')
    .select('tipo, usuario_id')
    .eq('id', servicio_id)
    .single();

  if (!servicio || servicio.tipo !== 'servicio')
    return res.status(404).json({ error: 'Servicio no encontrado' });

  if (servicio.usuario_id === req.user.id)
    return res.status(400).json({ error: 'No puedes calificar tu propio servicio' });

  const { data: calExistente } = await supabaseAdmin
    .from('calificaciones')
    .select('id')
    .eq('servicio_id', servicio_id)
    .eq('usuario_id', req.user.id)
    .maybeSingle();

  if (calExistente)
    return res.status(400).json({ error: 'Ya calificaste este servicio' });

  const { data, error } = await supabaseAdmin
    .from('calificaciones')
    .insert({ servicio_id, usuario_id: req.user.id, estrellas: parseInt(estrellas), comentario: comentario || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Error al guardar calificación' });
  return res.status(201).json({ message: 'Calificación registrada', calificacion: data });
});

// GET /api/publicaciones/:id  <- siempre al final
router.get('/:id', optionalAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(404).json({ error: 'ID inválido' });

  const { data, error } = await supabaseAdmin
    .from('publicaciones')
    .select(`
      *,
      usuarios(id, nombre, whatsapp, email),
      calificaciones(estrellas, comentario, fecha, usuarios(nombre))
    `)
    .eq('id', id)
    .single();

  if (error || !data)
    return res.status(404).json({ error: 'Publicación no encontrada' });

  if (data.calificaciones?.length) {
    const suma = data.calificaciones.reduce((a, c) => a + c.estrellas, 0);
    data.promedio_estrellas   = (suma / data.calificaciones.length).toFixed(1);
    data.total_calificaciones = data.calificaciones.length;
  } else {
    data.promedio_estrellas   = 0;
    data.total_calificaciones = 0;
  }

  return res.json(data);
});

// POST /api/publicaciones/:solicitudId/completar
router.post('/:solicitudId/completar', requireAuth, async (req, res) => {
  const solicitudId = parseInt(req.params.solicitudId);
  if (isNaN(solicitudId)) return res.status(400).json({ error: 'ID inválido' });

  const { data: solicitud, error: solError } = await supabaseAdmin
    .from('solicitudes_pago')
    .select('*')
    .eq('id', solicitudId)
    .eq('usuario_id', req.user.id)
    .eq('estado', 'pago_verificado')
    .single();

  if (solError || !solicitud)
    return res.status(403).json({ error: 'Solicitud no encontrada o pago no verificado' });

  const { data: pubExistente } = await supabaseAdmin
    .from('publicaciones')
    .select('id')
    .eq('solicitud_id', solicitudId)
    .maybeSingle();

  if (pubExistente)
    return res.status(400).json({ error: 'Ya existe una publicación para esta solicitud' });

  const detalles = req.body;

  if (solicitud.tipo === 'oferta') {
    const { titulo, categoria, descripcion, tipo_contrato, modalidad, ubicacion } = detalles;
    if (!titulo || !categoria || !descripcion || !tipo_contrato || !modalidad || !ubicacion)
      return res.status(400).json({ error: 'Faltan campos requeridos para la oferta' });
  } else {
    const { titulo, ubicacion, descripcion, numero_wsp } = detalles;
    if (!titulo || !ubicacion || !descripcion || !numero_wsp)
      return res.status(400).json({ error: 'Faltan campos requeridos para el servicio' });
    if (!/^9\d{8}$/.test(detalles.numero_wsp))
      return res.status(400).json({ error: 'Número de WhatsApp inválido' });
  }

  const diasPlan = solicitud.plan === 'destacado' ? 20 : 10;
  const fechaFin = new Date();
  fechaFin.setDate(fechaFin.getDate() + diasPlan);

  try {
    const { data: publicacion, error: pubError } = await supabaseAdmin
      .from('publicaciones')
      .insert({
        usuario_id:   req.user.id,
        solicitud_id: solicitudId,
        tipo:         solicitud.tipo,
        titulo:       detalles.titulo,
        descripcion:  detalles.descripcion,
        ubicacion:    detalles.ubicacion,
        destacado:    solicitud.plan === 'destacado',
        fecha_fin:    fechaFin.toISOString(),
        activo:       true,
        detalles:     { ...detalles, plan: solicitud.plan }
      })
      .select()
      .single();

    if (pubError) return res.status(500).json({ error: 'Error al crear la publicación' });

    await supabaseAdmin
      .from('solicitudes_pago')
      .update({ estado: 'completado' })
      .eq('id', solicitudId);

    return res.status(201).json({ message: 'Publicación creada exitosamente', publicacion });
  } catch {
    return res.status(500).json({ error: 'Error al procesar la publicación' });
  }
});

module.exports = router;