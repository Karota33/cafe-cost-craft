import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FileProcessor, ProcessedIngredient } from '@/services/FileProcessor';
import { supabase } from '@/integrations/supabase/client';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
  processedCount?: number;
  failedCount?: number;
}

export const useFileUpload = () => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { currentOrganization } = useAuth();

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!currentOrganization) {
      toast({
        title: "Error",
        description: "No hay organización seleccionada",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    // Inicializar progreso para todos los archivos
    const initialUploads: UploadProgress[] = files.map(file => ({
      fileId: crypto.randomUUID(),
      fileName: file.name,
      progress: 0,
      status: 'pending'
    }));
    
    setUploads(initialUploads);

    try {
      // Procesar archivos secuencialmente para evitar sobrecarga
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadId = initialUploads[i].fileId;

        try {
          // Actualizar estado a subiendo
          setUploads(prev => prev.map(u => 
            u.fileId === uploadId 
              ? { ...u, status: 'uploading', progress: 10 }
              : u
          ));

          // Subir archivo a Storage
          const fileName = `${currentOrganization.id}/${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('file-uploads')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Actualizar progreso de subida
          setUploads(prev => prev.map(u => 
            u.fileId === uploadId 
              ? { ...u, progress: 50 }
              : u
          ));

          // Procesar archivo
          setUploads(prev => prev.map(u => 
            u.fileId === uploadId 
              ? { ...u, status: 'processing', progress: 60 }
              : u
          ));

          const result = await FileProcessor.processFile(file, currentOrganization.id);

          if (result.success && result.data.length > 0) {
            // Guardar ingredientes en la base de datos
            await saveIngredientsToDatabase(result.data, currentOrganization.id);
          }

          // Actualizar estado final
          setUploads(prev => prev.map(u => 
            u.fileId === uploadId 
              ? { 
                  ...u, 
                  status: result.success ? 'completed' : 'failed',
                  progress: 100,
                  processedCount: result.processedCount,
                  failedCount: result.failedCount,
                  error: result.errors[0]
                }
              : u
          ));

          if (result.success) {
            toast({
              title: "Archivo procesado",
              description: `${file.name}: ${result.processedCount} registros importados`
            });
          } else {
            toast({
              title: "Error al procesar",
              description: `${file.name}: ${result.errors[0]}`,
              variant: "destructive"
            });
          }

        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          
          setUploads(prev => prev.map(u => 
            u.fileId === uploadId 
              ? { 
                  ...u, 
                  status: 'failed',
                  progress: 100,
                  error: error instanceof Error ? error.message : 'Error desconocido'
                }
              : u
          ));

          toast({
            title: "Error",
            description: `Error al procesar ${file.name}`,
            variant: "destructive"
          });
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [currentOrganization, toast]);

  const saveIngredientsToDatabase = async (
    ingredients: ProcessedIngredient[], 
    organizationId: string
  ): Promise<void> => {
    const ingredientInserts = ingredients.map(ingredient => ({
      organization_id: organizationId,
      name: ingredient.name,
      category: ingredient.category,
      family: ingredient.family,
      subfamily: ingredient.subfamily,
      area: ingredient.area,
      unit_base: ingredient.unitBase,
      allergens: ingredient.allergens,
      yield_rate: ingredient.yieldRate || 1.0,
      avg_price: ingredient.price,
      last_price_update: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('ingredients')
      .upsert(ingredientInserts, {
        onConflict: 'organization_id,name',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error saving ingredients:', error);
      throw error;
    }
  };

  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);

  const retryUpload = useCallback(async (fileId: string, file: File) => {
    if (!currentOrganization) return;

    setUploads(prev => prev.map(u => 
      u.fileId === fileId 
        ? { ...u, status: 'pending', progress: 0, error: undefined }
        : u
    ));

    await uploadFiles([file]);
  }, [currentOrganization, uploadFiles]);

  return {
    uploads,
    isUploading,
    uploadFiles,
    clearUploads,
    retryUpload
  };
};