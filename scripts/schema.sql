-- ═══════════════════════════════════════════════════════════
-- WORKIFY — Schema de base de datos para Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ═══════════════════════════════════════════════════════════

-- ── 1. Tabla de usuarios (extiende auth.users de Supabase) ───
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  whatsapp    TEXT NOT NULL,
  cv_url      TEXT,
  rol         TEXT NOT NULL DEFAULT 'user' CHECK (rol IN ('user', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Solicitudes de pago ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.solicitudes_pago (
  id               SERIAL PRIMARY KEY,
  usuario_id       UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('oferta', 'servicio')),
  plan             TEXT NOT NULL CHECK (plan IN ('basico', 'destacado')),
  estado           TEXT NOT NULL DEFAULT 'esperando_confirmacion'
                   CHECK (estado IN ('esperando_confirmacion', 'pago_verificado', 'denegado', 'completado')),
  fecha_solicitud  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Publicaciones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publicaciones (
  id           SERIAL PRIMARY KEY,
  usuario_id   UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  solicitud_id INTEGER REFERENCES public.solicitudes_pago(id) ON DELETE SET NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('oferta', 'servicio')),
  titulo       TEXT NOT NULL,
  descripcion  TEXT,
  ubicacion    TEXT,
  destacado    BOOLEAN DEFAULT FALSE,
  fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  fecha_fin    TIMESTAMPTZ NOT NULL,
  activo       BOOLEAN DEFAULT TRUE,
  detalles     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_publicaciones_tipo       ON public.publicaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_publicaciones_activo     ON public.publicaciones(activo);
CREATE INDEX IF NOT EXISTS idx_publicaciones_usuario    ON public.publicaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_publicaciones_destacado  ON public.publicaciones(destacado);
CREATE INDEX IF NOT EXISTS idx_publicaciones_fecha_fin  ON public.publicaciones(fecha_fin);

-- ── 4. Postulaciones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.postulaciones (
  id                SERIAL PRIMARY KEY,
  oferta_id         INTEGER NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  postulante_id     UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  cv_url            TEXT,
  estado            TEXT NOT NULL DEFAULT 'recibido'
                    CHECK (estado IN ('recibido', 'en_revision', 'contratado', 'rechazado')),
  fecha_postulacion TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (oferta_id, postulante_id)  -- evita postulaciones duplicadas
);

CREATE INDEX IF NOT EXISTS idx_postulaciones_oferta     ON public.postulaciones(oferta_id);
CREATE INDEX IF NOT EXISTS idx_postulaciones_postulante ON public.postulaciones(postulante_id);

-- ── 5. Calificaciones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calificaciones (
  id          SERIAL PRIMARY KEY,
  servicio_id INTEGER NOT NULL REFERENCES public.publicaciones(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estrellas   INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario  TEXT,
  fecha       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (servicio_id, usuario_id)  -- una calificación por usuario por servicio
);

-- ── 6. Notificaciones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id            SERIAL PRIMARY KEY,
  usuario_id    UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  mensaje       TEXT NOT NULL,
  leido         BOOLEAN DEFAULT FALSE,
  fecha         TIMESTAMPTZ DEFAULT NOW(),
  tipo          TEXT CHECK (tipo IN ('postulacion', 'estado', 'publicacion')),
  referencia_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON public.notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leido   ON public.notificaciones(leido);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — Políticas de acceso
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postulaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones  ENABLE ROW LEVEL SECURITY;

-- Usuarios: cualquiera puede leer perfiles básicos; solo el propio usuario puede editar el suyo
CREATE POLICY "Usuarios: lectura pública" ON public.usuarios
  FOR SELECT USING (true);

CREATE POLICY "Usuarios: edición propia" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuarios: inserción propia" ON public.usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Publicaciones: lectura pública de las activas; escritura solo autenticados
CREATE POLICY "Publicaciones: lectura pública" ON public.publicaciones
  FOR SELECT USING (true);

CREATE POLICY "Publicaciones: crear autenticado" ON public.publicaciones
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Solicitudes de pago: solo el dueño las ve
CREATE POLICY "Solicitudes: lectura propia" ON public.solicitudes_pago
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Solicitudes: crear autenticado" ON public.solicitudes_pago
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Postulaciones: postulante ve las suyas; empleador ve las de su oferta
CREATE POLICY "Postulaciones: acceso propio" ON public.postulaciones
  FOR SELECT USING (
    auth.uid() = postulante_id OR
    auth.uid() = (SELECT usuario_id FROM public.publicaciones WHERE id = oferta_id)
  );

CREATE POLICY "Postulaciones: crear autenticado" ON public.postulaciones
  FOR INSERT WITH CHECK (auth.uid() = postulante_id);

-- Calificaciones: lectura pública
CREATE POLICY "Calificaciones: lectura pública" ON public.calificaciones
  FOR SELECT USING (true);

CREATE POLICY "Calificaciones: crear autenticado" ON public.calificaciones
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Notificaciones: solo el destinatario
CREATE POLICY "Notificaciones: solo destinatario" ON public.notificaciones
  FOR ALL USING (auth.uid() = usuario_id);

-- ═══════════════════════════════════════════════════════════
-- STORAGE BUCKET para CVs
-- ═══════════════════════════════════════════════════════════
-- Ejecutar esto en el SQL Editor:
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage: cualquiera puede leer; solo auth puede subir
CREATE POLICY "Storage: lectura pública" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos');

CREATE POLICY "Storage: subida autenticada" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Storage: eliminación propia" ON storage.objects
  FOR DELETE USING (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════════════════════════════
-- SEED — Datos iniciales (admin + ejemplos)
-- ═══════════════════════════════════════════════════════════

-- NOTA: El usuario admin se crea vía el script seed.js (Node.js)
-- porque requiere llamar a supabaseAdmin.auth.admin.createUser()
-- No se puede crear directamente desde SQL sin la contraseña hasheada.

-- Ejemplo de cómo verificar el admin una vez creado:
-- SELECT id, email, rol FROM public.usuarios WHERE rol = 'admin';
