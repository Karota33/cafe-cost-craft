import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { OcrService, ExtractedPriceData } from './OcrService';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessedIngredient {
  name: string;
  category?: string;
  family?: string;
  subfamily?: string;
  area: 'kitchen' | 'dining' | 'both';
  unitBase: string;
  allergens: string[];
  supplier?: string;
  price?: number;
  unit?: string;
  packDescription?: string;
  yieldRate?: number;
}

export interface FileProcessingResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  data: ProcessedIngredient[];
  errors: string[];
}

export class FileProcessor {
  static async processFile(file: File, organizationId: string): Promise<FileProcessingResult> {
    const fileType = this.getFileType(file);
    
    try {
      let result: FileProcessingResult;
      
      switch (fileType) {
        case 'csv':
          result = await this.processCsv(file);
          break;
        case 'excel':
          result = await this.processExcel(file);
          break;
        case 'pdf':
          result = await this.processPdf(file);
          break;
        case 'image':
          result = await this.processImage(file);
          break;
        default:
          throw new Error(`Tipo de archivo no soportado: ${file.type}`);
      }

      // Subir archivo a Supabase Storage
      await this.uploadToStorage(file, organizationId);
      
      // Guardar registro de procesamiento
      await this.saveProcessingRecord(file, organizationId, result);

      return result;
    } catch (error) {
      console.error('Error processing file:', error);
      return {
        success: false,
        processedCount: 0,
        failedCount: 1,
        data: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  private static getFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (['csv'].includes(extension)) return 'csv';
    if (['xlsx', 'xls'].includes(extension)) return 'excel';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) return 'image';
    
    return 'unknown';
  }

  private static async processCsv(file: File): Promise<FileProcessingResult> {
    return new Promise((resolve) => {
      const results: ProcessedIngredient[] = [];
      const errors: string[] = [];

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          result.data.forEach((row: any, index: number) => {
            try {
              const processed = this.mapRowToIngredient(row);
              if (processed) {
                results.push(processed);
              }
            } catch (error) {
              errors.push(`Fila ${index + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
          });

          resolve({
            success: errors.length < results.length,
            processedCount: results.length,
            failedCount: errors.length,
            data: results,
            errors
          });
        },
        error: (error) => {
          resolve({
            success: false,
            processedCount: 0,
            failedCount: 1,
            data: [],
            errors: [error.message]
          });
        }
      });
    });
  }

  private static async processExcel(file: File): Promise<FileProcessingResult> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const results: ProcessedIngredient[] = [];
    const errors: string[] = [];

    jsonData.forEach((row: any, index: number) => {
      try {
        const processed = this.mapRowToIngredient(row);
        if (processed) {
          results.push(processed);
        }
      } catch (error) {
        errors.push(`Fila ${index + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });

    return {
      success: errors.length < results.length,
      processedCount: results.length,
      failedCount: errors.length,
      data: results,
      errors
    };
  }

  private static async processPdf(file: File): Promise<FileProcessingResult> {
    const ocrResult = await OcrService.processPDF(file);
    
    if (!ocrResult.success) {
      return {
        success: false,
        processedCount: 0,
        failedCount: 1,
        data: [],
        errors: [ocrResult.error || 'Error en OCR de PDF']
      };
    }

    const results = this.convertOcrToIngredients(ocrResult.extractedData);
    
    return {
      success: true,
      processedCount: results.length,
      failedCount: 0,
      data: results,
      errors: []
    };
  }

  private static async processImage(file: File): Promise<FileProcessingResult> {
    const ocrResult = await OcrService.processImage(file);
    
    if (!ocrResult.success) {
      return {
        success: false,
        processedCount: 0,
        failedCount: 1,
        data: [],
        errors: [ocrResult.error || 'Error en OCR de imagen']
      };
    }

    const results = this.convertOcrToIngredients(ocrResult.extractedData);
    
    return {
      success: true,
      processedCount: results.length,
      failedCount: 0,
      data: results,
      errors: []
    };
  }

  private static mapRowToIngredient(row: any): ProcessedIngredient | null {
    // Mapeo flexible de columnas comunes
    const nameFields = ['nombre', 'name', 'producto', 'ingredient', 'ingrediente'];
    const priceFields = ['precio', 'price', 'coste', 'cost'];
    const unitFields = ['unidad', 'unit', 'medida'];
    const categoryFields = ['categoria', 'category', 'tipo', 'type'];
    const supplierFields = ['proveedor', 'supplier', 'distribuidor'];

    const name = this.findValue(row, nameFields);
    if (!name) return null;

    const price = parseFloat(this.findValue(row, priceFields) || '0');
    const unit = this.findValue(row, unitFields) || 'kg';
    const category = this.findValue(row, categoryFields);
    const supplier = this.findValue(row, supplierFields);

    return {
      name,
      category,
      area: 'both',
      unitBase: unit,
      allergens: [],
      supplier,
      price: price > 0 ? price : undefined,
      unit,
      yieldRate: 1.0
    };
  }

  private static findValue(row: any, fields: string[]): string | undefined {
    for (const field of fields) {
      const value = row[field] || row[field.toLowerCase()] || row[field.toUpperCase()];
      if (value && value.toString().trim()) {
        return value.toString().trim();
      }
    }
    return undefined;
  }

  private static convertOcrToIngredients(extractedData: ExtractedPriceData[]): ProcessedIngredient[] {
    return extractedData
      .filter(item => item.ingredient && item.price)
      .map(item => ({
        name: item.ingredient!,
        area: 'both' as const,
        unitBase: item.unit || 'kg',
        allergens: [],
        price: item.price,
        unit: item.unit,
        supplier: item.supplier,
        yieldRate: 1.0
      }));
  }

  private static async uploadToStorage(file: File, organizationId: string): Promise<string> {
    const fileName = `${organizationId}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('file-uploads')
      .upload(fileName, file);

    if (error) throw error;
    return data.path;
  }

  private static async saveProcessingRecord(
    file: File, 
    organizationId: string, 
    result: FileProcessingResult
  ): Promise<void> {
    const { error } = await supabase
      .from('file_uploads')
      .insert({
        organization_id: organizationId,
        file_type: this.getFileType(file),
        file_name: file.name,
        file_size: file.size,
        file_path: `${organizationId}/${Date.now()}-${file.name}`,
        processing_status: result.success ? 'completed' : 'failed',
        processed_records: result.processedCount,
        error_message: result.errors.join('; ') || null
      });

    if (error) {
      console.error('Error saving processing record:', error);
    }
  }
}