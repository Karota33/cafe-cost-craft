import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.js';

export interface PdfExtractionResult {
  success: boolean;
  data: string[][];
  columns: string[];
  error?: string;
  metadata: {
    pages: number;
    hasText: boolean;
    tables: number;
  };
}

export class PdfService {
  /**
   * Extract table data from PDF file
   */
  static async extractTableData(file: File): Promise<PdfExtractionResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const allRows: string[][] = [];
      let detectedColumns: string[] = [];
      let hasText = false;
      let tableCount = 0;
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        if (textContent.items.length > 0) {
          hasText = true;
          
          // Extract text and position information
          const textItems = textContent.items
            .filter((item): item is any => 'str' in item && 'transform' in item)
            .map(item => ({
              text: item.str.trim(),
              x: item.transform[4],
              y: item.transform[5],
              width: item.width || 0,
              height: item.height || 12
            }))
            .filter(item => item.text.length > 0);
          
          // Group text items into potential table rows
          const rows = this.extractTableRows(textItems);
          
          if (rows.length > 0) {
            tableCount++;
            
            // Detect columns from first few rows if not already detected
            if (detectedColumns.length === 0 && rows.length > 0) {
              detectedColumns = this.detectColumns(rows);
            }
            
            allRows.push(...rows);
          }
        }
      }
      
      if (!hasText) {
        return {
          success: false,
          data: [],
          columns: [],
          error: 'PDF appears to be scanned (no text content). OCR processing required.',
          metadata: {
            pages: pdf.numPages,
            hasText: false,
            tables: 0
          }
        };
      }
      
      if (allRows.length === 0) {
        return {
          success: false,
          data: [],
          columns: [],
          error: 'No table data found in PDF',
          metadata: {
            pages: pdf.numPages,
            hasText: true,
            tables: 0
          }
        };
      }
      
      return {
        success: true,
        data: allRows,
        columns: detectedColumns,
        metadata: {
          pages: pdf.numPages,
          hasText: true,
          tables: tableCount
        }
      };
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      return {
        success: false,
        data: [],
        columns: [],
        error: error instanceof Error ? error.message : 'Failed to process PDF',
        metadata: {
          pages: 0,
          hasText: false,
          tables: 0
        }
      };
    }
  }
  
  /**
   * Extract and organize text items into table rows
   */
  private static extractTableRows(textItems: Array<{text: string; x: number; y: number; width: number; height: number}>): string[][] {
    if (textItems.length === 0) return [];
    
    // Group items by Y coordinate (rows)
    const rowGroups = new Map<number, Array<{text: string; x: number}>>();
    
    textItems.forEach(item => {
      // Round Y coordinate to group items on same line
      const rowY = Math.round(item.y / 5) * 5;
      
      if (!rowGroups.has(rowY)) {
        rowGroups.set(rowY, []);
      }
      
      rowGroups.get(rowY)!.push({
        text: item.text,
        x: item.x
      });
    });
    
    // Convert to array and sort by Y coordinate (top to bottom)
    const sortedRows = Array.from(rowGroups.entries())
      .sort((a, b) => b[0] - a[0]) // Reverse sort for PDF coordinates
      .map(([y, items]) => {
        // Sort items in each row by X coordinate (left to right)
        return items
          .sort((a, b) => a.x - b.x)
          .map(item => item.text);
      })
      .filter(row => row.length > 1); // Only keep rows with multiple columns
    
    return sortedRows;
  }
  
  /**
   * Detect column headers from the first few rows
   */
  private static detectColumns(rows: string[][]): string[] {
    if (rows.length === 0) return [];
    
    // Look for common header patterns in first 3 rows
    const headerPatterns = [
      /referencia|código|code|ref/i,
      /descripción|producto|nombre|name|description/i,
      /formato|presentación|format|pack/i,
      /precio|price|pvp|importe/i,
      /unidad|unit|medida/i,
      /iva|igic|tax/i,
      /proveedor|supplier|distribuidor/i
    ];
    
    let bestHeaderRow: string[] = [];
    let maxMatches = 0;
    
    // Check first few rows for header patterns
    for (let i = 0; i < Math.min(3, rows.length); i++) {
      const row = rows[i];
      let matches = 0;
      
      row.forEach(cell => {
        headerPatterns.forEach(pattern => {
          if (pattern.test(cell)) {
            matches++;
          }
        });
      });
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestHeaderRow = row;
      }
    }
    
    // If no clear headers found, create generic ones
    if (maxMatches === 0 && rows.length > 0) {
      return rows[0].map((_, index) => `Columna ${index + 1}`);
    }
    
    return bestHeaderRow;
  }
}