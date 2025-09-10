// Utility functions for normalizing product data across ingestion and comparison

export interface ParsedPack {
  total: number;
  unit: string;
  count?: number;  // for "6×1 L" format
  individual?: number; // individual size
}

/**
 * Parse pack labels like "6×1 L", "500 g", "0,75 L", "Caja 12×500ml"
 */
export function parsePack(label: string): ParsedPack {
  if (!label) return { total: 0, unit: 'ud' };
  
  const cleaned = label.toLowerCase().trim();
  
  // Pattern for "6×1 L", "12x500g", "Caja 6×500ml"
  const multiPackPattern = /(?:caja\s+)?(\d+)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|ud|unidad|litro|kilo)/i;
  const multiMatch = cleaned.match(multiPackPattern);
  
  if (multiMatch) {
    const count = parseInt(multiMatch[1]);
    const individual = parseSpanishNumber(multiMatch[2]);
    const unit = normalizeUnit(multiMatch[3]);
    
    return {
      total: count * individual,
      unit,
      count,
      individual
    };
  }
  
  // Pattern for simple quantities "500 g", "0,75 L", "1,5kg"
  const simplePattern = /(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|ud|unidad|litro|kilo|botella|paquete)/i;
  const simpleMatch = cleaned.match(simplePattern);
  
  if (simpleMatch) {
    const amount = parseSpanishNumber(simpleMatch[1]);
    const unit = normalizeUnit(simpleMatch[2]);
    
    return {
      total: amount,
      unit
    };
  }
  
  // Fallback: try to extract any number
  const numberPattern = /(\d+(?:[.,]\d+)?)/;
  const numberMatch = cleaned.match(numberPattern);
  
  if (numberMatch) {
    return {
      total: parseSpanishNumber(numberMatch[1]),
      unit: 'ud'
    };
  }
  
  return { total: 1, unit: 'ud' };
}

/**
 * Parse Spanish number format (comma as decimal separator)
 */
export function parseSpanishNumber(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(',', '.'));
}

/**
 * Normalize unit names to standard base units
 */
export function normalizeUnit(unit: string): string {
  if (!unit) return 'ud';
  
  const normalized = unit.toLowerCase().trim();
  
  const unitMap: Record<string, string> = {
    'kg': 'kg',
    'kilo': 'kg',
    'kilogramo': 'kg',
    'g': 'kg',
    'gr': 'kg',
    'gramo': 'kg',
    'gramos': 'kg',
    
    'l': 'L',
    'litro': 'L',
    'litros': 'L',
    'ml': 'L',
    'mililitro': 'L',
    'mililitros': 'L',
    
    'ud': 'ud',
    'unidad': 'ud',
    'unidades': 'ud',
    'u': 'ud',
    'pza': 'ud',
    'pieza': 'ud',
    'piezas': 'ud',
    'botella': 'ud',
    'botellas': 'ud',
    'paquete': 'ud',
    'paquetes': 'ud'
  };
  
  return unitMap[normalized] || 'ud';
}

/**
 * Convert quantity to base units (kg, L, ud)
 */
export function toBaseUnits(amount: number, unit: string): number {
  if (!amount || amount <= 0) return 0;
  
  const normalized = normalizeUnit(unit);
  
  switch (normalized) {
    case 'kg':
      // Convert g to kg
      if (unit.toLowerCase().includes('g') && !unit.toLowerCase().includes('kg')) {
        return amount / 1000;
      }
      return amount;
      
    case 'L':
      // Convert ml to L
      if (unit.toLowerCase().includes('ml')) {
        return amount / 1000;
      }
      return amount;
      
    default:
      return amount;
  }
}

/**
 * Calculate normalized unit price (€/kg, €/L, €/ud)
 */
export function calculateUnitPrice(price: number, packData: ParsedPack): number {
  if (!price || price <= 0 || !packData.total || packData.total <= 0) return 0;
  
  const baseAmount = toBaseUnits(packData.total, packData.unit);
  return price / baseAmount;
}

/**
 * Format unit price with proper unit
 */
export function formatUnitPrice(unitPrice: number, unit: string): string {
  const baseUnit = normalizeUnit(unit);
  return `${unitPrice.toFixed(4)} €/${baseUnit}`;
}

/**
 * Validate and normalize a row of ingredient data
 */
export interface NormalizationResult {
  isValid: boolean;
  errors: string[];
  normalized?: {
    producto: string;
    proveedor: string;
    formato: string;
    contenido: number;
    unidad: string;
    precio: number;
    precioUnitario: number;
    igic: number;
    area: string;
    referencia?: string;
    categoria?: string;
  };
}

export function normalizeIngredientRow(row: Record<string, any>): NormalizationResult {
  const errors: string[] = [];
  
  // Required fields validation
  const producto = row.producto?.toString().trim();
  if (!producto) errors.push('Producto/ingrediente es requerido');
  
  const proveedor = row.proveedor?.toString().trim();
  if (!proveedor) errors.push('Proveedor es requerido');
  
  const precioStr = row.precio?.toString().trim();
  if (!precioStr) errors.push('Precio es requerido');
  
  const precio = precioStr ? parseSpanishNumber(precioStr) : 0;
  if (precio <= 0) errors.push('Precio debe ser mayor a 0');
  
  // Parse pack information
  const formato = row.formato?.toString().trim() || row.contenido?.toString().trim() || '';
  const packData = parsePack(formato);
  
  if (packData.total <= 0) {
    errors.push('No se pudo determinar el contenido del producto');
  }
  
  // Calculate unit price
  const precioUnitario = calculateUnitPrice(precio, packData);
  
  // Optional fields
  const igicStr = row.igic?.toString().trim() || '7';
  const igic = parseSpanishNumber(igicStr);
  
  const area = normalizeArea(row.area?.toString().trim());
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  return {
    isValid: true,
    errors: [],
    normalized: {
      producto: producto!,
      proveedor: proveedor!,
      formato,
      contenido: packData.total,
      unidad: packData.unit,
      precio,
      precioUnitario,
      igic,
      area,
      referencia: row.referencia?.toString().trim(),
      categoria: row.categoria?.toString().trim()
    }
  };
}

/**
 * Normalize area values
 */
function normalizeArea(area: string): string {
  if (!area) return 'both';
  
  const normalized = area.toLowerCase().trim();
  
  if (normalized.includes('cocina') || normalized.includes('kitchen')) return 'kitchen';
  if (normalized.includes('sala') || normalized.includes('dining') || normalized.includes('comedor')) return 'dining';
  
  return 'both';
}