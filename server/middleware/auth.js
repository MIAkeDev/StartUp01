const { supabaseAdmin } = require('../config/supabase');

// Middleware: verifica JWT de Supabase y adjunta usuario al request
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Obtener datos del perfil del usuario
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      return res.status(401).json({ error: 'Perfil de usuario no encontrado' });
    }

    req.user = perfil;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Error de autenticación' });
  }
};

// Middleware: requiere rol de administrador
const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: se requiere rol administrador' });
    }
    next();
  });
};

// Middleware: autenticación opcional (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      req.user = null;
      return next();
    }

    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = perfil || null;
    req.token = token;
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { requireAuth, requireAdmin, optionalAuth };
