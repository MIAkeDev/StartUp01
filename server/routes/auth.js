const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  }
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, nombre, whatsapp } = req.body;

  if (!email || !password || !nombre || !whatsapp) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  // Validar formato WhatsApp (9 dígitos peruanos)
  const wsRegex = /^9\d{8}$/;
  if (!wsRegex.test(whatsapp)) {
    return res.status(400).json({ error: 'Número de WhatsApp inválido (debe empezar con 9 y tener 9 dígitos)' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // Registrar en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // confirmación automática
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(400).json({ error: 'Este correo ya está registrado' });
      }
      return res.status(400).json({ error: authError.message });
    }

    // Crear perfil en tabla usuarios
    const { error: perfilError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        email,
        nombre,
        whatsapp,
        rol: 'user'
      });

    if (perfilError) {
      // Revertir: eliminar usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Error al crear el perfil' });
    }

    // Auto-login después del registro
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      return res.status(201).json({ message: 'Cuenta creada. Por favor inicia sesión.' });
    }

    return res.status(201).json({
      message: 'Cuenta creada exitosamente',
      token: loginData.session.access_token,
      user: {
        id: authData.user.id,
        email,
        nombre,
        whatsapp,
        rol: 'user'
      }
    });
  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Obtener perfil
    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.json({
      token: data.session.access_token,
      user: perfil
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

// PUT /auth/perfil - actualizar datos básicos
router.put('/perfil', requireAuth, async (req, res) => {
  const { nombre, whatsapp } = req.body;

  const updates = {};
  if (nombre) updates.nombre = nombre;
  if (whatsapp) {
    const wsRegex = /^9\d{8}$/;
    if (!wsRegex.test(whatsapp)) {
      return res.status(400).json({ error: 'Número de WhatsApp inválido' });
    }
    updates.whatsapp = whatsapp;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No hay datos para actualizar' });
  }

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Error al actualizar perfil' });
  return res.json({ user: data });
});

// POST /auth/cv - subir CV
router.post('/cv', requireAuth, upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Se requiere un archivo PDF' });
  }

  try {
    const fileName = `cv_${req.user.id}_${Date.now()}.pdf`;
    const filePath = `cvs/${fileName}`;

    // Subir a Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documentos')
      .upload(filePath, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      return res.status(500).json({ error: 'Error al subir el archivo' });
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('documentos')
      .getPublicUrl(filePath);

    // Actualizar URL en el perfil
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({ cv_url: urlData.publicUrl })
      .eq('id', req.user.id);

    if (updateError) {
      return res.status(500).json({ error: 'Error al actualizar el CV en el perfil' });
    }

    return res.json({
      message: 'CV subido exitosamente',
      cv_url: urlData.publicUrl
    });
  } catch (err) {
    console.error('Error subiendo CV:', err);
    return res.status(500).json({ error: 'Error al procesar el archivo' });
  }
});

module.exports = router;
