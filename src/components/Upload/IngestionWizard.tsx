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
import { PdfService } from '@/services/PdfService';
import { OcrService } from '@/services/OcrService';
import { parsePack, normalizeIngredientRow, parseSpanishNumber, type NormalizationResult } from '@/utils/normalization';
import * as XLSX from 'xlsx';

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
    hasText?: boolean;
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
  precioUnitario: number;
  igic: number;
  area: string;
  referencia?: string;
  categoria?: string;
  isValid: boolean;
  errors: string[];
  rowIndex: number;
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
  { key: 'formato', label: 'Formato/Descripción', required: false, description: 'Descripción del formato del producto (ej: "6×1 L", "500 g")' },
  { key: 'contenido', label: 'Contenido/Peso', required: false, description: 'Cantidad o peso del producto (alternativo a formato)' },
  { key: 'unidad', label: 'Unidad', required: false, description: 'Unidad de medida (kg, L, ud, etc.)' },
  { key: 'precio', label: 'Precio', required: true, description: 'Precio del producto' },
  { key: 'igic', label: 'IGIC/IVA (%)', required: false, description: 'Porcentaje de impuesto (por defecto 7%)' },
  { key: 'area', label: 'Área', required: false, description: 'Cocina, Sala o Ambas' },
  { key: 'referencia', label: 'Referencia', required: false, description: 'Código o referencia del producto' },
  { key: 'categoria', label: 'Categoría', required: false, description: 'Categoría del producto' }
];

export const IngestionWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [normalizedData, setNormalizedData] = useState<NormalizedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  // Step 1: File Upload and Processing
  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setIsProcessing(true);
    setProgress(0);
    
    try {
      setProgress(20);
      
      // Save file to Supabase Storage
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${currentOrganization?.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('file-uploads')
        .upload(filePath, uploadedFile);
        
      if (uploadError) throw uploadError;
      
      setProgress(40);
      
      // Record file upload in database
      const { data: fileRecord, error: recordError } = await supabase
        .from('file_uploads')
        .insert({
          file_name: uploadedFile.name,
          file_path: filePath,
          file_type: fileExt || 'unknown',
          file_size: uploadedFile.size,
          organization_id: currentOrganization?.id,
          processing_status: 'processing'
        })
        .select()
        .single();
        
      if (recordError) throw recordError;
      
      setProgress(60);
      
      // Extract data based on file type
      const result = await extractDataFromFile(uploadedFile);
      
      setProgress(80);
      
      if (result.success) {
        setExtractedData(result.data);
        
        // Update file record with extraction results
        await supabase
          .from('file_uploads')
          .update({
            processing_status: 'completed',
            extracted_records: result.data.rows.length,
            extraction_data: {
              columns: result.data.columns,
              rows: result.data.rows.slice(0, 5), // Store sample
              metadata: result.data.metadata
            }
          })
          .eq('id', fileRecord.id);
          
        setProgress(100);
        setCurrentStep(2);
        
        toast({
          title: "Archivo procesado",
          description: `Se extrajeron ${result.data.rows.length} filas de datos`,
        });
      } else {
        throw new Error(result.error || 'Error al procesar archivo');
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error al procesar archivo",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const extractDataFromFile = async (file: File): Promise<{success: boolean, data?: ExtractedData, error?: string}> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    try {
      switch (fileType) {
        case 'pdf':
          return await extractFromPDF(file);
        case 'csv':
          return await extractFromCSV(file);
        case 'xlsx':
        case 'xls':
          return await extractFromExcel(file);
        default:
          return { success: false, error: 'Tipo de archivo no soportado' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al procesar archivo' 
      };
    }
  };

  const extractFromPDF = async (file: File): Promise<{success: boolean, data?: ExtractedData, error?: string}> => {
    try {
      // First try text extraction
      const pdfResult = await PdfService.extractTableData(file);
      
      if (pdfResult.success && pdfResult.data.length > 0) {
        return {
          success: true,
          data: {
            columns: pdfResult.columns,
            rows: pdfResult.data,
            metadata: {
              fileType: 'pdf',
              pages: pdfResult.metadata.pages,
              ocrUsed: false,
              hasText: pdfResult.metadata.hasText
            }
          }
        };
      }
      
      // If text extraction failed, try OCR
      console.log('Text extraction failed, trying OCR...');
      const ocrResult = await OcrService.processPDF(file);
      
      if (ocrResult.success && ocrResult.extractedData.length > 0) {
        // Convert OCR results to tabular format
        const rows = ocrResult.extractedData.map(item => [
          item.ingredient || '',
          '', // proveedor (empty)
          '', // formato
          item.price?.toString() || '',
          item.unit || '',
          '', // igic
          'both' // area
        ]);
        
        return {
          success: true,
          data: {
            columns: ['Producto', 'Proveedor', 'Formato', 'Precio', 'Unidad', 'IGIC', 'Área'],
            rows,
            metadata: {
              fileType: 'pdf',
              ocrUsed: true,
              hasText: false
            }
          }
        };
      }
      
      return { 
        success: false, 
        error: 'No se pudo extraer datos del PDF. El archivo puede estar escaneado y requerir OCR manual.' 
      };
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al procesar PDF' 
      };
    }
  };

  const extractFromCSV = async (file: File): Promise<{success: boolean, data?: ExtractedData, error?: string}> => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        return { success: false, error: 'El archivo CSV está vacío' };
      }
      
      // Parse CSV manually to handle Spanish format
      const rows = lines.map(line => parseCSVLine(line));
      const columns = rows[0] || [];
      const dataRows = rows.slice(1);
      
      return {
        success: true,
        data: {
          columns,
          rows: dataRows,
          metadata: {
            fileType: 'csv'
          }
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al procesar CSV' 
      };
    }
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

  const extractFromExcel = async (file: File): Promise<{success: boolean, data?: ExtractedData, error?: string}> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      
      if (jsonData.length === 0) {
        return { success: false, error: 'El archivo Excel está vacío' };
      }
      
      const columns = jsonData[0] || [];
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell && cell.toString().trim()));
      
      return {
        success: true,
        data: {
          columns,
          rows,
          metadata: {
            fileType: 'excel',
            pages: workbook.SheetNames.length
          }
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al procesar Excel' 
      };
    }
  };

  // Step 2: Column Mapping
  const handleColumnMapping = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev => {
      const existing = prev.find(m => m.source === sourceColumn);
      const targetField_obj = TARGET_FIELDS.find(f => f.key === targetField);
      
      if (existing) {
        existing.target = targetField;
        existing.required = targetField_obj?.required || false;
        return [...prev];
      } else {
        return [...prev, {
          source: sourceColumn,
          target: targetField,
          required: targetField_obj?.required || false
        }];
      }
    });
  };

  const proceedToValidation = () => {
    if (!extractedData) return;
    
    // Check required mappings
    const requiredFields = TARGET_FIELDS.filter(f => f.required);
    const mappedTargets = columnMappings.map(m => m.target);
    const missingRequired = requiredFields.filter(f => !mappedTargets.includes(f.key));
    
    if (missingRequired.length > 0) {
      toast({
        title: "Mapeo incompleto",
        description: `Debes mapear los campos requeridos: ${missingRequired.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Normalize and validate data
    const normalized = normalizeData();
    setNormalizedData(normalized);
    setCurrentStep(3);
  };

  const normalizeData = (): NormalizedRow[] => {
    if (!extractedData) return [];
    
    const errors: ValidationError[] = [];
    const normalized: NormalizedRow[] = [];
    
    extractedData.rows.forEach((row, rowIndex) => {
      // Create mapped row object
      const mappedRow: Record<string, any> = {};
      
      columnMappings.forEach(mapping => {
        const columnIndex = extractedData.columns.indexOf(mapping.source);
        if (columnIndex >= 0 && columnIndex < row.length) {
          mappedRow[mapping.target] = row[columnIndex];
        }
      });
      
      // Add defaults for missing optional fields
      if (!mappedRow.igic) mappedRow.igic = '7';
      if (!mappedRow.area) mappedRow.area = 'both';
      if (!mappedRow.formato && mappedRow.contenido && mappedRow.unidad) {
        mappedRow.formato = `${mappedRow.contenido} ${mappedRow.unidad}`;
      }
      
      // Normalize the row
      const result = normalizeIngredientRow(mappedRow);
      
      if (result.isValid && result.normalized) {
        normalized.push({
          ...result.normalized,
          isValid: true,
          errors: [],
          rowIndex: rowIndex + 1
        });
      } else {
        // Add to errors for display
        result.errors.forEach(error => {
          errors.push({
            row: rowIndex + 1,
            column: 'general',
            value: '',
            error,
            suggestion: 'Revisa los datos de esta fila'
          });
        });
        
        // Still add the row but mark as invalid
        normalized.push({
          producto: mappedRow.producto || '',
          proveedor: mappedRow.proveedor || '',
          formato: mappedRow.formato || '',
          contenido: 0,
          unidad: 'ud',
          precio: 0,
          precioUnitario: 0,
          igic: 7,
          area: 'both',
          referencia: mappedRow.referencia,
          categoria: mappedRow.categoria,
          isValid: false,
          errors: result.errors,
          rowIndex: rowIndex + 1
        });
      }
    });
    
    setValidationErrors(errors);
    return normalized;
  };

  // Step 3: Import Data
  const executeImport = async () => {
    if (!currentOrganization || normalizedData.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Filter only valid rows
      const validRows = normalizedData.filter(row => row.isValid);
      
      if (validRows.length === 0) {
        throw new Error('No hay filas válidas para importar');
      }
      
      // Call Edge Function to import data
      const { data, error } = await supabase.functions.invoke('import-normalized-data', {
        body: {
          organizationId: currentOrganization.id,
          data: validRows
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Importación completada",
        description: `Se importaron ${data.processedCount} productos correctamente`,
      });
      
      // Reset wizard
      setCurrentStep(1);
      setFile(null);
      setExtractedData(null);
      setColumnMappings([]);
      setNormalizedData([]);
      setValidationErrors([]);
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error en la importación",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
        <div className="text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Sube tu archivo</h3>
            <p className="text-muted-foreground">
              Soportamos archivos PDF, CSV y Excel (.xlsx, .xls)
            </p>
          </div>
          <div className="mt-4">
            <input
              type="file"
              accept=".pdf,.csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>Seleccionar archivo</span>
              </Button>
            </label>
          </div>
        </div>
      </div>
      
      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>Procesando archivo...</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}
      
      {file && extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Archivo procesado
            </CardTitle>
            <CardDescription>
              Se extrajeron {extractedData.rows.length} filas de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Archivo:</strong> {file.name}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Tipo:</strong> {extractedData.metadata?.fileType?.toUpperCase()}
                {extractedData.metadata?.ocrUsed && " (OCR utilizado)"}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Columnas detectadas:</strong> {extractedData.columns.join(', ')}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setCurrentStep(2)} className="flex items-center gap-2">
                Continuar <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapeo de Columnas</CardTitle>
          <CardDescription>
            Asigna cada columna del archivo a un campo destino
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {extractedData?.columns.map((column, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{column}</Label>
                  <div className="text-xs text-muted-foreground">
                    Ejemplo: {extractedData.rows[0]?.[index] || 'N/A'}
                  </div>
                </div>
                <div className="flex-1">
                  <Select
                    value={columnMappings.find(m => m.source === column)?.target || 'none'}
                    onValueChange={(value) => value !== 'none' && handleColumnMapping(column, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No mapear</SelectItem>
                      {TARGET_FIELDS.map(field => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle>Vista previa de datos</CardTitle>
            <CardDescription>
              Primeras 5 filas con el mapeo aplicado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {TARGET_FIELDS.filter(f => columnMappings.some(m => m.target === f.key)).map(field => (
                      <TableHead key={field.key}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedData.rows.slice(0, 5).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {TARGET_FIELDS.filter(f => columnMappings.some(m => m.target === f.key)).map(field => {
                        const mapping = columnMappings.find(m => m.target === field.key);
                        const columnIndex = mapping ? extractedData.columns.indexOf(mapping.source) : -1;
                        const value = columnIndex >= 0 ? row[columnIndex] || '' : '';
                        
                        return (
                          <TableCell key={field.key}>{value}</TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" /> Atrás
        </Button>
        <Button onClick={proceedToValidation} className="flex items-center gap-2">
          Validar datos <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      {validationErrors.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Se encontraron {validationErrors.length} errores en los datos. 
            Revisa las filas marcadas y corrige los problemas antes de importar.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {normalizedData.filter(row => row.isValid).length}
                </div>
                <div className="text-sm text-muted-foreground">Filas válidas</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {normalizedData.filter(row => !row.isValid).length}
                </div>
                <div className="text-sm text-muted-foreground">Filas con errores</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {normalizedData.length}
                </div>
                <div className="text-sm text-muted-foreground">Total filas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos normalizados</CardTitle>
          <CardDescription>
            Vista previa de los datos procesados (primeras 10 filas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Precio Unitario</TableHead>
                  <TableHead>Errores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {normalizedData.slice(0, 10).map((row, index) => (
                  <TableRow key={index} className={!row.isValid ? 'bg-red-50' : ''}>
                    <TableCell>{row.rowIndex}</TableCell>
                    <TableCell>
                      {row.isValid ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Válido
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{row.producto}</TableCell>
                    <TableCell>{row.proveedor}</TableCell>
                    <TableCell>{row.formato}</TableCell>
                    <TableCell>{row.precio.toFixed(2)} €</TableCell>
                    <TableCell>
                      {row.precioUnitario > 0 ? `${row.precioUnitario.toFixed(4)} €/${row.unidad}` : '-'}
                    </TableCell>
                    <TableCell>
                      {row.errors.length > 0 && (
                        <div className="text-sm text-red-600">
                          {row.errors.join(', ')}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" /> Atrás
        </Button>
        <Button 
          onClick={executeImport} 
          disabled={isProcessing || normalizedData.filter(row => row.isValid).length === 0}
          className="flex items-center gap-2"
        >
          {isProcessing ? 'Importando...' : `Importar ${normalizedData.filter(row => row.isValid).length} productos`}
        </Button>
      </div>
    </div>
  );

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

  if (!currentOrganization) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Selecciona una empresa
          </h3>
          <p className="text-muted-foreground">
            Debes seleccionar una empresa antes de poder importar datos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gradient">Asistente de Ingesta</h1>
        <p className="text-muted-foreground mt-1">
          Importa datos desde PDFs, CSV y Excel con mapeo automático de columnas
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`h-px w-12 mx-4 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {renderStep()}
    </div>
  );
};