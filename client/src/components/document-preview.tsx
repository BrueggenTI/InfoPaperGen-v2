import { ProductInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generatePDF } from "@/lib/pdf-generator";

interface DocumentPreviewProps {
  formData: ProductInfo;
}

export default function DocumentPreview({ formData }: DocumentPreviewProps) {
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  const calculatePerServing = (per100g: number) => {
    return (per100g * servingSize / 100).toFixed(1);
  };

  const formatIngredients = () => {
    const finalIngredients = formData.ingredients || [];
    const baseIngredients = formData.baseProductIngredients || [];
    
    if (finalIngredients.length === 0 && baseIngredients.length === 0) {
      return "Ingredients will appear here after extraction...";
    }
    
    // Format base ingredients for inclusion in brackets (same as Kombinierte Vorschau)
    const baseFormatted = baseIngredients
      .filter(ingredient => ingredient.name.trim() !== "")
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` ${ingredient.percentage}%*` : '';
        return `${ingredient.name}${percentage}`;
      })
      .join(', ');

    // Format final ingredients with base ingredients in brackets (same as Kombinierte Vorschau)
    const finalFormatted = finalIngredients
      .filter(ingredient => ingredient.name.trim() !== "")
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` (${ingredient.percentage}%)` : '';
        const ingredientText = `${ingredient.name}${percentage}`;
        
        // Check if this ingredient is marked as base recipe
        if (ingredient.isMarkedAsBase && baseFormatted) {
          return `${ingredientText} [${baseFormatted}]`;
        }
        
        return ingredientText;
      })
      .join(', ');
    
    return finalFormatted || "Ingredients will appear here after extraction...";
  };

  const handleExportPDF = async () => {
    try {
      await generatePDF(formData);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className="sticky top-24">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Live Preview</h3>
          <Button
            size="sm"
            onClick={handleExportPDF}
            className="text-sm flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        </div>

        {/* Document Preview */}
        <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-inner min-h-[600px] text-xs leading-tight">
          <div className="space-y-4">
            {/* Header Table */}
            <table className="w-full border-collapse border border-slate-400">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50 w-1/4">
                    Product name:
                  </td>
                  <td className="border border-slate-400 p-2">
                    {formData.productName || "Product name will appear here..."}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50">
                    Ingredients:
                  </td>
                  <td className="border border-slate-400 p-2">
                    {formatIngredients()}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs text-slate-600 italic">
              * percentage in ingredient
            </div>

            <div className="text-xs text-slate-700 leading-relaxed">
              The quality of all raw materials used in the manufacture and the
              finished product meets the current applicable legal requirements
              relating to these products. Admissible levels of mycotoxins, heavy
              metal contamination, pesticides and other - in accordance with
              applicable legislation.
            </div>

            {/* Nutritional Table */}
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50" rowSpan={3}>
                    Average nutritional value:
                  </td>
                  <td className="border border-slate-400 p-2 text-center font-semibold">
                    per 100 g of product
                  </td>
                  <td className="border border-slate-400 p-2 text-center font-semibold">
                    per {servingSize} g of product
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">Energy</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.energy?.kj || 0} kJ / {formData.nutrition?.energy?.kcal || 0} kcal
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.energy?.kj || 0)} kJ / {calculatePerServing(formData.nutrition?.energy?.kcal || 0)} kcal
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">Fat</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.fat || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.fat || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1"></td>
                  <td className="border border-slate-400 p-1">of which saturates</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.saturatedFat || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.saturatedFat || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1"></td>
                  <td className="border border-slate-400 p-1">Carbohydrates</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.carbohydrates || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.carbohydrates || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1"></td>
                  <td className="border border-slate-400 p-1">of which sugars</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.sugars || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.sugars || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1"></td>
                  <td className="border border-slate-400 p-1">Fibre</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.fiber || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.fiber || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1"></td>
                  <td className="border border-slate-400 p-1">Protein</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.protein || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.protein || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1"></td>
                  <td className="border border-slate-400 p-1">Salt</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.salt || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.salt || 0)} g
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Nutri-score */}
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50">
                    Nutri-score:
                  </td>
                  <td className="border border-slate-400 p-2">
                    {formData.nutriScore || ""}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Declarations */}
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50 align-top" rowSpan={4}>
                    Possible declarations:
                  </td>
                  <td className="border border-slate-400 p-1">Source of fibre / High fibre</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.declarations?.highFiber ? "✓" : "No declaration"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">Source of protein / High protein</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.declarations?.highProtein ? "✓" : "No declaration"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">Content of wholegrain</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.declarations?.wholegrain ? "✓" : "No declaration"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">Other</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.declarations?.other || "No declaration"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Additional Information */}
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50">
                    Preparation:
                  </td>
                  <td className="border border-slate-400 p-2">
                    {formData.preparation || "Don't apply"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50">
                    Allergy advice:
                  </td>
                  <td className="border border-slate-400 p-2">
                    {formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products."}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50">
                    Storage conditions:
                  </td>
                  <td className="border border-slate-400 p-2">
                    {formData.storageConditions || "12 months in original packaging unit at about 20°C and relative humidity below 60%."}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50">
                    Valid from:
                  </td>
                  <td className="border border-slate-400 p-2">
                    {new Date().toLocaleDateString('en-GB')}
                  </td>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50">
                    Prepared by:
                  </td>
                  <td className="border border-slate-400 p-2">
                    {formData.preparedBy || ""}
                    {formData.jobTitle && (
                      <>
                        <br />
                        {formData.jobTitle}
                      </>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs text-slate-600 italic leading-relaxed mt-4">
              The purpose of this product information is to describe a sample made
              in the laboratory. Nutritional values are calculated. Minor variations
              may occur due to different production conditions during manufacture.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
