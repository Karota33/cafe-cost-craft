import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coffee, Menu, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  igic: number;
}

const mockOrganizations: Organization[] = [
  { id: "1", name: "Café Central", igic: 7 },
  { id: "2", name: "Demo Organization", igic: 7 },
];

interface HeaderProps {
  className?: string;
}

export const Header = ({ className }: HeaderProps) => {
  const [selectedOrg, setSelectedOrg] = useState<string>("1");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <Card className={cn(
      "sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60",
      className
    )}>
      <div className="section-padding content-width">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
              <Coffee className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gradient">CafeteríaPWA</h1>
              <p className="text-xs text-muted-foreground">Gestión Inteligente</p>
            </div>
          </div>

          {/* Organization Selector */}
          <div className="flex-1 max-w-xs mx-4">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="h-10 bg-background/50">
                <SelectValue placeholder="Seleccionar organización" />
              </SelectTrigger>
              <SelectContent>
                {mockOrganizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{org.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        IGIC {org.igic}%
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <User className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="sm:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="border-t pt-4 pb-2 sm:hidden">
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="sm" className="justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                <User className="h-4 w-4 mr-2" />
                Perfil
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};