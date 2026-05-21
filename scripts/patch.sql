-- ═══════════════════════════════════════════════════════════
-- WORKIFY — Parche SQL (ejecutar si ya corriste schema.sql)
-- Si es base de datos nueva, esto ya está incluido en schema.sql
-- ═══════════════════════════════════════════════════════════

-- 1. Agregar columna solicitud_id a publicaciones (si no existe)
ALTER TABLE public.publicaciones
  ADD COLUMN IF NOT EXISTS solicitud_id INTEGER
  REFERENCES public.solicitudes_pago(id) ON DELETE SET NULL;

-- 2. Índice para búsqueda por solicitud
CREATE INDEX IF NOT EXISTS idx_publicaciones_solicitud
  ON public.publicaciones(solicitud_id);

-- 3. Política RLS para que el service_role pueda hacer UPDATE en solicitudes
-- (necesario para que el admin marque pago_verificado)
CREATE POLICY IF NOT EXISTS "Solicitudes: admin update"
  ON public.solicitudes_pago
  FOR UPDATE
  USING (true);

-- 4. Política para que el backend pueda insertar notificaciones
CREATE POLICY IF NOT EXISTS "Notificaciones: service insert"
  ON public.notificaciones
  FOR INSERT
  WITH CHECK (true);