import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Eye,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessingJob {
  id: string;
  fileName: string;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  processedRecords: number;
  failedRecords: number;
  totalRecords: number;
  startTime: Date;
  endTime?: Date;
  errorMessage?: string;
}

interface ProcessingStatusProps {
  jobs: ProcessingJob[];
  onViewDetails: (jobId: string) => void;
  onDownloadResults: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  className?: string;
}

export const ProcessingStatus = ({
  jobs,
  onViewDetails,
  onDownloadResults,
  onRetry,
  className
}: ProcessingStatusProps) => {
  const getStatusIcon = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'processing':
        return <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: ProcessingJob['status']) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'outline',
      failed: 'destructive'
    } as const;

    const labels = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Error'
    };

    return (
      <Badge variant={variants[status]} className="text-xs">
        {labels[status]}
      </Badge>
    );
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = Math.round((endTime.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.round(duration / 60)}m`;
    return `${Math.round(duration / 3600)}h`;
  };

  const formatFileType = (fileType: string) => {
    const types = {
      csv: 'CSV',
      excel: 'Excel',
      pdf: 'PDF',
      image: 'Imagen'
    };
    return types[fileType as keyof typeof types] || fileType.toUpperCase();
  };

  if (jobs.length === 0) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay archivos procesándose</h3>
        <p className="text-muted-foreground">
          Los archivos aparecerán aquí cuando comiences a procesarlos
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Estado de Procesamiento</h3>
        <Badge variant="outline">
          {jobs.length} archivo{jobs.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="border rounded-lg p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(job.status)}
                  <h4 className="font-medium truncate">{job.fileName}</h4>
                  {getStatusBadge(job.status)}
                  <Badge variant="outline" className="text-xs">
                    {formatFileType(job.fileType)}
                  </Badge>
                </div>

                {/* Progreso */}
                {job.status === 'processing' && (
                  <div className="mb-2">
                    <Progress value={job.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {job.progress}% completado
                    </p>
                  </div>
                )}

                {/* Estadísticas */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {job.status === 'completed' && (
                    <>
                      <span className="text-success">
                        ✓ {job.processedRecords} procesados
                      </span>
                      {job.failedRecords > 0 && (
                        <span className="text-destructive">
                          ✗ {job.failedRecords} errores
                        </span>
                      )}
                    </>
                  )}
                  
                  {job.status === 'failed' && job.errorMessage && (
                    <span className="text-destructive">
                      {job.errorMessage}
                    </span>
                  )}

                  <span>
                    {formatDuration(job.startTime, job.endTime)}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                {job.status === 'completed' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(job.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownloadResults(job.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Descargar
                    </Button>
                  </>
                )}

                {job.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(job.id)}
                  >
                    Reintentar
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};