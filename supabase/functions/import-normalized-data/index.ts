import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface NormalizedData {
  producto: string;
  proveedor: string;
  formato?: string;
  contenido: number;
  unidad: string;
  precio: number;
  igic?: number;
  area?: string;
  referencia?: string;
  categoria?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, data } = await req.json();
    
    console.log('Starting import for organization:', organizationId);
    console.log('Data to import:', data.length, 'items');

    if (!organizationId || !data || !Array.isArray(data)) {
      throw new Error('Missing organizationId or data');
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const item of data as NormalizedData[]) {
      try {
        await importSingleItem(item, organizationId);
        processedCount++;
        console.log('Imported:', item.producto);
      } catch (error) {
        failedCount++;
        const errorMsg = `Error importing ${item.producto}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log('Import completed:', { processedCount, failedCount });

    return new Response(JSON.stringify({
      success: true,
      processedCount,
      failedCount,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in import function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function importSingleItem(item: NormalizedData, organizationId: string) {
  console.log('Processing item:', item.producto);

  // Step 1: Ensure ingredient exists
  let ingredientId: string;
  
  const { data: existingIngredient, error: findError } = await supabase
    .from('ingredients')
    .select('id')
    .eq('name', item.producto)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (existingIngredient) {
    ingredientId = existingIngredient.id;
    console.log('Found existing ingredient:', item.producto);
    
    // Update ingredient info
    await supabase
      .from('ingredients')
      .update({
        category: item.categoria || 'General',
        unit_base: normalizeBaseUnit(item.unidad),
        area: item.area || 'both',
        updated_at: new Date().toISOString()
      })
      .eq('id', ingredientId);
  } else {
    console.log('Creating new ingredient:', item.producto);
    const { data: newIngredient, error: createError } = await supabase
      .from('ingredients')
      .insert({
        name: item.producto,
        category: item.categoria || 'General',
        unit_base: normalizeBaseUnit(item.unidad),
        area: item.area || 'both',
        organization_id: organizationId
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating ingredient:', createError);
      throw createError;
    }
    ingredientId = newIngredient.id;
  }

  // Step 2: Ensure supplier exists
  let supplierId: string;
  
  const { data: existingSupplier, error: supplierFindError } = await supabase
    .from('suppliers')
    .select('id')
    .eq('name', item.proveedor)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (existingSupplier) {
    supplierId = existingSupplier.id;
    console.log('Found existing supplier:', item.proveedor);
  } else {
    console.log('Creating new supplier:', item.proveedor);
    const { data: newSupplier, error: supplierCreateError } = await supabase
      .from('suppliers')
      .insert({
        name: item.proveedor,
        organization_id: organizationId,
        lead_time_days: 1
      })
      .select('id')
      .single();

    if (supplierCreateError) {
      console.error('Error creating supplier:', supplierCreateError);
      throw supplierCreateError;
    }
    supplierId = newSupplier.id;
  }

  // Step 3: Ensure supplier product exists
  let supplierProductId: string;

  const { data: existingProduct, error: productFindError } = await supabase
    .from('supplier_products')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('ingredient_id', ingredientId)
    .maybeSingle();

  if (existingProduct) {
    supplierProductId = existingProduct.id;
    console.log('Found existing supplier product');
  } else {
    console.log('Creating supplier product');
    const { data: supplierProduct, error: productError } = await supabase
      .from('supplier_products')
      .insert({
        supplier_id: supplierId,
        ingredient_id: ingredientId,
        area: item.area || 'both',
        family: item.categoria || 'General'
      })
      .select('id')
      .single();

    if (productError) {
      console.error('Error creating supplier product:', productError);
      throw productError;
    }
    supplierProductId = supplierProduct.id;
  }

  // Step 4: Create or update pricing
  console.log('Creating new price for:', item.producto);

  // Deactivate old prices for this supplier product
  await supabase
    .from('supplier_prices')
    .update({ is_active: false })
    .eq('supplier_product_id', supplierProductId);

  // Convert content to base unit for consistent pricing
  const baseContent = convertToBaseUnit(item.contenido, item.unidad);
  const baseUnit = normalizeBaseUnit(item.unidad);

  // Create new price
  const { error: priceError } = await supabase
    .from('supplier_prices')
    .insert({
      supplier_product_id: supplierProductId,
      pack_description: item.formato || `${item.producto} - ${item.contenido} ${item.unidad}`,
      pack_unit: baseUnit,
      pack_net_qty: baseContent,
      pack_price: item.precio,
      discount_pct: 0,
      tax_pct: (item.igic || 7) / 100,
      is_active: true,
      effective_from: new Date().toISOString()
    });

  if (priceError) {
    console.error('Error creating price:', priceError);
    throw priceError;
  }

  console.log('Successfully imported:', item.producto);
}

function normalizeBaseUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'g': 'kg',
    'kg': 'kg',
    'ml': 'L',
    'l': 'L',
    'L': 'L',
    'ud': 'ud',
    'u': 'ud',
    'unidad': 'ud',
    'unidades': 'ud'
  };

  return unitMap[unit] || 'kg';
}

function convertToBaseUnit(amount: number, unit: string): number {
  const conversionMap: Record<string, number> = {
    'g': 0.001,  // g to kg
    'kg': 1,     // kg to kg
    'ml': 0.001, // ml to L
    'l': 1,      // L to L
    'L': 1,      // L to L
    'ud': 1,     // ud to ud
    'u': 1,      // u to ud
    'unidad': 1,
    'unidades': 1
  };

  const factor = conversionMap[unit] || 1;
  return amount * factor;
}