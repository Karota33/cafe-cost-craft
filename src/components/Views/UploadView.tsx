import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle,
  X,
  Download,
  Eye,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  records?: number;
  error?: string;
  createdAt: Date;
}

const SUPPORTED_FORMATS = {
  'text/csv': { icon: FileText, label: 'CSV', color: 'bg-green-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, label: 'Excel', color: 'bg-blue-500' },
  'application/pdf': { icon: FileText, label: 'PDF', color: 'bg-red-500' },
  'image/jpeg': { icon: ImageIcon, label: 'JPEG', color: 'bg-purple-500' },
  'image/png': { icon: ImageIcon, label: 'PNG', color: 'bg-purple-500' },
  'image/webp': { icon: ImageIcon, label: 'WebP', color: 'bg-purple-500' }
};

export const UploadView = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useAuth();

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (!currentOrganization) {
      toast({
        title: "Error",
        description: "Debes seleccionar una empresa antes de subir archivos",
        variant: "destructive"
      });
      return;
    }

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      if (!Object.keys(SUPPORTED_FORMATS).includes(file.type)) {
        toast({
          title: "Formato no soportado",
          description: `El archivo ${file.name} no es un formato válido`,
          variant: "destructive"
        });
        continue;
      }

      const uploadFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'uploading',
        progress: 0,
        createdAt: new Date()
      };

      newFiles.push(uploadFile);
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Upload files to Supabase Storage
    for (let i = 0; i < newFiles.length; i++) {
      const uploadFile = newFiles[i];
      const file = fileList[i];
      
      try {
        setUploading(true);
        
        // Update progress
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, progress: 25 } : f
        ));

        const fileName = `${currentOrganization.organization_id}/${uploadFile.id}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('file-uploads')
          .upload(fileName, file);

        if (error) {
          console.error('Storage error:', error);
          throw new Error(`Error al subir archivo: ${error.message}`);
        }

        // Update progress
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, progress: 75 } : f
        ));

        // Record file upload in database
        const { error: dbError } = await supabase
          .from('file_uploads')
          .insert({
            organization_id: currentOrganization.organization_id,
            file_name: file.name,
            file_type: getFileTypeLabel(file.type),
            file_size: file.size,
            file_path: data.path,
            processing_status: 'pending'
          });

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error(`Error al guardar en base de datos: ${dbError.message}`);
        }

        // Complete upload
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'processing', progress: 100 }
            : f
        ));

        // Simulate processing completion
        setTimeout(() => {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { 
                  ...f, 
                  status: 'completed', 
                  records: Math.floor(Math.random() * 50) + 10 
                }
              : f
          ));
        }, 2000);

        toast({
          title: "Archivo subido",
          description: `${file.name} se ha subido correctamente`,
        });

      } catch (error) {
        console.error('Upload error for file:', file.name, error);
        
        let errorMessage = 'Error desconocido';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
          errorMessage = String((error as any).message);
        }
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'failed', 
                error: errorMessage
              }
            : f
        ));
        
        toast({
          title: "Error al subir archivo",
          description: `No se pudo subir ${file.name}: ${errorMessage}`,
          variant: "destructive"
        });
      } finally {
        setUploading(false);
      }
    }
  }, [toast, currentOrganization]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileTypeLabel = (type: string) => {
    if (type.includes('csv')) return 'CSV';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'XLSX';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('image')) return 'IMAGE';
    return 'UNKNOWN';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />;
    }
  };

  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Ingesta de Archivos</h1>
          <p className="text-muted-foreground mt-1">
            Sube archivos CSV, Excel, PDF o imágenes para extraer datos de proveedores
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Selecciona una empresa
            </h3>
            <p className="text-muted-foreground">
              Debes seleccionar una empresa antes de poder subir archivos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gradient">Ingesta de Archivos</h1>
        <p className="text-muted-foreground mt-1">
          Sube archivos CSV, Excel, PDF o imágenes para extraer datos de proveedores
        </p>
      </div>

      {/* Upload Area */}
      <Card className={`transition-all ${dragActive ? 'border-primary bg-primary/5' : ''}`}>
        <CardContent className="p-8">
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary"
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
            }}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </h3>
            <p className="text-muted-foreground mb-4">
              Formatos soportados: CSV, Excel, PDF, JPEG, PNG, WebP
            </p>
            
            <Label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                Seleccionar archivos
              </Button>
            </Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInput}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {/* Supported Formats */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {Object.entries(SUPPORTED_FORMATS).map(([type, { icon: Icon, label, color }]) => (
              <Badge key={type} variant="secondary" className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Archivos Subidos ({files.length})
            </CardTitle>
            <CardDescription>
              Estado del procesamiento de archivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file) => {
              const format = SUPPORTED_FORMATS[file.type as keyof typeof SUPPORTED_FORMATS];
              const Icon = format?.icon || FileText;
              
              return (
                <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${format?.color || 'bg-gray-500'} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{format?.label || 'Unknown'}</span>
                        {file.records && (
                          <>
                            <span>•</span>
                            <span>{file.records} registros</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(file.status)}
                      <span className="text-sm capitalize">
                        {file.status === 'uploading' ? 'Subiendo' :
                         file.status === 'processing' ? 'Procesando' :
                         file.status === 'completed' ? 'Completado' : 'Error'}
                      </span>
                    </div>

                    {file.status === 'completed' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Processing Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {files.filter(f => f.status === 'completed').length}
              </p>
              <p className="text-sm text-muted-foreground">Completados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">
                {files.filter(f => f.status === 'processing' || f.status === 'uploading').length}
              </p>
              <p className="text-sm text-muted-foreground">Procesando</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">
                {files.filter(f => f.status === 'failed').length}
              </p>
              <p className="text-sm text-muted-foreground">Errores</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">
                {files.reduce((acc, f) => acc + (f.records || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Registros</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};