import { ProductInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2, Eye, EyeOff } from "lucide-react";
import { downloadPDFFromServer } from "@/lib/server-pdf-generator";
import brueggenLogo from "@/assets/brueggen-logo.png";
import { getNutriScoreImage, calculateNutriScore } from "@/lib/nutri-score";
import { useState, useMemo, useCallback } from "react";
import { generateIngredientsTable, formatCombinedIngredients } from "@/lib/ingredient-utils";
import "@/styles/pdf-preview.css";

interface DocumentPreviewProps {
  formData: ProductInfo;
  sessionId?: string;
  isPDFMode?: boolean;
}

export default function DocumentPreview({ formData, sessionId, isPDFMode = false }: DocumentPreviewProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showCountryOfOrigin, setShowCountryOfOrigin] = useState(true);

  const handleDownloadPDF = async () => {
    if (!sessionId) {
      alert('A session ID is not available. Please reload the page.');
      return;
    }
    if (!formData) {
      alert('Form data is not available. Please fill out the form.');
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const pdfFormData = { ...formData, showCountryOfOriginInPDF: showCountryOfOrigin };
      await downloadPDFFromServer({ formData: pdfFormData, sessionId: sessionId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while creating the PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const { claimsToShow, nutriScoreData } = useMemo(() => {
    if (!formData.nutrition) return { claimsToShow: [], nutriScoreData: null };

    const nutriScore = calculateNutriScore(formData.nutrition);

    const claims: Array<{ label: string; claim: string }> = [];
    if (formData.declarations?.sourceOfProtein) claims.push({ label: "Source of protein", claim: "✓" });
    if (formData.declarations?.highInProtein) claims.push({ label: "High protein", claim: "✓" });
    if (formData.declarations?.sourceOfFiber) claims.push({ label: "Source of fibre", claim: "✓" });
    if (formData.declarations?.highInFiber) claims.push({ label: "High fibre", claim: "✓" });
    if (formData.declarations?.wholegrainPercentage && formData.declarations.wholegrainPercentage > 0) {
      claims.push({ label: "Content of wholegrain", claim: `${formData.declarations.wholegrainPercentage}%` });
    }
    if (formData.declarations?.manualClaims) {
      formData.declarations.manualClaims
        .filter(claim => claim.isActive)
        .forEach(claim => claims.push({ label: claim.text, claim: "✓" }));
    }
    return { claimsToShow: claims, nutriScoreData: nutriScore };
  }, [formData.nutrition, formData.declarations]);

  const servingSize = useMemo(() => parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40'), [formData.servingSize]);
  const calculatePerServing = useCallback((per100g: number) => (per100g * servingSize / 100).toFixed(1), [servingSize]);

  const formattedIngredients = useMemo(() => {
    return formatCombinedIngredients(formData).replace('<strong>Ingredients:</strong>', '');
  }, [formData.ingredients, formData.baseProductIngredients]);

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border">
          <Checkbox id="show-origin" checked={showCountryOfOrigin} onCheckedChange={() => setShowCountryOfOrigin(!showCountryOfOrigin)} />
          <Label htmlFor="show-origin" className="text-sm font-medium cursor-pointer flex items-center gap-2">
            {showCountryOfOrigin ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Show Country of Origin
          </Label>
        </div>
        <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium px-6 py-2.5 rounded-lg shadow-lg">
          {isGeneratingPDF ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</> : <><Download className="w-4 h-4 mr-2" />Download PDF</>}
        </Button>
      </div>

      <div id="document-preview-content" className="pdf-preview-container bg-white rounded-xl shadow-2xl border border-slate-200">
        <div className="header">
          <img src={brueggenLogo} alt="Logo" style={{ height: '35px', width: 'auto', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <div className="header-content">
            <h1>Product Information</h1>
            <div className="product-number">{formData.productNumber || "Recipe number"}</div>
          </div>
          <div className="page-number">Page 1</div>
        </div>

        <div className="product-name-section">
          <span className="product-name-label">Product name</span>
          <h2 className="product-name">{formData.productName || "Product name will appear here..."}</h2>
        </div>

        <div className="section">
          <div className="section-header"><h3 className="section-title">Ingredients</h3></div>
          <div className="section-content">
            <div className="ingredients-content" dangerouslySetInnerHTML={{ __html: formattedIngredients }} />
            <div className="ingredients-note">* percentage in ingredient</div>
          </div>
        </div>

        <div className="warning-box">
          <p className="warning-text">The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.</p>
        </div>

        {(formData.ingredients?.length || 0) > 0 &&
          <div className="section">
            <div className="section-header"><h3 className="section-title">Detailed ingredients breakdown</h3></div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ingredients</th>
                    <th>Percentage content per whole product</th>
                    {showCountryOfOrigin && <th>Country of Origin</th>}
                  </tr>
                </thead>
                <tbody>
                  {generateIngredientsTable(formData).map((ing, index) => (
                    <tr key={index}>
                      <td className={ing.isFinalProduct ? '' : 'base-ingredient'}>
                        {ing.isFinalProduct ? <strong>{ing.name}</strong> : ing.name}
                      </td>
                      <td>{ing.percentage}%</td>
                      {showCountryOfOrigin && <td>{ing.origin || "-"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        }

        {formData.nutrition && (
          <>
            <div className="section">
              <div className="section-header"><h3 className="section-title">Average nutritional value</h3></div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Nutrient</th><th style={{textAlign: 'center'}}>per 100 g</th><th style={{textAlign: 'center'}}>per {servingSize} g</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Energy</td><td style={{textAlign: 'center'}}>{formData.nutrition.energy.kj} kJ / {formData.nutrition.energy.kcal} kcal</td><td style={{textAlign: 'center'}}>{calculatePerServing(formData.nutrition.energy.kj)} kJ / {calculatePerServing(formData.nutrition.energy.kcal)} kcal</td></tr>
                    <tr><td>Fat</td><td style={{textAlign: 'center'}}>{formData.nutrition.fat} g</td><td style={{textAlign: 'center'}}>{calculatePerServing(formData.nutrition.fat)} g</td></tr>
                    <tr><td className="base-ingredient">of which saturates</td><td style={{textAlign: 'center'}}>{formData.nutrition.saturatedFat} g</td><td style={{textAlign: 'center'}}>{calculatePerServing(formData.nutrition.saturatedFat)} g</td></tr>
                    <tr><td>Carbohydrates</td><td style={{textAlign: 'center'}}>{formData.nutrition.carbohydrates} g</td><td style={{textAlign: 'center'}}>{calculatePerServing(formData.nutrition.carbohydrates)} g</td></tr>
                    <tr><td className="base-ingredient">of which sugars</td><td style={{textAlign: 'center'}}>{formData.nutrition.sugars} g</td><td style={{textAlign: 'center'}}>{calculatePerServing(formData.nutrition.sugars)} g</td></tr>
                    <tr><td>Fibre</td><td style={{textAlign: 'center'}}>{formData.nutrition.fiber} g</td><td style={{textAlign: 'center'}}>{calculatePerServing(formData.nutrition.fiber)} g</td></tr>
                    <tr><td>Protein</td><td style={{textAlign: 'center'}}>{formData.nutrition.protein} g</td><td style={{textAlign: 'center'}}>{calculatePerServing(formData.nutrition.protein)} g</td></tr>
                    <tr><td>Salt</td><td style={{textAlign: 'center'}}>{formData.nutrition.salt} g</td><td style={{textAlign: 'center'}}>{calculatePerServing(formData.nutrition.salt)} g</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid-two-cols">
              {nutriScoreData && (
                <div className="claims-section">
                  <div className="claims-header"><h3 className="section-title">Nutri-Score Rating</h3></div>
                  <div className="claims-content" style={{ textAlign: 'center' }}>
                    <img src={getNutriScoreImage(nutriScoreData.nutriGrade)} alt={`Nutri-Score ${nutriScoreData.nutriGrade}`} style={{ height: '48px', margin: 'auto' }} />
                    <p>Grade: {nutriScoreData.nutriGrade} • Score: {nutriScoreData.finalScore}</p>
                  </div>
                </div>
              )}
              {claimsToShow.length > 0 && (
                <div className="claims-section">
                  <div className="claims-header"><h3 className="section-title">Possible declarations</h3></div>
                  <div className="claims-content">
                    {claimsToShow.map(item => <div key={item.label} className="claim-item"><span>{item.label}</span><span className="claim-value">{item.claim}</span></div>)}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="storage-conditions section">
          <div className="section-header"><h3 className="section-title">Storage conditions</h3></div>
          <div className="section-content"><p className="section-text">{formData.storageConditions || "..."}</p></div>
        </div>
        <div className="allergy-advice section">
          <div className="section-header"><h3 className="section-title">Allergy advice</h3></div>
          <div className="section-content"><p className="section-text">{formData.allergyAdvice || "..."}</p></div>
        </div>
        <div className="preparation-instructions section">
          <div className="section-header"><h3 className="section-title">Preparation instructions</h3></div>
          <div className="section-content"><p className="section-text">{formData.preparation || "..."}</p></div>
        </div>

        <div className="footer-section">
          <div className="footer-grid">
            <div className="footer-item"><span className="footer-label">Valid from:</span><span className="footer-value">{new Date().toLocaleDateString('en-GB')}</span></div>
            {(formData.preparedBy || formData.jobTitle) && <div className="footer-item"><span className="footer-label">Prepared by:</span><span className="footer-value">{formData.preparedBy}, {formData.jobTitle}</span></div>}
          </div>
        </div>
        <p className="disclaimer">The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.</p>
      </div>
    </div>
  );
}