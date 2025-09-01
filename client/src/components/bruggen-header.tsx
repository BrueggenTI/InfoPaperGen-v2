import logoPath from "@assets/Brueggen LOGO NEW-RGB_1753871769341.png";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";

interface BruggenHeaderProps {
  onNew?: () => void;
}

export default function BruggenHeader({ onNew }: BruggenHeaderProps) {
  return (
    <header className="hero-bruggen py-2 px-4 mb-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src={logoPath} 
              alt="Brüggen Logo" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-semibold" style={{ color: '#661c31' }}>Create Product Information</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-6 text-white/90 text-sm">
              <span>Professional Documentation</span>
              <span>•</span>
              <span>Nutrition Analysis</span>
              <span>•</span>
              <span>PDF Export</span>
            </div>
            {onNew && (
              <Button
                onClick={onNew}
                variant="secondary"
                className="bg-white text-red-800 hover:bg-gray-200"
              >
                <FilePlus2 className="w-4 h-4 mr-2" />
                New
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}