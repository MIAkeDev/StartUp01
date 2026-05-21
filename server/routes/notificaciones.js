const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/notificaciones
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', req.user.id)
    .order('fecha', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  const noLeidas = data.filter(n => !n.leido).length;
  return res.json({ notificaciones: data, no_leidas: noLeidas });
});

// PATCH /api/notificaciones/:id/leer
router.patch('/:id/leer', requireAuth, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('notificaciones')
    .update({ leido: true })
    .eq('id', id)
    .eq('usuario_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Notificación marcada como leída' });
});

// PATCH /api/notificaciones/leer-todas
router.patch('/leer-todas', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('notificaciones')
    .update({ leido: true })
    .eq('usuario_id', req.user.id)
    .eq('leido', false);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Todas las notificaciones marcadas como leídas' });
});

module.exports = router;
