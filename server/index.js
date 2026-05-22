require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const cron    = require('node-cron');
const { supabaseAdmin } = require('./config/supabase');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL || '*' : '*',
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../pages')));

// ── Rutas API ─────────────────────────────────────────────────
app.use('/auth',                  require('./routes/auth'));
app.use('/api/publicaciones',     require('./routes/publicaciones'));
app.use('/api/solicitudes-pago',  require('./routes/solicitudes'));   // ← ruta propia, sin conflicto
app.use('/api/postulaciones',     require('./routes/postulaciones'));
app.use('/api/notificaciones',    require('./routes/notificaciones'));
app.use('/admin',                 require('./routes/admin'));

// ── Fallback SPA ──────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/admin'))
    return res.status(404).json({ error: 'Ruta no encontrada' });
  res.sendFile(path.join(__dirname, '../pages/index.html'));
});

// ── Cron: desactivar publicaciones vencidas (medianoche) ──────
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Desactivando publicaciones vencidas...');
  const { count, error } = await supabaseAdmin
    .from('publicaciones')
    .update({ activo: false })
    .eq('activo', true)
    .lt('fecha_fin', new Date().toISOString())
    .select('id', { count: 'exact', head: true });
  if (!error) console.log(`[CRON] ${count || 0} publicaciones desactivadas`);
});

app.listen(PORT, () => {
  console.log(`\n🚀 Workify en http://localhost:${PORT}`);
  console.log(`📁 Modo: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;