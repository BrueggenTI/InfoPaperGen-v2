import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ProductInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { generatePDF } from "@/lib/pdf-generator";

interface DocumentPreviewPageProps {
  sessionId?: string;
}

export default function DocumentPreviewPage({ sessionId }: DocumentPreviewPageProps) {
  const [, setLocation] = useLocation();
  const [urlSessionId, setUrlSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('sessionId');
    if (id) {
      setUrlSessionId(id);
    }
  }, []);

  const currentSessionId = sessionId || urlSessionId;

  // Get session data
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ["/api/product-info/sessions", currentSessionId],
    enabled: !!currentSessionId,
  });

  const formData: ProductInfo = sessionData?.sessionData || {
    productNumber: "",
    productName: "",
    currentStep: 1,
  };

  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  const calculatePerServing = (per100g: number) => {
    return (per100g * servingSize / 100).toFixed(1);
  };

  const formatIngredients = () => {
    if (!formData.ingredients || formData.ingredients.length === 0) {
      return "Crunchy 0,0% [   ], %.";
    }
    
    return formData.ingredients
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` ${ingredient.percentage}%` : '';
        return `${ingredient.name}${percentage}`;
      })
      .join(', ') + '.';
  };

  const handleExportPDF = async () => {
    try {
      await generatePDF(formData);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleBack = () => {
    if (currentSessionId) {
      setLocation(`/?sessionId=${currentSessionId}`);
    } else {
      setLocation('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading preview...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Editor</span>
              </Button>
              <h1 className="text-xl font-semibold text-slate-900">Product Information Preview</h1>
            </div>
            <Button
              onClick={handleExportPDF}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Exact template reproduction */}
          <div className="p-8 font-mono text-sm leading-relaxed">
            
            {/* Product Name and Ingredients Table */}
            <table className="w-full border-collapse border-2 border-black mb-4">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 w-1/5 align-top">
                    Product name:
                  </td>
                  <td className="border border-black p-2">
                    {formData.productName || "Name"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 align-top">
                    Ingredients:
                  </td>
                  <td className="border border-black p-2">
                    <div className="mb-2">{formatIngredients()}</div>
                    <div className="mb-4 text-xs">* percentage in ingredient</div>
                    <div className="text-xs leading-relaxed">
                      The quality of all raw materials used in the manufacture and the 
                      finished product meets the current applicable legal requirements 
                      relating to these products. Admissible levels of mycotoxins, heavy 
                      metal contamination, pesticides and other - in accordance with 
                      applicable legislation.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Nutritional Table */}
            <table className="w-full border-collapse border-2 border-black mb-4">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 align-top" rowSpan={10}>
                    Average<br />nutritional<br />value:
                  </td>
                  <td className="border border-black p-2 text-center font-bold w-1/3"></td>
                  <td className="border border-black p-2 text-center font-bold w-1/3">
                    per 100 g of product
                  </td>
                  <td className="border border-black p-2 text-center font-bold w-1/3">
                    per {servingSize} g of product
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Energy</td>
                  <td className="border border-black p-1 text-center">
                    {formData.nutrition?.energy?.kj || 0} kJ/ {formData.nutrition?.energy?.kcal || 0} kcal
                  </td>
                  <td className="border border-black p-1 text-center">
                    {calculatePerServing(formData.nutrition?.energy?.kj || 0)} kJ/ {calculatePerServing(formData.nutrition?.energy?.kcal || 0)} kcal
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Fat</td>
                  <td className="border border-black p-1 text-center">
                    {formData.nutrition?.fat || 0} g
                  </td>
                  <td className="border border-black p-1 text-center">
                    {calculatePerServing(formData.nutrition?.fat || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">of which saturates</td>
                  <td className="border border-black p-1 text-center">
                    {formData.nutrition?.saturatedFat || 0} g
                  </td>
                  <td className="border border-black p-1 text-center">
                    {calculatePerServing(formData.nutrition?.saturatedFat || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Carbohydrates</td>
                  <td className="border border-black p-1 text-center">
                    {formData.nutrition?.carbohydrates || 0} g
                  </td>
                  <td className="border border-black p-1 text-center">
                    {calculatePerServing(formData.nutrition?.carbohydrates || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">of which sugars</td>
                  <td className="border border-black p-1 text-center">
                    {formData.nutrition?.sugars || 0} g
                  </td>
                  <td className="border border-black p-1 text-center">
                    {calculatePerServing(formData.nutrition?.sugars || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Fibre</td>
                  <td className="border border-black p-1 text-center">
                    {formData.nutrition?.fiber || 0} g
                  </td>
                  <td className="border border-black p-1 text-center">
                    {calculatePerServing(formData.nutrition?.fiber || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Protein</td>
                  <td className="border border-black p-1 text-center">
                    {formData.nutrition?.protein || 0} g
                  </td>
                  <td className="border border-black p-1 text-center">
                    {calculatePerServing(formData.nutrition?.protein || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Salt</td>
                  <td className="border border-black p-1 text-center">
                    {formData.nutrition?.salt || 0} g
                  </td>
                  <td className="border border-black p-1 text-center">
                    {calculatePerServing(formData.nutrition?.salt || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1" colSpan={3}>
                    [pic][pic][pic][pic][pic]
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Nutri-score */}
            <table className="w-full border-collapse border-2 border-black mb-4">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 w-1/5">
                    Nutri-score:
                  </td>
                  <td className="border border-black p-2">
                    {formData.nutriScore || ""}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Possible Declarations */}
            <table className="w-full border-collapse border-2 border-black mb-4">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 w-1/5 align-top" rowSpan={5}>
                    Possible<br />declarations:
                  </td>
                  <td className="border border-black p-1 w-2/3">Source of fibre / High fibre</td>
                  <td className="border border-black p-1 text-center w-1/3">
                    {formData.declarations?.highFiber ? "✓" : "No declaration"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Source of protein / High protein</td>
                  <td className="border border-black p-1 text-center">
                    {formData.declarations?.highProtein ? "✓" : "No declaration"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Content of wholegrain</td>
                  <td className="border border-black p-1 text-center">
                    {formData.declarations?.wholegrain ? "✓" : "No declaration"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Other</td>
                  <td className="border border-black p-1 text-center">
                    {formData.declarations?.other || "No declaration"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1" colSpan={2}></td>
                </tr>
              </tbody>
            </table>

            {/* Additional Information */}
            <table className="w-full border-collapse border-2 border-black mb-4">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 w-1/5">
                    Preparation:
                  </td>
                  <td className="border border-black p-2">
                    {formData.preparation || "Don't apply"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 align-top">
                    Allergy advice:
                  </td>
                  <td className="border border-black p-2">
                    {formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products."}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 align-top">
                    Storage<br />conditions:
                  </td>
                  <td className="border border-black p-2">
                    <div>{formData.storageConditions || "12* months in original packaging unit at about 20°C and relative humidity below 60%."}</div>
                    <div className="mt-2 text-xs">* To confirm on the storage test.</div>
                    <div className="mt-4 text-xs leading-relaxed">
                      The purpose of this product information is to describe a sample made 
                      in the laboratory. Nutritional values are calculated. Minor variations 
                      may occur due to different production conditions during manufacture.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <table className="w-full border-collapse border-2 border-black">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-bold bg-gray-50 w-1/6">
                    Valid from:
                  </td>
                  <td className="border border-black p-2 w-1/3">
                    {new Date().toLocaleDateString('en-GB')}
                  </td>
                  <td className="border border-black p-2 font-bold bg-gray-50 w-1/6">
                    Prepared by:
                  </td>
                  <td className="border border-black p-2 w-1/3">
                    {formData.preparedBy || "Kaja Skorupska"}
                    <br />
                    {formData.jobTitle || "R&D Specialist"}
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>
      </div>
    </div>
  );
}