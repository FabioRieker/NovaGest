-- =============================================================================
-- NOVAGEST ERP - MIGRACIÓN DE SEGURIDAD Y CONTROL DE ACCESO (P0.2)
-- Módulo Profesional: Desarrollo de Interfaces (Código: 0488) - DAM2
-- =============================================================================

-- 1. Tabla de Perfiles ligada a auth.users (Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Helper de Rol con SECURITY DEFINER (previene recursión infinita en políticas RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  );
$$;

-- 3. Habilitar RLS estricto en todas las entidades
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;

-- 4. Limpieza de políticas previas permisivas (USING true)
DROP POLICY IF EXISTS "Lectura pública de catálogo" ON public.products;
DROP POLICY IF EXISTS "Modificación de productos"   ON public.products;
DROP POLICY IF EXISTS "products_read"               ON public.products;
DROP POLICY IF EXISTS "products_write"              ON public.products;

DROP POLICY IF EXISTS "Lectura pública de auditoría en vivo" ON public.audit_logs;
DROP POLICY IF EXISTS "Inserción de eventos de auditoría"    ON public.audit_logs;
DROP POLICY IF EXISTS "audit_read"                           ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert"                         ON public.audit_logs;

DROP POLICY IF EXISTS "Lectura de usuarios"       ON public.users;
DROP POLICY IF EXISTS "Inserción de usuarios"     ON public.users;
DROP POLICY IF EXISTS "Modificación de usuarios"  ON public.users;

DROP POLICY IF EXISTS "profiles_self"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin" ON public.profiles;

-- 5. Revocación de permisos anónimos en la tabla histórica de usuarios
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    REVOKE ALL ON public.users FROM anon;
    CREATE POLICY users_authenticated_only ON public.users FOR ALL TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- 6. Políticas RLS estrictas por rol

-- PRODUCTOS: Lectura para usuarios autenticados; Escritura solo Admin
CREATE POLICY products_read ON public.products
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY products_write ON public.products
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- PERFILES: Cada usuario lee su perfil o Admin lee todos; Actualización solo Admin
CREATE POLICY profiles_self ON public.profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_admin ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY profiles_insert ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- AUDITORÍA: Lectura para autenticados; Inserción solo con UID autenticado
CREATE POLICY audit_read ON public.audit_logs
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY audit_insert ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Colección Documental JSONB (Equivalente NoSQL para RA5-b)
CREATE TABLE IF NOT EXISTS public.documents (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection TEXT NOT NULL,
    doc        JSONB NOT NULL,
    owner_id   UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_doc_gin ON public.documents USING gin (doc jsonb_path_ops);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_rw ON public.documents;
CREATE POLICY documents_rw ON public.documents
    FOR ALL TO authenticated
    USING (owner_id = auth.uid() OR public.is_admin())
    WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- 8. Publicaciones Realtime seguras
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
