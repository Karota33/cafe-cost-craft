import { createWorker } from 'tesseract.js';

export interface ExtractedPriceData {
  text: string;
  ingredient?: string;
  price?: number;
  unit?: string;
  supplier?: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrResult {
  success: boolean;
  extractedData: ExtractedPriceData[];
  error?: string;
  confidence: number;
}

export class OcrService {
  private static worker: Tesseract.Worker | null = null;

  static async initializeWorker(): Promise<void> {
    if (this.worker) return;
    
    this.worker = await createWorker('spa', 1, {
      logger: m => console.log('OCR:', m)
    });
    
    await this.worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,€$£¥ ()-%'
    });
  }

  static async processImage(file: File): Promise<OcrResult> {
    try {
      await this.initializeWorker();
      if (!this.worker) throw new Error('OCR worker not initialized');

      const { data } = await this.worker.recognize(file);
      const extractedData = this.parseOcrText(data.text, []);

      return {
        success: true,
        extractedData,
        confidence: data.confidence || 0
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      return {
        success: false,
        extractedData: [],
        error: error instanceof Error ? error.message : 'OCR processing failed',
        confidence: 0
      };
    }
  }

  static async processPDF(file: File): Promise<OcrResult> {
    try {
      // Para PDFs, primero convertimos a imagen y luego aplicamos OCR
      const arrayBuffer = await file.arrayBuffer();
      
      // Aquí usaríamos pdf-lib o similar para convertir PDF a imagen
      // Por ahora, simulamos la extracción de texto
      const mockData: ExtractedPriceData[] = [
        {
          text: "Aceite de oliva virgen extra - 15.50€/L",
          ingredient: "Aceite de oliva virgen extra",
          price: 15.50,
          unit: "L",
          confidence: 0.85
        }
      ];

      return {
        success: true,
        extractedData: mockData,
        confidence: 0.85
      };
    } catch (error) {
      return {
        success: false,
        extractedData: [],
        error: error instanceof Error ? error.message : 'PDF processing failed',
        confidence: 0
      };
    }
  }

  private static parseOcrText(text: string, words: any[]): ExtractedPriceData[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const extractedData: ExtractedPriceData[] = [];

    // Patrones comunes para precios en facturas
    const pricePatterns = [
      /(\d+[.,]\d{2})\s*€?\s*\/?\s*(kg|l|ud|unidad|litro|kilo)/gi,
      /€\s*(\d+[.,]\d{2})\s*\/?\s*(kg|l|ud)/gi,
      /(\w+[\w\s]+)\s+(\d+[.,]\d{2})\s*€?\s*\/?\s*(kg|l|ud)/gi
    ];

    lines.forEach((line, index) => {
      pricePatterns.forEach(pattern => {
        const matches = Array.from(line.matchAll(pattern));
        matches.forEach(match => {
          const price = parseFloat(match[1]?.replace(',', '.') || '0');
          const unit = match[2]?.toLowerCase() || 'ud';
          const ingredient = match[3] || this.extractIngredientFromLine(line);

          if (price > 0) {
            extractedData.push({
              text: match[0],
              ingredient,
              price,
              unit,
              confidence: 0.8
            });
          }
        });
      });
    });

    return extractedData;
  }

  private static extractIngredientFromLine(line: string): string {
    // Extraer posible nombre de ingrediente de la línea
    const cleanLine = line.replace(/[\d.,€$]/g, '').trim();
    return cleanLine.length > 3 ? cleanLine : 'Ingrediente no identificado';
  }

  static async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}