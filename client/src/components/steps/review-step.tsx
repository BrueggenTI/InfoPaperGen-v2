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
    onUpdate({
      declarations: {
        highFiber: false,
        highProtein: false,
        wholegrain: false,
        ...formData.declarations,
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
                id="highFiber"
                checked={formData.declarations?.highFiber || false}
                onCheckedChange={(checked) => handleDeclarationChange("highFiber", checked as boolean)}
              />
              <label htmlFor="highFiber" className="text-sm text-slate-700">
                Source of fibre / High fibre
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="highProtein"
                checked={formData.declarations?.highProtein || false}
                onCheckedChange={(checked) => handleDeclarationChange("highProtein", checked as boolean)}
              />
              <label htmlFor="highProtein" className="text-sm text-slate-700">
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
                value={formData.declarations?.other || ""}
                onChange={(e) => onUpdate({ 
                  declarations: { 
                    highFiber: false,
                    highProtein: false,
                    wholegrain: false,
                    ...formData.declarations, 
                    other: e.target.value 
                  } 
                })}
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
