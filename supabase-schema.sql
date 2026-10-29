-- =============================================================================
-- NOVAGEST ERP - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL & REALTIME)
-- Módulo Profesional: Desarrollo de Interfaces (Código: 0488) - DAM2
-- Proyecto Individual: Sistema de Gestión Empresarial Multiplataforma
-- =============================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Catálogo e Inventario de Productos (Persistencia Relacional SQL)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status TEXT NOT NULL CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    supplier_email TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Migración segura si la tabla ya existía previamente
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Índices optimizados para búsquedas y agregaciones del Dashboard
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- 3. Tabla de Logs y Trazabilidad en Tiempo Real (Supabase Realtime)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'ALERT', 'SYSTEM')),
    entity TEXT NOT NULL CHECK (entity IN ('AUTH', 'PRODUCT', 'USER', 'REPORT', 'SYSTEM')),
    entity_id TEXT,
    details TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);

-- 4. Tabla de Perfiles ligada a auth.users (Supabase Auth & RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Helper seguro de validación de rol Administrador (SECURITY DEFINER)
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

-- 5. Tabla Documental JSONB (Segunda fuente de datos / Almacén NoSQL para RA5-b)
CREATE TABLE IF NOT EXISTS public.documents (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection TEXT NOT NULL,
    doc        JSONB NOT NULL,
    owner_id   UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_doc_gin ON public.documents USING gin (doc jsonb_path_ops);

-- 6. Habilitación de Supabase Realtime para transmisión WebSocket continua
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;

-- 7. Configuración de Seguridad por Filas Estricta (Row Level Security - RLS)
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents  ENABLE ROW LEVEL SECURITY;

-- Políticas de control de acceso por rol:
-- PRODUCTOS: Lectura autenticada, escritura reservada a administradores
CREATE POLICY products_read ON public.products
    FOR SELECT TO authenticated USING (true);

CREATE POLICY products_write ON public.products
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- PERFILES: Cada usuario consulta su perfil; el administrador consulta y gestiona todos
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

-- AUDITORÍA: Trazabilidad inmutable; inserción ligada a identidad verificada
CREATE POLICY audit_read ON public.audit_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY audit_insert ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- DOCUMENTOS: Acceso al propietario o administrador
CREATE POLICY documents_rw ON public.documents
    FOR ALL TO authenticated
    USING (owner_id = auth.uid() OR public.is_admin())
    WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- 7. Datos Iniciales de Prueba (Seed Data)
INSERT INTO public.products (id, sku, name, category, price, stock, status, supplier_email, description)
VALUES
    ('prod-001', 'TECH-SRV-01', 'Servidor Rack Dell PowerEdge R750', 'Hardware', 3499.99, 8, 'in_stock', 'dell.enterprise@proveedor.es', 'Servidor 2U para virtualización de alta densidad.'),
    ('prod-002', 'TECH-NB-02', 'Portátil Lenovo ThinkPad P1 Gen 6', 'Hardware', 2150.00, 14, 'in_stock', 'ventas@lenovobusiness.com', 'Estación de trabajo portátil con GPU NVIDIA RTX.'),
    ('prod-003', 'TECH-SW-03', 'Licencia Anual Cloud ERP Enterprise', 'Servicios', 5400.00, 45, 'in_stock', 'cloud.sales@novagest-saas.com', 'Suscripción corporativa para gestión de inventarios.'),
    ('prod-004', 'MOB-CHR-04', 'Silla Ergonómica Herman Miller Aeron', 'Mobiliario', 1280.50, 4, 'low_stock', 'ergonomia@hermanmiller-dist.com', 'Silla con soporte lumbar cinemático.'),
    ('prod-005', 'PAP-ARC-05', 'Lote Archivadores Ignífugos DIN-A4', 'Papelería', 145.00, 32, 'in_stock', 'pedidos@suministrospapel.es', 'Set de 10 archivadores reforzados.'),
    ('prod-006', 'TECH-MON-06', 'Monitor Profesional Dell UltraSharp 32" 4K', 'Electrónica', 890.00, 0, 'out_of_stock', 'monitores@hardwarepro.es', 'Panel IPS Black con 98% DCI-P3.'),
    ('prod-007', 'MOB-DSK-07', 'Mesa de Juntas Motorizada Regulable', 'Mobiliario', 2450.00, 3, 'low_stock', 'mobiliario@contractdesign.com', 'Mesa ejecutiva con canalización integrada.'),
    ('prod-008', 'TECH-SEC-08', 'Firewall Hardware Fortinet FortiGate 60F', 'Hardware', 1120.00, 11, 'in_stock', 'ciberseguridad@fortipartner.es', 'Dispositivo UTM con protección de amenazas.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (id, action, entity, details, user_id, user_email, severity)
VALUES
    ('doc-log-001', 'LOGIN', 'AUTH', 'Inicio de sesión exitoso con rol Administrador en Supabase Auth', 'usr-admin-001', 'admin@empresa.com', 'info'),
    ('doc-log-002', 'CREATE', 'PRODUCT', 'Registro de alta para servidor Dell PowerEdge R750', 'usr-admin-001', 'admin@empresa.com', 'success'),
    ('doc-log-003', 'ALERT', 'PRODUCT', 'Alerta automática: Stock agotado para Monitor Dell UltraSharp', 'system-agent', 'system@novagest.local', 'critical'),
    ('doc-log-004', 'ALERT', 'PRODUCT', 'Alerta de aprovisionamiento: Stock bajo para Silla Herman Miller', 'system-agent', 'system@novagest.local', 'warning')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, name, role)
VALUES
    ('usr-admin-001', 'admin@empresa.com', 'Roberto Gómez (Director IT)', 'admin'),
    ('usr-user-002', 'user@empresa.com', 'Laura Sánchez (Operaciones)', 'user')
ON CONFLICT (id) DO NOTHING;

-- 8. Configuración de Supabase Storage (Bucket para Fotos de Productos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lectura pública de imágenes de catálogo"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Subida de imágenes de catálogo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Actualización y reemplazo de imágenes de catálogo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

CREATE POLICY "Eliminación de imágenes de catálogo"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

