import { ProductInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generatePDF } from "@/lib/pdf-generator";
import brueggenLogo from "@/assets/brueggen-logo.png";
import { calculateNutriScore, getNutriScoreColor, getNutriScoreImage } from "@/lib/nutri-score";
import { calculateClaims, getValidClaims } from "@/lib/claims-calculator";

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
        // Use current displayed name (which could be translated)
        return `${ingredient.name}${percentage}`;
      })
      .join(', ');

    // Format final ingredients with base ingredients in brackets (same as Kombinierte Vorschau)
    const finalFormatted = finalIngredients
      .filter(ingredient => ingredient.name.trim() !== "")
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` (${ingredient.percentage}%)` : '';
        // Use current displayed name (which could be translated)
        const ingredientText = `<strong>${ingredient.name}${percentage}</strong>`;
        
        // Check if this ingredient is marked as base recipe
        if (ingredient.isMarkedAsBase && baseFormatted) {
          return `${ingredientText} [${baseFormatted}]`;
        }
        
        return ingredientText;
      })
      .join(', ');
    
    return finalFormatted || "Ingredients will appear here after extraction...";
  };

  // Calculate percentage from base product to whole product using the same formula as ingredients-step
  const calculateWholeProductPercentage = (basePercentage: number, markedIngredientPercentage: number) => {
    return +((basePercentage * markedIngredientPercentage) / 100).toFixed(1);
  };

  // Extract base product percentage from marked ingredient
  const getMarkedIngredientPercentage = () => {
    const markedIngredient = (formData.ingredients || []).find(ing => ing.isMarkedAsBase);
    return markedIngredient?.percentage || 0;
  };

  const generateIngredientsTable = (): Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> => {
    const finalIngredients = formData.ingredients || [];
    const baseIngredients = formData.baseProductIngredients || [];
    const markedIngredientPercentage = getMarkedIngredientPercentage();
    const tableIngredients: Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> = [];

    // Add final product ingredients in the same order as they appear
    finalIngredients
      .filter(ing => ing.name.trim())
      .forEach(ing => {
        if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
          // First add the marked ingredient itself
          tableIngredients.push({
            name: ing.name,
            percentage: ing.percentage || 0,
            origin: ing.origin || "",
            isFinalProduct: true
          });
          
          // Then add base product ingredients with recalculated percentages
          baseIngredients
            .filter(baseIng => baseIng.name.trim())
            .forEach(baseIng => {
              const wholeProductPercentage = baseIng.percentage 
                ? calculateWholeProductPercentage(baseIng.percentage, markedIngredientPercentage)
                : 0;
              tableIngredients.push({
                name: baseIng.name,
                percentage: wholeProductPercentage,
                origin: baseIng.origin || "",
                isFinalProduct: false
              });
            });
        } else {
          // Add regular final product ingredient
          tableIngredients.push({
            name: ing.name,
            percentage: ing.percentage || 0,
            origin: ing.origin || "",
            isFinalProduct: true
          });
        }
      });

    return tableIngredients;
  };

  const handleExportPDF = async () => {
    try {
      await generatePDF(formData);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleExportPDF}
          className="btn-bruggen flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF</span>
        </Button>
      </div>

      {/* Document Preview */}
      <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-inner min-h-[600px] text-xs leading-tight">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                <img 
                  src={brueggenLogo} 
                  alt="Brüggen Logo" 
                  className="h-12 w-auto"
                />
              </div>
              
              {/* Center - Product Information and Recipe Number */}
              <div className="flex-1 text-center">
                <h1 className="text-sm font-medium text-slate-600 mb-1">Product Information</h1>
                <p className="text-lg font-bold text-slate-900">
                  {formData.productNumber || "Recipe Number"}
                </p>
              </div>
              
              {/* Right - Page Number */}
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-medium text-slate-700">Page 1</p>
              </div>
            </div>

            {/* Product Name Section */}
            <div className="flex items-center justify-between mb-6">
              {/* Left - "Product name:" label */}
              <div className="flex-shrink-0">
                <span className="text-lg font-medium text-slate-700">Product name:</span>
              </div>
              
              {/* Center - Product Name */}
              <div className="flex-1 text-center">
                <h2 className="text-lg font-bold" style={{ color: '#e2bc54' }}>
                  {formData.productName || "Product name will appear here..."}
                </h2>
              </div>
              
              {/* Right - Empty space for balance */}
              <div className="flex-shrink-0 w-32"></div>
            </div>

            {/* Product Image */}
            {formData.productImage && (
              <div className="flex justify-center mb-6">
                <img
                  src={formData.productImage}
                  alt="Product"
                  className="max-w-xs max-h-48 object-contain rounded-lg shadow-sm border border-slate-200"
                />
              </div>
            )}

            {/* Ingredients Table */}
            <table className="w-full border-collapse border border-slate-400">
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-2 font-semibold bg-slate-50">
                    Ingredients:
                  </td>
                  <td 
                    className="border border-slate-400 p-2"
                    dangerouslySetInnerHTML={{
                      __html: formatIngredients()
                    }}
                  />
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

            {/* Detailed Ingredients Table - Only show if ingredients exist */}
            {(formData.ingredients?.some(ing => ing.name.trim()) || formData.baseProductIngredients?.some(ing => ing.name.trim())) && (
              <table className="w-full border-collapse border border-slate-400 text-xs mt-4">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-400 p-2 text-left font-semibold">Ingredients</th>
                    <th className="border border-slate-400 p-2 text-left font-semibold">Percentage content per whole product</th>
                    <th className="border border-slate-400 p-2 text-left font-semibold">Country of Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {generateIngredientsTable().map((ingredient, index) => (
                    <tr key={index}>
                      <td className="border border-slate-400 p-2">
                        {ingredient.isFinalProduct ? (
                          <strong>{ingredient.name}</strong>
                        ) : (
                          ingredient.name
                        )}
                      </td>
                      <td className="border border-slate-400 p-2">{ingredient.percentage}%</td>
                      <td className="border border-slate-400 p-2">{ingredient.origin || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Nutritional Table - Only show if nutrition data exists */}
            {formData.nutrition && (
            <>
              <div className="mb-2">
                <h4 className="text-sm font-semibold">Average nutritional value:</h4>
              </div>
              <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-400 p-2 text-left font-semibold bg-slate-50">
                    {/* Nutrient names column */}
                  </th>
                  <th className="border border-slate-400 p-2 text-center font-semibold bg-slate-50">
                    per 100 g of product
                  </th>
                  <th className="border border-slate-400 p-2 text-center font-semibold bg-slate-50">
                    per {servingSize} g of product
                  </th>
                </tr>
              </thead>
              <tbody>
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
                  <td className="border border-slate-400 p-1">of which saturates</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.saturatedFat || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.saturatedFat || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">Carbohydrates</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.carbohydrates || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.carbohydrates || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">of which sugars</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.sugars || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.sugars || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">Fibre</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.fiber || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.fiber || 0)} g
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-1">Protein</td>
                  <td className="border border-slate-400 p-1 text-center">
                    {formData.nutrition?.protein || 0} g
                  </td>
                  <td className="border border-slate-400 p-1 text-center">
                    {calculatePerServing(formData.nutrition?.protein || 0)} g
                  </td>
                </tr>
                <tr>
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
            </>
            )}

            {/* Nutri-Score Display - Only show if nutrition data exists */}
            {formData.nutrition && (() => {
              const nutriScore = calculateNutriScore({
                energy: formData.nutrition.energy || { kj: 0, kcal: 0 },
                fat: formData.nutrition.fat || 0,
                saturatedFat: formData.nutrition.saturatedFat || 0,
                carbohydrates: formData.nutrition.carbohydrates || 0,
                sugars: formData.nutrition.sugars || 0,
                fiber: formData.nutrition.fiber || 0,
                protein: formData.nutrition.protein || 0,
                salt: formData.nutrition.salt || 0,
                fruitVegLegumeContent: formData.nutrition.fruitVegLegumeContent || 0
              });

              return (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Nutri-Score</h3>
                  <div className="flex justify-center">
                    <img 
                      src={getNutriScoreImage(nutriScore.nutriGrade)} 
                      alt={`Nutri-Score ${nutriScore.nutriGrade}`}
                      className="h-16 w-auto"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Declarations - Calculated Claims - Only show if nutrition data exists */}
            {formData.nutrition && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Possible declarations</h3>
              {(() => {
                if (!formData.nutrition) return (
                  <table className="w-full border-collapse border border-slate-400 text-xs">
                    <tbody>
                      <tr>
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
                );

                const claimsResult = calculateClaims({
                  protein: formData.nutrition.protein || 0,
                  fiber: formData.nutrition.fiber || 0,
                  salt: formData.nutrition.salt || 0,
                  sugars: formData.nutrition.sugars || 0,
                  fat: formData.nutrition.fat || 0,
                  saturatedFat: formData.nutrition.saturatedFat || 0
                });

                const allPossibleClaims = [
                  { label: "Source of fibre / High fibre", claim: claimsResult.fiber.bestClaim },
                  { label: "Source of protein / High protein", claim: claimsResult.protein.bestClaim },
                  { label: "Low/Free salt", claim: claimsResult.salt.bestClaim },
                  { label: "Low/Free sugar", claim: claimsResult.sugar.bestClaim },
                  { label: "Low/Free fat", claim: claimsResult.fat.bestClaim },
                  { label: "Low saturated fat", claim: claimsResult.saturatedFat.bestClaim }
                ];

                const claimsToShow = allPossibleClaims.filter(item => item.claim);
                
                // Add wholegrain and other manual declarations
                if (formData.declarations?.wholegrain) {
                  claimsToShow.push({ label: "Content of wholegrain", claim: "✓" });
                }
                if (formData.declarations?.other) {
                  claimsToShow.push({ label: "Other", claim: formData.declarations.other });
                }

                if (claimsToShow.length === 0) {
                  return (
                    <table className="w-full border-collapse border border-slate-400 text-xs">
                      <tbody>
                        <tr>
                          <td className="border border-slate-400 p-2">
                            No claims available
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  );
                }

                return (
                  <table className="w-full border-collapse border border-slate-400 text-xs">
                    <tbody>
                      {claimsToShow.map((item, index) => (
                        <tr key={index}>
                          <td className="border border-slate-400 p-1">{item.label}</td>
                          <td className="border border-slate-400 p-1 text-center font-medium text-green-600">
                            {item.claim}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
            )}

            {/* Storage Conditions - Only show if storage conditions exist */}
            {formData.storageConditions && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Storage Conditions</h3>
                <table className="w-full border-collapse border border-slate-400 text-xs">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2 whitespace-pre-line">
                        {formData.storageConditions}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Allergy Advice - Always show in template */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Allergy Advice</h3>
              <table className="w-full border-collapse border border-slate-400 text-xs">
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2 whitespace-pre-line">
                      {formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products."}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Preparation - Only show if preparation exists */}
            {formData.preparation && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Preparation</h3>
                <table className="w-full border-collapse border border-slate-400 text-xs">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2 whitespace-pre-line">
                        {formData.preparation}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Valid From Date and Prepared By Section - Footer */}
            <div className="mt-8 pt-4 border-t border-slate-300">
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Valid From Date */}
                <div>
                  <span className="font-semibold">Valid from:</span>
                  <span className="ml-2">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
                
                {/* Prepared By */}
                {(formData.preparedBy || formData.jobTitle) && (
                  <div>
                    <span className="font-semibold">Prepared by:</span>
                    <span className="ml-2">
                      {formData.preparedBy && formData.jobTitle 
                        ? `${formData.preparedBy}, ${formData.jobTitle}`
                        : formData.preparedBy || formData.jobTitle || ''
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-600 italic leading-relaxed mt-4">
              The purpose of this product information is to describe a sample made
              in the laboratory. Nutritional values are calculated. Minor variations
              may occur due to different production conditions during manufacture.
            </div>
          </div>
        </div>
    </div>
  );
}
