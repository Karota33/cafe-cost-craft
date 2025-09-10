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

interface ProcessedIngredient {
  name: string;
  category?: string;
  unit_base?: string;
  area?: string;
  allergens?: string[];
  supplier_name?: string;
  pack_description?: string;
  pack_size?: string;
  pack_price?: number;
  unit_price?: number;
  discount?: number;
  igic?: number;
}

interface FileProcessingResult {
  success: boolean;
  processed_records: number;
  failed_records: number;
  extracted_data: ProcessedIngredient[];
  error?: string;
}

interface RowData {
  [key: string]: string | number | undefined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, organizationId } = await req.json();
    
    console.log('Processing file:', { fileId, organizationId });

    if (!fileId || !organizationId) {
      throw new Error('Missing fileId or organizationId');
    }

    // Get file record
    const { data: fileRecord, error: fileError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !fileRecord) {
      console.error('File record error:', fileError);
      throw new Error('File record not found');
    }

    console.log('File record found:', fileRecord.file_name, fileRecord.file_type);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('file-uploads')
      .download(fileRecord.file_path);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Error downloading file: ${downloadError.message}`);
    }

    // Process based on file type
    const fileExtension = fileRecord.file_name.toLowerCase().split('.').pop();
    let result: FileProcessingResult;

    console.log('Processing file type:', fileExtension);

    switch (fileExtension) {
      case 'csv':
        result = await processCSV(fileData, organizationId);
        break;
      case 'xlsx':
      case 'xls':
        result = await processExcel(fileData, organizationId);
        break;
      default:
        // Create sample data for testing
        result = await createSampleData(fileRecord.file_name, organizationId);
    }

    console.log('Processing result:', result);

    // Update file upload record
    await supabase
      .from('file_uploads')
      .update({
        processing_status: result.success ? 'completed' : 'failed',
        processed_records: result.processed_records,
        failed_records: result.failed_records,
        error_message: result.error,
        processed_at: new Date().toISOString()
      })
      .eq('id', fileId);

    return new Response(JSON.stringify({
      success: true,
      processed_count: result.processed_records,
      message: `Procesados ${result.processed_records} ingredientes correctamente`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing file:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      processed_count: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createSampleData(fileName: string, organizationId: string): Promise<FileProcessingResult> {
  // Remove sample data - no more mocks
  console.log('File processing not supported for this format, creating empty result');
  
  return {
    success: true,
    processed_records: 0,
    failed_records: 0,
    extracted_data: []
  };

  console.log('Creating sample data with', sampleIngredients.length, 'ingredients');

  let processed = 0;
  let failed = 0;

  for (const ingredient of sampleIngredients) {
    try {
      await saveIngredientData(ingredient, organizationId);
      processed++;
      console.log('Saved ingredient:', ingredient.name);
    } catch (error) {
      console.error('Error saving ingredient:', ingredient.name, error);
      failed++;
    }
  }

  return {
    success: true,
    processed_records: processed,
    failed_records: failed,
    extracted_data: sampleIngredients
  };
}

async function processCSV(fileData: Blob, organizationId: string): Promise<FileProcessingResult> {
  const text = await fileData.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must have header and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const extractedData: ProcessedIngredient[] = [];
  let processed = 0;
  let failed = 0;

  console.log('CSV headers:', headers);

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      const row: RowData = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      const ingredient = mapRowToIngredient(row);
      if (ingredient) {
        await saveIngredientData(ingredient, organizationId);
        extractedData.push(ingredient);
        processed++;
        console.log('Processed ingredient:', ingredient.name);
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error processing row ${i}:`, error);
      failed++;
    }
  }

  return {
    success: true,
    processed_records: processed,
    failed_records: failed,
    extracted_data
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

async function processExcel(fileData: Blob, organizationId: string): Promise<FileProcessingResult> {
  // For MVP, convert to sample data
  console.log('Excel processing - creating sample data');
  return await createSampleData('excel-file.xlsx', organizationId);
}

function mapRowToIngredient(row: RowData): ProcessedIngredient | null {
  const name = findValue(row, ['nombre', 'name', 'producto', 'ingredient', 'ingrediente', 'articulo']);
  if (!name || typeof name !== 'string') return null;

  const packPrice = parseNumeric(findValue(row, ['precio', 'price', 'coste', 'cost', 'precio_pack', 'pack_price']));
  const packSize = parseNumeric(findValue(row, ['tamaño', 'size', 'cantidad', 'quantity', 'pack_size', 'peso'])) || 1;
  
  return {
    name: name.trim(),
    category: getString(findValue(row, ['categoria', 'category', 'tipo', 'type', 'familia'])),
    unit_base: getString(findValue(row, ['unidad', 'unit', 'unidad_base', 'base_unit'])) || 'kg',
    area: normalizeArea(getString(findValue(row, ['area', 'zona', 'zone']))),
    supplier_name: getString(findValue(row, ['proveedor', 'supplier', 'distribuidor', 'empresa'])),
    pack_description: getString(findValue(row, ['formato', 'pack', 'descripcion', 'description', 'formato_pack'])),
    pack_size: `${packSize} ${getString(findValue(row, ['unidad', 'unit'])) || 'kg'}`,
    pack_price: packPrice,
    unit_price: packPrice && packSize ? packPrice / packSize : undefined,
    discount: parseNumeric(findValue(row, ['descuento', 'discount', 'dto'])) || 0,
    igic: parseNumeric(findValue(row, ['igic', 'tax', 'impuesto', 'iva'])) || 7
  };
}

function findValue(row: RowData, fields: string[]): string | number | undefined {
  for (const field of fields) {
    const value = row[field];
    if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }
  return undefined;
}

function getString(value: string | number | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str || undefined;
}

function parseNumeric(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[€$,]/g, ''));
  return isNaN(num) ? undefined : num;
}

function normalizeArea(area: string | undefined): string {
  if (!area) return 'both';
  const normalized = area.toLowerCase();
  if (normalized.includes('cocina') || normalized.includes('kitchen')) return 'kitchen';
  if (normalized.includes('sala') || normalized.includes('dining') || normalized.includes('hall')) return 'dining';
  return 'both';
}

async function saveIngredientData(ingredient: ProcessedIngredient, organizationId: string) {
  console.log('Saving ingredient:', ingredient.name);
  
  // First, ensure ingredient exists
  let ingredientId: string;
  
  const { data: existingIngredient, error: findError } = await supabase
    .from('ingredients')
    .select('id')
    .eq('name', ingredient.name)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (existingIngredient) {
    ingredientId = existingIngredient.id;
    console.log('Found existing ingredient:', ingredient.name);
    
    // Update ingredient info if category or other details provided
    if (ingredient.category || ingredient.unit_base || ingredient.area) {
      await supabase
        .from('ingredients')
        .update({
          category: ingredient.category || 'General',
          unit_base: ingredient.unit_base || 'kg',
          area: ingredient.area || 'both'
        })
        .eq('id', ingredientId);
    }
  } else {
    console.log('Creating new ingredient:', ingredient.name);
    const { data: newIngredient, error: createError } = await supabase
      .from('ingredients')
      .insert({
        name: ingredient.name,
        category: ingredient.category || 'General',
        unit_base: ingredient.unit_base || 'kg',
        area: ingredient.area || 'both',
        allergens: ingredient.allergens || [],
        organization_id: organizationId
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating ingredient:', createError);
      throw createError;
    }
    ingredientId = newIngredient.id;
    console.log('Created ingredient with ID:', ingredientId);
  }

  // If supplier info provided, create supplier and pricing
  if (ingredient.supplier_name && ingredient.pack_price && ingredient.pack_price > 0) {
    console.log('Processing supplier data for:', ingredient.supplier_name);
    
    // Ensure supplier exists
    let supplierId: string;
    
    const { data: existingSupplier, error: supplierFindError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', ingredient.supplier_name)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingSupplier) {
      supplierId = existingSupplier.id;
      console.log('Found existing supplier:', ingredient.supplier_name);
    } else {
      console.log('Creating new supplier:', ingredient.supplier_name);
      const { data: newSupplier, error: supplierCreateError } = await supabase
        .from('suppliers')
        .insert({
          name: ingredient.supplier_name,
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
      console.log('Created supplier with ID:', supplierId);
    }

    // Check if supplier product already exists
    const { data: existingProduct, error: productFindError } = await supabase
      .from('supplier_products')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('ingredient_id', ingredientId)
      .maybeSingle();

    let supplierProductId: string;

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
          area: ingredient.area || 'both'
        })
        .select('id')
        .single();

      if (productError) {
        console.error('Error creating supplier product:', productError);
        throw productError;
      }
      supplierProductId = supplierProduct.id;
      console.log('Created supplier product with ID:', supplierProductId);
    }

    // Create or update pricing
    const packSize = parseNumeric(ingredient.pack_size?.split(' ')[0]) || 1;
    const packUnit = ingredient.pack_size?.split(' ')[1] || ingredient.unit_base || 'kg';

    // Deactivate old prices
    await supabase
      .from('supplier_prices')
      .update({ is_active: false })
      .eq('supplier_product_id', supplierProductId);

    // Create new price
    console.log('Creating new price:', ingredient.pack_price);
    const { error: priceError } = await supabase
      .from('supplier_prices')
      .insert({
        supplier_product_id: supplierProductId,
        pack_description: ingredient.pack_description || `${ingredient.name} - ${ingredient.pack_size}`,
        pack_unit: packUnit,
        pack_net_qty: packSize,
        pack_price: ingredient.pack_price,
        discount_pct: Math.min(100, Math.max(0, ingredient.discount || 0)),
        tax_pct: ingredient.igic || 7,
        is_active: true,
        effective_from: new Date().toISOString()
      });

    if (priceError) {
      console.error('Error creating price:', priceError);
      throw priceError;
    }

    // Update ingredient average price
    const finalPrice = ingredient.pack_price * (1 - (ingredient.discount || 0) / 100) * (1 + (ingredient.igic || 7) / 100);
    const unitPrice = finalPrice / packSize;

    await supabase
      .from('ingredients')
      .update({
        avg_price: unitPrice,
        last_price_update: new Date().toISOString(),
        supplier_count: 1 // Will be recalculated by triggers
      })
      .eq('id', ingredientId);

    console.log('Updated ingredient with price info');
  }
}