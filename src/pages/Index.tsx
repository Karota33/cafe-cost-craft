import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { Navigation } from "@/components/Layout/Navigation";
import { UploadView } from "@/components/Views/UploadView";
import { CatalogView } from "@/components/Views/CatalogView";
import { ComparisonView } from "@/components/Views/ComparisonView";
import { SuppliersView } from "@/components/Views/SuppliersView";

const Index = () => {
  const [activeView, setActiveView] = useState("upload");

  const renderActiveView = () => {
    switch (activeView) {
      case "upload":
        return <UploadView />;
      case "catalog":
        return <CatalogView />;
      case "comparison":
        return <ComparisonView />;
      case "suppliers":
        return <SuppliersView />;
      case "recipes":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gradient mb-4">Recetas y Escandallos</h2>
            <p className="text-muted-foreground">Módulo de recetas PREP/PLATE en desarrollo</p>
          </div>
        );
      case "purchases":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gradient mb-4">Compras por Área</h2>
            <p className="text-muted-foreground">Módulo de compras en desarrollo</p>
          </div>
        );
      default:
        return <UploadView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <div className="section-padding content-width">
        <div className="grid lg:grid-cols-4 gap-6 py-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Navigation
              activeView={activeView}
              onViewChange={setActiveView}
              className="sticky top-24"
            />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderActiveView()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;