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
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="flex justify-end mb-6">
        <Button
          onClick={handleExportPDF}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-medium px-6 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF</span>
        </Button>
      </div>

      {/* Document Preview */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-8">
          <div className="space-y-6">
            {/* Modern Header */}
            <div className="relative bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
              {/* Logo */}
              <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
                <img 
                  src={brueggenLogo} 
                  alt="Brüggen Logo" 
                  className="h-14 w-auto drop-shadow-sm"
                />
              </div>
              
              {/* Centered Content */}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2 tracking-wide">
                  Product Information
                </h1>
                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-6 py-2 rounded-full inline-block font-semibold text-lg shadow-md">
                  {formData.productNumber || "Recipe Number"}
                </div>
              </div>
              
              {/* Page Number */}
              <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                  <p className="text-sm font-medium text-slate-700">Page 1</p>
                </div>
              </div>
            </div>

            {/* Product Name Section */}
            <div className="bg-gradient-to-r from-white to-slate-50 rounded-lg p-6 border border-slate-200 shadow-sm">
              <div className="text-center">
                <span className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-2 block">Product Name</span>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  {formData.productName || "Product name will appear here..."}
                </h2>
              </div>
            </div>

            {/* Product Image */}
            {formData.productImage && (
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
                  <img
                    src={formData.productImage}
                    alt="Product"
                    className="max-w-xs max-h-48 object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Ingredients Section */}
            <div className="bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-4 py-3">
                <h3 className="font-semibold text-lg">Ingredients</h3>
              </div>
              <div className="p-4">
                <div 
                  className="text-sm leading-relaxed text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: formatIngredients()
                  }}
                />
                <div className="text-xs text-slate-500 italic mt-2 pt-2 border-t border-slate-200">
                  * percentage in ingredient
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs text-blue-800 leading-relaxed font-medium">
                    Quality Assurance: All raw materials and finished products meet current legal requirements. 
                    Mycotoxins, heavy metals, pesticides and other contaminants are within admissible levels 
                    according to applicable legislation.
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Ingredients Table - Only show if ingredients exist */}
            {(formData.ingredients?.some(ing => ing.name.trim()) || formData.baseProductIngredients?.some(ing => ing.name.trim())) && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-3">
                  <h3 className="font-semibold text-lg">Detailed Ingredients Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-left font-semibold text-slate-700">Ingredients</th>
                        <th className="p-3 text-left font-semibold text-slate-700">Percentage content per whole product</th>
                        <th className="p-3 text-left font-semibold text-slate-700">Country of Origin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generateIngredientsTable().map((ingredient, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            {ingredient.isFinalProduct ? (
                              <strong className="text-slate-800">{ingredient.name}</strong>
                            ) : (
                              <span className="text-slate-600">{ingredient.name}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              {ingredient.percentage}%
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{ingredient.origin || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Nutritional Table - Only show if nutrition data exists */}
            {formData.nutrition && (
            <>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3">
                  <h3 className="font-semibold text-lg">Average Nutritional Value</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-left font-semibold text-slate-700">
                          Nutrient
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-700">
                          per 100 g of product
                        </th>
                        <th className="p-3 text-center font-semibold text-slate-700">
                          per {servingSize} g of product
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-800">Energy</td>
                        <td className="p-3 text-center text-slate-700">
                          {formData.nutrition?.energy?.kj || 0} kJ / {formData.nutrition?.energy?.kcal || 0} kcal
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {calculatePerServing(formData.nutrition?.energy?.kj || 0)} kJ / {calculatePerServing(formData.nutrition?.energy?.kcal || 0)} kcal
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-800">Fat</td>
                        <td className="p-3 text-center text-slate-700">
                          {formData.nutrition?.fat || 0} g
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {calculatePerServing(formData.nutrition?.fat || 0)} g
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 pl-6 text-slate-600">of which saturates</td>
                        <td className="p-3 text-center text-slate-700">
                          {formData.nutrition?.saturatedFat || 0} g
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {calculatePerServing(formData.nutrition?.saturatedFat || 0)} g
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-800">Carbohydrates</td>
                        <td className="p-3 text-center text-slate-700">
                          {formData.nutrition?.carbohydrates || 0} g
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {calculatePerServing(formData.nutrition?.carbohydrates || 0)} g
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 pl-6 text-slate-600">of which sugars</td>
                        <td className="p-3 text-center text-slate-700">
                          {formData.nutrition?.sugars || 0} g
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {calculatePerServing(formData.nutrition?.sugars || 0)} g
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-800">Fibre</td>
                        <td className="p-3 text-center text-slate-700">
                          {formData.nutrition?.fiber || 0} g
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {calculatePerServing(formData.nutrition?.fiber || 0)} g
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-800">Protein</td>
                        <td className="p-3 text-center text-slate-700">
                          {formData.nutrition?.protein || 0} g
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {calculatePerServing(formData.nutrition?.protein || 0)} g
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-800">Salt</td>
                        <td className="p-3 text-center text-slate-700">
                          {formData.nutrition?.salt || 0} g
                        </td>
                        <td className="p-3 text-center text-slate-700">
                          {calculatePerServing(formData.nutrition?.salt || 0)} g
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
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
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6 shadow-sm">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg text-green-800 mb-4">Nutri-Score Rating</h3>
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-xl shadow-md">
                        <img 
                          src={getNutriScoreImage(nutriScore.nutriGrade)} 
                          alt={`Nutri-Score ${nutriScore.nutriGrade}`}
                          className="h-20 w-auto"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-green-700 mt-3 font-medium">
                      Grade: {nutriScore.nutriGrade} • Score: {nutriScore.totalScore}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Declarations - Calculated Claims - Only show if nutrition data exists */}
            {formData.nutrition && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-3">
                <h3 className="font-semibold text-lg">Possible Declarations</h3>
              </div>
              <div className="p-4">
                {(() => {
                  if (!formData.nutrition) return (
                    <div className="text-center text-slate-500 py-8">
                      <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No nutrition data available for declarations</p>
                    </div>
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
                      <div className="text-center text-slate-500 py-8">
                        <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No nutritional claims available based on current values</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid gap-2">
                      {claimsToShow.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            {item.claim}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            )}

            {/* Storage Conditions - Only show if storage conditions exist */}
            {formData.storageConditions && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
                  <h3 className="font-semibold text-lg">Storage Conditions</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {formData.storageConditions}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Allergy Advice - Always show in template */}
            <div className="bg-red-50 border-l-4 border-red-400 rounded-r-lg shadow-sm">
              <div className="flex items-start p-4">
                <div className="flex-shrink-0 mr-3">
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-red-800 mb-2">Allergy Advice</h3>
                  <div className="text-sm text-red-800 leading-relaxed whitespace-pre-line">
                    {formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products."}
                  </div>
                </div>
              </div>
            </div>

            {/* Preparation - Only show if preparation exists */}
            {formData.preparation && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3">
                  <h3 className="font-semibold text-lg">Preparation Instructions</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <svg className="w-5 h-5 text-purple-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {formData.preparation}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Valid From Date and Prepared By Section - Footer */}
            <div className="mt-8 bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg p-6 border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Valid From Date */}
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Valid from:</span>
                    <span className="ml-2 text-slate-600">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
                
                {/* Prepared By */}
                {(formData.preparedBy || formData.jobTitle) && (
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Prepared by:</span>
                      <span className="ml-2 text-slate-600">
                        {formData.preparedBy && formData.jobTitle 
                          ? `${formData.preparedBy}, ${formData.jobTitle}`
                          : formData.preparedBy || formData.jobTitle || ''
                        }
                      </span>
                    </div>
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
    </div>
  );
}
