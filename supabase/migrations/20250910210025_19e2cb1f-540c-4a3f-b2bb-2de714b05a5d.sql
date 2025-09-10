-- Ampliar base de datos para ingesta multi-formato

-- Tabla para procesamiento OCR
CREATE TABLE public.ocr_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabla para alertas de precios
CREATE TABLE public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) NOT NULL,
  threshold_percentage DECIMAL(5,2) DEFAULT 10.00,
  alert_type TEXT DEFAULT 'increase' CHECK (alert_type IN ('increase', 'decrease', 'both')),
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ampliar tabla de ingredientes con campos faltantes
ALTER TABLE public.ingredients 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'both' CHECK (area IN ('kitchen', 'dining', 'both')),
ADD COLUMN IF NOT EXISTS unit_base TEXT DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS supplier_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_price DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE;

-- Ampliar tabla de file_uploads con más detalles
ALTER TABLE public.file_uploads
ADD COLUMN IF NOT EXISTS ocr_processing_id UUID REFERENCES public.ocr_processing(id),
ADD COLUMN IF NOT EXISTS extracted_records INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_records INTEGER DEFAULT 0;

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.ocr_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ocr_processing
CREATE POLICY "Members can view OCR processing" 
ON public.ocr_processing 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.memberships 
  WHERE memberships.organization_id = ocr_processing.organization_id 
  AND memberships.user_id = auth.uid() 
  AND memberships.is_active = true
));

CREATE POLICY "Managers can manage OCR processing" 
ON public.ocr_processing 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.memberships 
  WHERE memberships.organization_id = ocr_processing.organization_id 
  AND memberships.user_id = auth.uid() 
  AND memberships.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role]) 
  AND memberships.is_active = true
));

-- Políticas RLS para price_alerts
CREATE POLICY "Members can view price alerts" 
ON public.price_alerts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.memberships 
  WHERE memberships.organization_id = price_alerts.organization_id 
  AND memberships.user_id = auth.uid() 
  AND memberships.is_active = true
));

CREATE POLICY "Managers can manage price alerts" 
ON public.price_alerts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.memberships 
  WHERE memberships.organization_id = price_alerts.organization_id 
  AND memberships.user_id = auth.uid() 
  AND memberships.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role]) 
  AND memberships.is_active = true
));

-- Trigger para actualizar updated_at en price_alerts
CREATE TRIGGER update_price_alerts_updated_at
BEFORE UPDATE ON public.price_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear buckets de storage para archivos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('file-uploads', 'file-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para file-uploads
CREATE POLICY "Members can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'file-uploads' 
  AND EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.user_id = auth.uid() 
    AND memberships.is_active = true
  )
);

CREATE POLICY "Members can view their org files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'file-uploads' 
  AND EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.user_id = auth.uid() 
    AND memberships.is_active = true
  )
);

CREATE POLICY "Managers can delete files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'file-uploads' 
  AND EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.user_id = auth.uid() 
    AND memberships.role = ANY(ARRAY['owner'::user_role, 'admin'::user_role, 'manager'::user_role]) 
    AND memberships.is_active = true
  )
);