const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/solicitudes-pago
router.post('/', requireAuth, async (req, res) => {
  const { tipo, plan } = req.body;

  if (!tipo || !plan)
    return res.status(400).json({ error: 'Tipo y plan son requeridos' });
  if (!['oferta', 'servicio'].includes(tipo))
    return res.status(400).json({ error: 'Tipo inválido' });
  if (!['basico', 'destacado'].includes(plan))
    return res.status(400).json({ error: 'Plan inválido' });

  try {
    const { data, error } = await supabaseAdmin
      .from('solicitudes_pago')
      .insert({ usuario_id: req.user.id, tipo, plan, estado: 'esperando_confirmacion' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Error al crear solicitud' });

    const adminNum = process.env.WHATSAPP_ADMIN_NUMBER || '51999999999';
    const msg = `Hola, deseo pagar el plan ${plan === 'basico' ? 'Básico (S/5)' : 'Destacado (S/10)'} para mi publicación tipo ${tipo === 'oferta' ? 'Oferta Laboral' : 'Servicio Independiente'}. Mi ID de solicitud es #${data.id}. Quedo atento.`;

    return res.status(201).json({
      message: 'Solicitud creada',
      solicitud: data,
      whatsapp_mensaje: encodeURIComponent(msg),
      whatsapp_numero: adminNum
    });
  } catch {
    return res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/solicitudes-pago/mis-solicitudes
router.get('/mis-solicitudes', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('solicitudes_pago')
    .select('*')
    .eq('usuario_id', req.user.id)
    .order('fecha_solicitud', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

module.exports = router;