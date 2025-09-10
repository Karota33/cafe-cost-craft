import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Download,
  Eye,
  MapPin,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WizardStep {
  id: number;
  title: string;
  description: string;
}

interface ExtractedData {
  columns: string[];
  rows: string[][];
  metadata?: {
    fileType: string;
    pages?: number;
    ocrUsed?: boolean;
  };
}

interface ColumnMapping {
  source: string;
  target: string;
  required: boolean;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
  suggestion?: string;
}

interface NormalizedRow {
  producto: string;
  proveedor: string;
  formato: string;
  contenido: number;
  unidad: string;
  precio: number;
  igic: number;
  area: string;
  referencia?: string;
  categoria?: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: 'Subida de Archivo',
    description: 'Sube tu archivo PDF, CSV o Excel para extraer datos'
  },
  {
    id: 2,
    title: 'Mapeo de Columnas',
    description: 'Mapea las columnas del archivo con los campos destino'
  },
  {
    id: 3,
    title: 'Validación y Normalización',
    description: 'Revisa y corrige los datos antes de importar'
  }
];

const TARGET_FIELDS = [
  { key: 'producto', label: 'Producto/Ingrediente', required: true, description: 'Nombre del producto o ingrediente' },
  { key: 'proveedor', label: 'Proveedor', required: true, description: 'Nombre del proveedor' },
  { key: 'formato', label: 'Formato/Descripción', required: false, description: 'Descripción del formato del producto' },
  { key: 'contenido', label: 'Contenido', required: true, description: 'Cantidad o peso del producto' },
  { key: 'unidad', label: 'Unidad', required: true, description: 'Unidad de medida (kg, L, ud, etc.)' },
  { key: 'precio', label: 'Precio', required: true, description: 'Precio del producto' },
  { key: 'igic', label: 'IGIC/IVA (%)', required: false, description: 'Porcentaje de impuesto' },
  { key: 'area', label: 'Área', required: false, description: 'Cocina, Sala o Ambas' },
  { key: 'referencia', label: 'Referencia', required: false, description: 'Código o referencia del producto' },
  { key: 'categoria', label: 'Categoría', required: false, description: 'Categoría del producto' }
];

export const IngestionWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [normalizedData, setNormalizedData] = useState<NormalizedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { currentOrganization } = useAuth();

  // Step 1: File Upload and Extraction
  const handleFileUpload = async (file: File) => {
    if (!currentOrganization) return;

    setUploadedFile(file);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Upload file to storage
      setProgress(25);
      const fileName = `${currentOrganization.organization_id}/${crypto.randomUUID()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('file-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setProgress(50);

      // Record upload in database
      const { data: fileRecord, error: dbError } = await supabase
        .from('file_uploads')
        .insert({
          organization_id: currentOrganization.organization_id,
          file_name: file.name,
          file_type: getFileTypeFromExtension(file.name),
          file_size: file.size,
          file_path: uploadData.path,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setProgress(75);

      // Extract data from file
      const extractionResult = await extractDataFromFile(file, fileRecord.id);
      setExtractedData(extractionResult);

      setProgress(100);
      setCurrentStep(2);

      toast({
        title: 'Archivo procesado',
        description: `Extraídas ${extractionResult.rows.length} filas de datos`,
      });

    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo procesar el archivo',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract data from different file types
  const extractDataFromFile = async (file: File, fileId: string): Promise<ExtractedData> => {
    const extension = file.name.toLowerCase().split('.').pop();

    switch (extension) {
      case 'csv':
        return await extractFromCSV(file);
      case 'xlsx':
      case 'xls':
        return await extractFromExcel(file);
      case 'pdf':
        return await extractFromPDF(file);
      default:
        throw new Error('Formato de archivo no soportado');
    }
  };

  const extractFromCSV = async (file: File): Promise<ExtractedData> => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('El archivo CSV debe tener al menos una fila de encabezado y una de datos');
    }

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));

    return {
      columns: headers,
      rows: rows,
      metadata: { fileType: 'CSV' }
    };
  };

  const parseCSVLine = (line: string): string[] => {
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
  };

  const extractFromExcel = async (file: File): Promise<ExtractedData> => {
    // For MVP, simulate Excel extraction
    // In production, you would use a library like xlsx
    const sampleData = {
      columns: ['Producto', 'Proveedor', 'Precio', 'Unidad', 'Contenido'],
      rows: [
        ['Aceite oliva', 'Proveedor A', '12.50', 'L', '1'],
        ['Harina trigo', 'Proveedor B', '8.90', 'kg', '5']
      ],
      metadata: { fileType: 'Excel' }
    };
    
    return sampleData;
  };

  const extractFromPDF = async (file: File): Promise<ExtractedData> => {
    try {
      // Check if PDF has text (embedded) or needs OCR
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      
      if (text && text.length > 100) {
        // PDF has embedded text, extract table data
        return extractTableFromText(text);
      } else {
        // PDF is scanned, use OCR
        return await extractWithOCR(file);
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('No se pudo extraer datos del PDF');
    }
  };

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    // Using pdfjs-dist to extract text
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configure worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const extractTableFromText = (text: string): ExtractedData => {
    // Heuristic approach to detect table structure
    const lines = text.split('\n').filter(line => line.trim());
    
    // Look for common header patterns
    const headerPatterns = /producto|referencia|descripcion|precio|proveedor|formato|unidad/i;
    const headerLineIndex = lines.findIndex(line => headerPatterns.test(line));
    
    if (headerLineIndex === -1) {
      throw new Error('No se detectaron encabezados de tabla en el PDF');
    }
    
    // Extract headers
    const headerLine = lines[headerLineIndex];
    const headers = headerLine.split(/\s{3,}|\t/).map(h => h.trim()).filter(h => h);
    
    // Extract data rows
    const dataLines = lines.slice(headerLineIndex + 1);
    const rows = dataLines
      .filter(line => line.trim() && !line.match(/^página|^total|^subtotal/i))
      .map(line => {
        // Split by multiple spaces or tabs
        return line.split(/\s{3,}|\t/).map(cell => cell.trim()).filter(cell => cell);
      })
      .filter(row => row.length >= 3); // Filter out rows with too few columns
    
    return {
      columns: headers,
      rows: rows,
      metadata: { fileType: 'PDF', ocrUsed: false }
    };
  };

  const extractWithOCR = async (file: File): Promise<ExtractedData> => {
    const Tesseract = await import('tesseract.js');
    
    try {
      setProgress(30);
      
      const { data: { text } } = await Tesseract.recognize(file, 'spa', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(30 + (m.progress * 40));
          }
        }
      });
      
      setProgress(75);
      
      // Process OCR text to extract table data
      return extractTableFromText(text);
      
    } catch (error) {
      console.error('OCR error:', error);
      throw new Error('Error en el procesamiento OCR');
    }
  };

  const getFileTypeFromExtension = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'csv': return 'CSV';
      case 'xlsx':
      case 'xls': return 'XLSX';
      case 'pdf': return 'PDF';
      default: return 'UNKNOWN';
    }
  };

  // Step 2: Column Mapping
  const handleColumnMapping = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [targetField]: sourceColumn
    }));
  };

  const proceedToValidation = () => {
    if (!extractedData) return;

    // Check required mappings
    const requiredFields = TARGET_FIELDS.filter(f => f.required);
    const missingMappings = requiredFields.filter(f => !columnMappings[f.key]);

    if (missingMappings.length > 0) {
      toast({
        title: 'Mapeo incompleto',
        description: `Faltan campos requeridos: ${missingMappings.map(f => f.label).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    // Normalize and validate data
    const normalized = normalizeData(extractedData, columnMappings);
    setNormalizedData(normalized.data);
    setValidationErrors(normalized.errors);
    setCurrentStep(3);
  };

  // Step 3: Data Normalization and Validation
  const normalizeData = (data: ExtractedData, mappings: Record<string, string>) => {
    const normalizedRows: NormalizedRow[] = [];
    const errors: ValidationError[] = [];

    data.rows.forEach((row, rowIndex) => {
      try {
        const normalizedRow: Partial<NormalizedRow> = {};

        // Map each target field
        TARGET_FIELDS.forEach(field => {
          const sourceColumn = mappings[field.key];
          if (!sourceColumn) return;

          const columnIndex = data.columns.indexOf(sourceColumn);
          if (columnIndex === -1) return;

          const value = row[columnIndex]?.toString().trim() || '';

          // Normalize based on field type
          switch (field.key) {
            case 'precio':
              const precio = parseSpanishNumber(value);
              if (isNaN(precio)) {
                errors.push({
                  row: rowIndex + 1,
                  column: field.label,
                  value,
                  error: 'Precio inválido',
                  suggestion: 'Use formato: 12,50 o 12.50'
                });
              } else {
                normalizedRow.precio = precio;
              }
              break;

            case 'contenido':
              const { amount, unit } = parsePackSize(value);
              if (amount === 0) {
                errors.push({
                  row: rowIndex + 1,
                  column: field.label,
                  value,
                  error: 'Contenido inválido',
                  suggestion: 'Use formato: 500g, 1kg, 750ml, etc.'
                });
              } else {
                normalizedRow.contenido = amount;
                if (!normalizedRow.unidad) {
                  normalizedRow.unidad = unit;
                }
              }
              break;

            case 'igic':
              const igic = parseSpanishNumber(value);
              if (!isNaN(igic)) {
                normalizedRow.igic = igic;
              } else if (value) {
                errors.push({
                  row: rowIndex + 1,
                  column: field.label,
                  value,
                  error: 'IGIC inválido',
                  suggestion: 'Use formato: 7 o 7,0'
                });
              }
              break;

            case 'area':
              const area = normalizeArea(value);
              normalizedRow.area = area;
              break;

            default:
              if (value && field.key in normalizedRow) {
                (normalizedRow as any)[field.key] = value;
              }
          }
        });

        // Validate required fields
        if (!normalizedRow.producto) {
          errors.push({
            row: rowIndex + 1,
            column: 'Producto',
            value: '',
            error: 'Producto requerido'
          });
        }

        if (!normalizedRow.proveedor) {
          errors.push({
            row: rowIndex + 1,
            column: 'Proveedor',
            value: '',
            error: 'Proveedor requerido'
          });
        }

        if (normalizedRow.precio && normalizedRow.contenido) {
          normalizedRows.push(normalizedRow as NormalizedRow);
        }

      } catch (error) {
        errors.push({
          row: rowIndex + 1,
          column: 'General',
          value: '',
          error: 'Error procesando fila'
        });
      }
    });

    return { data: normalizedRows, errors };
  };

  const parseSpanishNumber = (value: string): number => {
    if (!value) return NaN;
    
    // Remove currency symbols and spaces
    const cleaned = value.replace(/[€$\s]/g, '');
    
    // Handle Spanish decimal format (comma as decimal separator)
    const normalized = cleaned.replace(',', '.');
    
    return parseFloat(normalized);
  };

  const parsePackSize = (value: string): { amount: number; unit: string } => {
    if (!value) return { amount: 0, unit: 'ud' };

    // Patterns for pack sizes like "6x1L", "500g", "0,75L", etc.
    const patterns = [
      /(\d+(?:[,\.]\d+)?)\s*x\s*(\d+(?:[,\.]\d+)?)\s*(kg|g|l|ml|ud|u)/i,
      /(\d+(?:[,\.]\d+)?)\s*(kg|g|l|ml|ud|u|litros?|kilos?)/i,
      /(\d+(?:[,\.]\d+)?)/
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) {
        if (pattern.source.includes('x')) {
          // Handle "6x1L" format
          const multiplier = parseSpanishNumber(match[1]);
          const unitAmount = parseSpanishNumber(match[2]);
          const unit = normalizeUnit(match[3]);
          return { amount: multiplier * unitAmount, unit };
        } else {
          const amount = parseSpanishNumber(match[1]);
          const unit = match[2] ? normalizeUnit(match[2]) : 'ud';
          return { amount, unit };
        }
      }
    }

    return { amount: 0, unit: 'ud' };
  };

  const normalizeUnit = (unit: string): string => {
    const unitMap: Record<string, string> = {
      'g': 'g',
      'kg': 'kg',
      'kilo': 'kg',
      'kilos': 'kg',
      'l': 'L',
      'litro': 'L',
      'litros': 'L',
      'ml': 'ml',
      'ud': 'ud',
      'u': 'ud',
      'unidad': 'ud',
      'unidades': 'ud'
    };

    return unitMap[unit.toLowerCase()] || unit.toLowerCase();
  };

  const normalizeArea = (value: string): string => {
    if (!value) return 'both';
    
    const normalized = value.toLowerCase();
    if (normalized.includes('cocina') || normalized.includes('kitchen')) return 'kitchen';
    if (normalized.includes('sala') || normalized.includes('dining') || normalized.includes('hall')) return 'dining';
    return 'both';
  };

  // Final Import
  const executeImport = async () => {
    if (!currentOrganization || normalizedData.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('import-normalized-data', {
        body: {
          organizationId: currentOrganization.organization_id,
          data: normalizedData
        }
      });

      if (error) throw error;

      setProgress(100);
      
      toast({
        title: 'Importación completada',
        description: `${normalizedData.length} productos importados correctamente`,
      });

      // Reset wizard
      setCurrentStep(1);
      setUploadedFile(null);
      setExtractedData(null);
      setColumnMappings({});
      setValidationErrors([]);
      setNormalizedData([]);

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error en la importación',
        description: 'No se pudieron importar los datos',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderUploadStep();
      case 2:
        return renderMappingStep();
      case 3:
        return renderValidationStep();
      default:
        return null;
    }
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Subir Archivo</CardTitle>
        <CardDescription>
          Sube tu archivo PDF, CSV o Excel para extraer datos de productos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
          <div className="space-y-4">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Procesando archivo... {progress}%
            </p>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary"
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (files.length > 0) {
                handleFileUpload(files[0]);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Arrastra un archivo aquí o haz clic para seleccionar
            </h3>
            <p className="text-muted-foreground mb-4">
              Formatos soportados: PDF, CSV, Excel (.xlsx, .xls)
            </p>
            
            <Input
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
              }}
              className="hidden"
              id="file-upload"
            />
            <Label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer">
                Seleccionar archivo
              </Button>
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapeo de Columnas</CardTitle>
          <CardDescription>
            Mapea las columnas de tu archivo con los campos destino
          </CardDescription>
        </CardHeader>
        <CardContent>
          {extractedData && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Se detectaron {extractedData.columns.length} columnas y {extractedData.rows.length} filas de datos.
                  {extractedData.metadata?.ocrUsed && " Se usó OCR para extraer el texto."}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                {TARGET_FIELDS.map(field => (
                  <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <Label className="flex items-center gap-2">
                        {field.label}
                        {field.required && <Badge variant="destructive" className="text-xs">Requerido</Badge>}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {field.description}
                      </p>
                    </div>
                    <div>
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Select 
                        value={columnMappings[field.key] || ''} 
                        onValueChange={(value) => handleColumnMapping(value, field.key)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar columna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin mapear</SelectItem>
                          {extractedData.columns.map(column => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>
                <Button onClick={proceedToValidation}>
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview of mapped data */}
      {extractedData && Object.keys(columnMappings).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>
              Muestra de los primeros 5 registros con el mapeo actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {TARGET_FIELDS.filter(f => columnMappings[f.key]).map(field => (
                    <TableHead key={field.key}>{field.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedData.rows.slice(0, 5).map((row, index) => (
                  <TableRow key={index}>
                    {TARGET_FIELDS.filter(f => columnMappings[f.key]).map(field => {
                      const sourceColumn = columnMappings[field.key];
                      const columnIndex = extractedData.columns.indexOf(sourceColumn);
                      const value = row[columnIndex] || '';
                      return (
                        <TableCell key={field.key} className="max-w-32 truncate">
                          {value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Validación y Normalización</CardTitle>
          <CardDescription>
            Revisa los datos normalizados y corrige errores antes de importar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{normalizedData.length}</div>
                <div className="text-sm text-muted-foreground">Filas válidas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{validationErrors.length}</div>
                <div className="text-sm text-muted-foreground">Errores</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {normalizedData.length > 0 ? Math.round((normalizedData.length / (normalizedData.length + validationErrors.length)) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Éxito</div>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Se encontraron {validationErrors.length} errores que requieren corrección.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <Button 
                onClick={executeImport} 
                disabled={normalizedData.length === 0 || isProcessing}
              >
                {isProcessing ? 'Importando...' : 'Importar Datos'}
                {!isProcessing && <CheckCircle className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Errores de Validación</CardTitle>
            <CardDescription>
              Errores encontrados durante la normalización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Sugerencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationErrors.slice(0, 10).map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>{error.row}</TableCell>
                    <TableCell>{error.column}</TableCell>
                    <TableCell className="max-w-24 truncate">{error.value}</TableCell>
                    <TableCell className="text-destructive">{error.error}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {error.suggestion || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {validationErrors.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando 10 de {validationErrors.length} errores
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Normalized Data Preview */}
      {normalizedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Datos Normalizados</CardTitle>
            <CardDescription>
              Vista previa de los datos que se importarán
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Precio (€)</TableHead>
                  <TableHead>Contenido</TableHead>
                  <TableHead>Precio/Unidad</TableHead>
                  <TableHead>IGIC (%)</TableHead>
                  <TableHead>Área</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {normalizedData.slice(0, 10).map((row, index) => {
                  const pricePerUnit = row.precio / row.contenido;
                  return (
                    <TableRow key={index}>
                      <TableCell className="max-w-32 truncate">{row.producto}</TableCell>
                      <TableCell>{row.proveedor}</TableCell>
                      <TableCell>€{row.precio.toFixed(2)}</TableCell>
                      <TableCell>{row.contenido} {row.unidad}</TableCell>
                      <TableCell>€{pricePerUnit.toFixed(3)}/{row.unidad}</TableCell>
                      <TableCell>{row.igic || 7}%</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {row.area === 'kitchen' ? 'Cocina' : 
                           row.area === 'dining' ? 'Sala' : 'Ambas'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {normalizedData.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando 10 de {normalizedData.length} productos
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Wizard Header */}
      <div>
        <h1 className="text-2xl font-bold text-gradient">Asistente de Ingesta</h1>
        <p className="text-muted-foreground mt-1">
          Importa datos de productos desde archivos PDF, CSV o Excel
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStep >= step.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground max-w-24">
                  {step.description}
                </p>
              </div>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div className={`flex-1 h-px ${
                currentStep > step.id ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      {renderStep()}
    </div>
  );
};