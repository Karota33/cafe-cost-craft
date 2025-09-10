import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  processedCount?: number;
}

interface FileDropzoneProps {
  onFilesProcessed: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  className?: string;
}

const defaultAccept = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/pdf': ['.pdf'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
};

export const FileDropzone = ({ 
  onFilesProcessed, 
  maxFiles = 5,
  accept = defaultAccept,
  className 
}: FileDropzoneProps) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Manejar archivos rechazados
    if (rejectedFiles.length > 0) {
      toast({
        title: "Archivos rechazados",
        description: `${rejectedFiles.length} archivo(s) no son válidos`,
        variant: "destructive"
      });
    }

    // Procesar archivos aceptados
    const newFiles: FileWithPreview[] = acceptedFiles.map(file => ({
      ...file,
      id: `${file.name}-${Date.now()}`,
      status: 'pending',
      progress: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Notificar archivos agregados
    if (newFiles.length > 0) {
      toast({
        title: "Archivos agregados",
        description: `${newFiles.length} archivo(s) listos para procesar`
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId);
      onFilesProcessed(newFiles);
      return newFiles;
    });
  };

  const updateFileStatus = (fileId: string, updates: Partial<FileWithPreview>) => {
    setFiles(prev => {
      const newFiles = prev.map(f => 
        f.id === fileId ? { ...f, ...updates } : f
      );
      onFilesProcessed(newFiles);
      return newFiles;
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('csv') || file.type.includes('excel')) {
      return <FileSpreadsheet className="h-8 w-8 text-success" />;
    }
    if (file.type.includes('pdf')) {
      return <FileText className="h-8 w-8 text-destructive" />;
    }
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-primary" />;
    }
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  };

  const getStatusIcon = (status: FileWithPreview['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <Card 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed transition-all duration-200 cursor-pointer",
          "hover:border-primary hover:bg-muted/50",
          isDragActive && "border-primary bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <Upload className={cn(
            "h-12 w-12 mb-4 transition-colors",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? "Suelta los archivos aquí" : "Subir archivos"}
          </h3>
          <p className="text-muted-foreground mb-4">
            Arrastra archivos aquí o haz clic para seleccionar
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline">CSV</Badge>
            <Badge variant="outline">Excel</Badge>
            <Badge variant="outline">PDF</Badge>
            <Badge variant="outline">Imágenes</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Máximo {maxFiles} archivos, 10MB cada uno
          </p>
        </div>
      </Card>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Archivos ({files.length})</h4>
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border rounded-lg transition-colors hover:bg-muted/50"
              >
                {/* Vista previa / Icono */}
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-12 w-12 object-cover rounded border"
                    />
                  ) : (
                    getFileIcon(file)
                  )}
                </div>

                {/* Información del archivo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {getStatusIcon(file.status)}
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                  </div>

                  {/* Progreso */}
                  {file.status === 'processing' && (
                    <Progress value={file.progress} className="h-2 mb-1" />
                  )}

                  {/* Estado */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {file.status === 'completed' && file.processedCount && (
                      <span className="text-success">
                        {file.processedCount} registros procesados
                      </span>
                    )}
                    {file.status === 'error' && file.error && (
                      <span className="text-destructive">{file.error}</span>
                    )}
                    {file.status === 'pending' && (
                      <span>Listo para procesar</span>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};