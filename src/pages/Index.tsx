import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { Navigation } from "@/components/Layout/Navigation";
import { UploadView } from "@/components/Views/UploadView";
import { CatalogView } from "@/components/Views/CatalogView";
import { ComparisonView } from "@/components/Views/ComparisonView";
import { SuppliersView } from "@/components/Views/SuppliersView";
import { RecipesView } from "@/components/Views/RecipesView";
import { HRView } from "@/components/Views/HRView";
import UsersPage from "@/pages/UsersPage";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardMetrics } from "@/components/Dashboard/DashboardMetrics";

const Index = () => {
  const { currentOrganization } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");

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
        return <RecipesView />;
      case "users":
        return <UsersPage />;
      case "hr":
        return <HRView />;
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gradient">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Resumen y métricas clave de {currentOrganization?.organization?.name}
              </p>
            </div>
            <DashboardMetrics />
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
        return <CatalogView />;
    }
  };

  // Redirect to organizations if no current organization
  if (!currentOrganization) {
    window.location.href = '/organizations';
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

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