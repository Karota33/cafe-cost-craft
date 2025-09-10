-- Fix discount percentage constraint to allow proper range
ALTER TABLE supplier_prices DROP CONSTRAINT IF EXISTS supplier_prices_discount_pct_check;
ALTER TABLE supplier_prices ADD CONSTRAINT supplier_prices_discount_pct_check CHECK (discount_pct >= 0 AND discount_pct <= 100);

-- Fix potential UUID issues in recipes by ensuring proper defaults
ALTER TABLE recipes ALTER COLUMN organization_id SET NOT NULL;

-- Add processing status tracking for better file management
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS extraction_data JSONB DEFAULT '{}';
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]';

-- Create a table for column mappings during import
CREATE TABLE IF NOT EXISTS file_import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_upload_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  source_columns JSONB NOT NULL DEFAULT '[]',
  column_mappings JSONB NOT NULL DEFAULT '{}',
  normalization_rules JSONB NOT NULL DEFAULT '{}',
  validation_results JSONB NOT NULL DEFAULT '{}',
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for import mappings
ALTER TABLE file_import_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for import mappings
CREATE POLICY "Users can manage their organization's import mappings"
ON file_import_mappings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM memberships 
  WHERE organization_id = file_import_mappings.organization_id 
  AND user_id = auth.uid() 
  AND role IN ('owner', 'admin', 'manager') 
  AND is_active = true
));

-- Update ingredients table to better track pricing data
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS best_price NUMERIC(10,4);
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS best_price_supplier_id UUID;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS price_trend NUMERIC(5,2) DEFAULT 0;

-- Add trigger to update ingredient pricing when supplier prices change
CREATE OR REPLACE FUNCTION update_ingredient_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- Update best price for the ingredient
  UPDATE ingredients 
  SET 
    best_price = (
      SELECT MIN(sp.pack_price / sp.pack_net_qty)
      FROM supplier_prices sp
      JOIN supplier_products spr ON sp.supplier_product_id = spr.id
      WHERE spr.ingredient_id = (
        SELECT spr2.ingredient_id 
        FROM supplier_products spr2 
        WHERE spr2.id = NEW.supplier_product_id
      )
      AND sp.is_active = true
      AND (sp.effective_to IS NULL OR sp.effective_to > now())
    ),
    best_price_supplier_id = (
      SELECT spr.supplier_id
      FROM supplier_products spr
      JOIN supplier_prices sp ON sp.supplier_product_id = spr.id
      WHERE spr.ingredient_id = (
        SELECT spr2.ingredient_id 
        FROM supplier_products spr2 
        WHERE spr2.id = NEW.supplier_product_id
      )
      AND sp.is_active = true
      AND (sp.effective_to IS NULL OR sp.effective_to > now())
      ORDER BY (sp.pack_price / sp.pack_net_qty) ASC
      LIMIT 1
    ),
    last_price_update = now(),
    updated_at = now()
  WHERE id = (
    SELECT ingredient_id 
    FROM supplier_products 
    WHERE id = NEW.supplier_product_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic price updates
DROP TRIGGER IF EXISTS trigger_update_ingredient_pricing ON supplier_prices;
CREATE TRIGGER trigger_update_ingredient_pricing
  AFTER INSERT OR UPDATE ON supplier_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_ingredient_pricing();