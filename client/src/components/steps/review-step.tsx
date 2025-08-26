import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, Download } from "lucide-react";
import { generatePDF } from "@/lib/pdf-generator";

interface ReviewStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onPrev: () => void;
  isLoading?: boolean;
}

export default function ReviewStep({
  formData,
  onUpdate,
  onPrev,
  isLoading = false,
}: ReviewStepProps) {
  const handleExportPDF = async () => {
    try {
      await generatePDF(formData);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleDeclarationChange = (field: string, checked: boolean) => {
    const currentDeclarations = formData.declarations || {
      sourceOfProtein: false,
      highInProtein: false,
      sourceOfFiber: false,
      highInFiber: false,
      wholegrain: false,
      manualClaims: [],
    };
    onUpdate({
      declarations: {
        ...currentDeclarations,
        [field]: checked,
      },
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Review & Additional Information</h2>
        <p className="text-slate-600">
          Review your product information and add final details before generating the document.
        </p>
      </div>

      <div className="space-y-6">
        {/* Nutri-Score */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nutri-Score</label>
          <Input
            value={formData.nutriScore || ""}
            onChange={(e) => onUpdate({ nutriScore: e.target.value })}
            placeholder="e.g., B"
            className="max-w-20"
            disabled={isLoading}
          />
        </div>

        {/* Possible Declarations */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Possible Declarations</label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="highInFiber"
                checked={formData.declarations?.highInFiber || false}
                onCheckedChange={(checked) => handleDeclarationChange("highInFiber", checked as boolean)}
              />
              <label htmlFor="highInFiber" className="text-sm text-slate-700">
                Source of fibre / High fibre
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="highInProtein"
                checked={formData.declarations?.highInProtein || false}
                onCheckedChange={(checked) => handleDeclarationChange("highInProtein", checked as boolean)}
              />
              <label htmlFor="highInProtein" className="text-sm text-slate-700">
                Source of protein / High protein
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="wholegrain"
                checked={formData.declarations?.wholegrain || false}
                onCheckedChange={(checked) => handleDeclarationChange("wholegrain", checked as boolean)}
              />
              <label htmlFor="wholegrain" className="text-sm text-slate-700">
                Content of wholegrain
              </label>
            </div>
            <div>
              <Input
                value={formData.declarations?.manualClaims?.[0]?.text || ""}
                onChange={(e) => {
                  const currentDeclarations = formData.declarations || {
                    sourceOfProtein: false,
                    highInProtein: false,
                    sourceOfFiber: false,
                    highInFiber: false,
                    wholegrain: false,
                    manualClaims: [],
                  };
                  const manualClaims = [...(currentDeclarations.manualClaims || [])];
                  if (manualClaims.length > 0) {
                    manualClaims[0].text = e.target.value;
                  } else {
                    manualClaims.push({ id: "manual-1", text: e.target.value, isActive: true });
                  }
                  onUpdate({
                    declarations: {
                      ...currentDeclarations,
                      manualClaims,
                    },
                  });
                }}
                placeholder="Other declarations..."
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Preparation */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Preparation</label>
          <Input
            value={formData.preparation || ""}
            onChange={(e) => onUpdate({ preparation: e.target.value })}
            placeholder="e.g., Ready to eat, Don't apply"
            disabled={isLoading}
          />
        </div>

        {/* Allergy Advice */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Allergy Advice</label>
          <Textarea
            value={formData.allergyAdvice || ""}
            onChange={(e) => onUpdate({ allergyAdvice: e.target.value })}
            placeholder="Product contains allergen ingredients according to ingredient list..."
            rows={3}
            className="resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Storage Conditions */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Storage Conditions</label>
          <Textarea
            value={formData.storageConditions || ""}
            onChange={(e) => onUpdate({ storageConditions: e.target.value })}
            placeholder="12 months in original packaging unit at about 20°C and relative humidity below 60%..."
            rows={3}
            className="resize-none"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={onPrev}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        
        <Button 
          onClick={handleExportPDF}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF</span>
        </Button>
      </div>
    </div>
  );
}
