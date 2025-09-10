import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Table, Image, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadFile {
  id: string;
  name: string;
  type: 'csv' | 'excel' | 'pdf' | 'image';
  size: number;
  status: 'uploading' | 'processing' | 'mapping' | 'completed' | 'error';
  progress: number;
  detected?: {
    supplier: string;
    products: number;
    columns: string[];
  };
}

const mockFiles: UploadFile[] = [
  {
    id: "1",
    name: "precios_proveedor_cafe.csv",
    type: "csv",
    size: 24500,
    status: "completed",
    progress: 100,
    detected: {
      supplier: "Distribuidora Café SL",
      products: 24,
      columns: ["producto", "pack", "precio", "descuento", "igic"]
    }
  },
  {
    id: "2", 
    name: "catalogo_lacteos.xlsx",
    type: "excel",
    size: 67200,
    status: "mapping",
    progress: 75,
    detected: {
      supplier: "Lácteos Canarios",
      products: 45,
      columns: ["descripcion", "formato", "unidad", "pvp", "dto"]
    }
  }
];

const fileTypes = [
  {
    type: "csv",
    label: "CSV",
    description: "Archivos separados por comas",
    icon: FileText,
    accept: ".csv",
    color: "bg-success text-success-foreground"
  },
  {
    type: "excel",
    label: "Excel",
    description: "Hojas de cálculo XLSX",
    icon: Table,
    accept: ".xlsx,.xls",
    color: "bg-primary text-primary-foreground"
  },
  {
    type: "pdf",
    label: "PDF",
    description: "Catálogos en PDF (OCR)",
    icon: FileText,
    accept: ".pdf",
    color: "bg-warning text-warning-foreground"
  },
  {
    type: "image",
    label: "Imagen",
    description: "Fotos de catálogos (OCR)",
    icon: Image,
    accept: ".jpg,.jpeg,.png",
    color: "bg-accent text-accent-foreground"
  }
];

const getStatusIcon = (status: UploadFile['status']) => {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4 text-success" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Upload className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: UploadFile['status']) => {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'error':
      return 'text-destructive';
    case 'mapping':
      return 'text-warning';
    default:
      return 'text-muted-foreground';
  }
};

export const UploadView = () => {
  const [dragOver, setDragOver] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gradient">Ingesta de Precios</h1>
        <p className="text-muted-foreground mt-1">
          Sube archivos de proveedores para actualizar tu catálogo
        </p>
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed">
        <CardContent
          className={cn(
            "p-8 text-center transition-colors",
            dragOver && "bg-primary/5 border-primary"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            // Handle file drop
          }}
        >
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Arrastra archivos aquí o haz clic para seleccionar
          </h3>
          <p className="text-muted-foreground mb-6">
            Soporta CSV, Excel, PDF e imágenes con detección automática
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {fileTypes.map((type) => (
              <div key={type.type} className="text-center">
                <div className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-2",
                  type.color
                )}>
                  <type.icon className="h-6 w-6" />
                </div>
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            ))}
          </div>

          <Button size="lg" className="bg-gradient-primary">
            Seleccionar Archivos
          </Button>
        </CardContent>
      </Card>

      {/* Processing Files */}
      {mockFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Archivos en Proceso
            </CardTitle>
            <CardDescription>
              Estado de procesamiento y mapeo de columnas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockFiles.map((file, index) => (
              <div key={file.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} • 
                        <span className={cn("ml-1", getStatusColor(file.status))}>
                          {file.status === 'completed' && 'Completado'}
                          {file.status === 'mapping' && 'Mapeo de columnas'}
                          {file.status === 'processing' && 'Procesando'}
                          {file.status === 'uploading' && 'Subiendo'}
                          {file.status === 'error' && 'Error'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="uppercase text-xs">
                    {file.type}
                  </Badge>
                </div>

                {file.status !== 'completed' && file.status !== 'error' && (
                  <Progress value={file.progress} className="mb-3" />
                )}

                {file.detected && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Proveedor detectado:</span>
                      <span className="text-sm">{file.detected.supplier}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Productos:</span>
                      <span className="text-sm">{file.detected.products}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Columnas detectadas:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {file.detected.columns.map((col, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {file.status === 'mapping' && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="default">
                          Confirmar Mapeo
                        </Button>
                        <Button size="sm" variant="outline">
                          Ajustar Columnas
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {index < mockFiles.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};