import React from 'react';
import { IngestionWizard } from '@/components/Upload/IngestionWizard';
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const UploadView: React.FC = () => {
  const { currentOrganization } = useAuth();


  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Ingesta de Archivos</h1>
          <p className="text-muted-foreground mt-1">
            Asistente completo para importar datos desde PDFs, CSV y Excel
          </p>
        </div>
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
      </div>
    );
  }

  return <IngestionWizard />;
};