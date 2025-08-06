
import { ProductInfo } from '@shared/schema';
import { calculateNutriScore, getNutriScoreColor } from './nutri-score-server';
import { calculateClaims } from './claims-calculator-server';
import fs from 'fs';
import path from 'path';

/**
 * HTML-Template-Generator für PDF-Erstellung
 * 
 * Diese Datei erstellt ein vollständiges HTML-Template aus den Formular-Daten,
 * das exakt der Live-Vorschau entspricht und für PDF-Generierung optimiert ist.
 */

export function generatePDFTemplate(formData: ProductInfo): string {
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');
  
  // Function to get base64 image from file system
  const getImageBase64 = (filename: string): string => {
    try {
      const imagePath = path.join(process.cwd(), 'attached_assets', filename);
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error(`Error loading image ${filename}:`, error);
      return '';
    }
  };
  
  // Brüggen Logo as base64 - the actual logo provided by user
  const brueggenLogoBase64 = `data:image/png;base64,${getImageBase64('Brueggen LOGO NEW-RGB_1754403378420.png')}`;
  
  // Nutri-Score images as base64 from actual files
  const nutriScoreImages = {
    'A': `data:image/jpeg;base64,${getImageBase64('Nutri_Score_1_1753880672878.jpg')}`,
    'B': `data:image/jpeg;base64,${getImageBase64('Nutri_Score_2_1753880672879.jpg')}`,
    'C': `data:image/jpeg;base64,${getImageBase64('Nutri_Score_3_1753880672880.jpg')}`,
    'D': `data:image/jpeg;base64,${getImageBase64('Nutri_Score_4_1753880672881.jpg')}`,
    'E': `data:image/jpeg;base64,${getImageBase64('Nutri_Score_5_1753880672882.jpg')}`
  };

  const calculatePerServing = (per100g: number) => {
    return (per100g * servingSize / 100).toFixed(1);
  };

  const formatIngredients = () => {
    const finalIngredients = formData.ingredients || [];
    const baseIngredients = formData.baseProductIngredients || [];

    if (finalIngredients.length === 0 && baseIngredients.length === 0) {
      return "Ingredients will appear here after extraction...";
    }

    // Format base ingredients for inclusion in brackets
    const baseFormatted = baseIngredients
      .filter(ingredient => ingredient.name.trim() !== "")
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` ${ingredient.percentage}%*` : '';
        return `${ingredient.name}${percentage}`;
      })
      .join(', ');

    // Format final ingredients with base ingredients in brackets
    const finalFormatted = finalIngredients
      .filter(ingredient => ingredient.name.trim() !== "")
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` (${ingredient.percentage}%)` : '';
        const ingredientText = `<strong>${ingredient.name}${percentage}</strong>`;

        if (ingredient.isMarkedAsBase && baseFormatted) {
          return `${ingredientText} [${baseFormatted}]`;
        }

        return ingredientText;
      })
      .join(', ');

    return finalFormatted || "Ingredients will appear here after extraction...";
  };

  // Calculate percentage from base product to whole product
  const calculateWholeProductPercentage = (basePercentage: number, markedIngredientPercentage: number) => {
    return +((basePercentage * markedIngredientPercentage) / 100).toFixed(1);
  };

  const getMarkedIngredientPercentage = () => {
    const markedIngredient = (formData.ingredients || []).find(ing => ing.isMarkedAsBase);
    return markedIngredient?.percentage || 0;
  };

  const generateIngredientsTable = () => {
    const finalIngredients = formData.ingredients || [];
    const baseIngredients = formData.baseProductIngredients || [];
    const markedIngredientPercentage = getMarkedIngredientPercentage();
    const tableIngredients: Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> = [];

    finalIngredients
      .filter(ing => ing.name.trim())
      .forEach(ing => {
        if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
          // Add the marked ingredient first
          tableIngredients.push({
            name: ing.name,
            percentage: ing.percentage || 0,
            origin: ing.origin || "",
            isFinalProduct: true
          });

          // Add base ingredients under the marked ingredient
          baseIngredients
            .filter(baseIng => baseIng.name.trim())
            .forEach(baseIng => {
              const wholeProductPercentage = baseIng.percentage 
                ? calculateWholeProductPercentage(baseIng.percentage, markedIngredientPercentage)
                : 0;
              tableIngredients.push({
                name: `  ${baseIng.name}`, // Indent base ingredients
                percentage: wholeProductPercentage,
                origin: baseIng.origin || "",
                isFinalProduct: false
              });
            });
        } else {
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

  // Nutri-Score berechnung
  let nutriScoreHtml = '';
  let claimsHtml = '';
  
  if (formData.nutrition) {
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

    // Generate Nutri-Score visual based on grade
    const nutriScoreColors = {
      'A': '#038153',
      'B': '#85BB2F', 
      'C': '#FECB02',
      'D': '#EE8100',
      'E': '#E63E11'
    };

    const currentColor = nutriScoreColors[nutriScore.nutriGrade as keyof typeof nutriScoreColors] || '#85BB2F';

    const nutriScoreImage = nutriScoreImages[nutriScore.nutriGrade as keyof typeof nutriScoreImages] || nutriScoreImages['C'];

    nutriScoreHtml = `
      <div class="claims-section">
        <div class="claims-header">
          <h3 class="section-title">Nutri-Score Rating</h3>
        </div>
        <div class="claims-content">
          <div style="text-align: center;">
            <img src="${nutriScoreImage}" alt="Nutri-Score ${nutriScore.nutriGrade}" style="height: 48px; width: auto; margin-bottom: 4px;" />
            <p style="font-size: 12px; color: #374151; margin: 0; font-weight: 500;">
              Grade: ${nutriScore.nutriGrade} • Score: ${nutriScore.finalScore}
            </p>
          </div>
        </div>
      </div>
    `;

    // Claims berechnen - nur ausgewählte anzeigen
    const claimsResult = calculateClaims({
      protein: formData.nutrition.protein || 0,
      fiber: formData.nutrition.fiber || 0,
      salt: formData.nutrition.salt || 0,
      sugars: formData.nutrition.sugars || 0,
      fat: formData.nutrition.fat || 0,
      saturatedFat: formData.nutrition.saturatedFat || 0
    });

    const claimsToShow = [];

    // Nur positive/grüne Claims anzeigen (Fiber und Protein)
    if (claimsResult.fiber.bestClaim) {
      claimsToShow.push({ label: "Source of fibre / High fibre", claim: claimsResult.fiber.bestClaim });
    }
    if (claimsResult.protein.bestClaim) {
      claimsToShow.push({ label: "Source of protein / High protein", claim: claimsResult.protein.bestClaim });
    }
    // Negative Claims (Salt, Sugar, Fat, Saturated Fat) werden nicht mehr angezeigt

    // Nur ausgewählte Declarations hinzufügen
    if (formData.declarations?.wholegrain) {
      claimsToShow.push({ label: "Content of wholegrain", claim: "✓" });
    }
    if (formData.declarations?.other) {
      claimsToShow.push({ label: "Other", claim: formData.declarations.other });
    }

    if (claimsToShow.length > 0) {
      claimsHtml = `
        <div style="grid-column: 1 / -1;">
          ${claimsToShow.map(item => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: linear-gradient(to right, #f0fdf4, #ecfdf5); border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 500; color: #374151;">${item.label}</span>
              <span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background: #dcfce7; color: #166534;">
                ${item.claim}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      claimsHtml = `
        <div style="text-align: center; color: #6b7280; padding: 32px;">
          <svg style="width: 48px; height: 48px; margin: 0 auto 16px; color: #d1d5db;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No nutritional claims available based on current values</p>
        </div>
      `;
    }
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Information - ${formData.productName || 'Product'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            margin: 0;
            padding: 3mm; /* Exakt 3mm Ränder */
        }
        
        .document-container {
            width: 100%;
            margin: 0;
            background: white;
        }
        
        .header {
            position: relative;
            background: linear-gradient(to right, #f8fafc, #f1f5f9);
            padding: 8px 12px; /* Erhöht von 6px auf 8px */
            border-bottom: 2px solid #cbd5e1;
            border-radius: 6px 6px 0 0;
            margin-bottom: 8px; /* Erhöht von 6px auf 8px */
            margin-top: 2px; /* Hinzugefügt für Abstand vom oberen Rand */
            height: 40px; /* Erhöht von 36px auf 40px */
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .logo {
            height: 30px;
            width: auto;
            margin-right: 10px;
        }
        
        .header-content {
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: auto;
        }
        
        .header h1 {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
            letter-spacing: 0.025em;
        }
        
        .product-number {
            color: #1e293b;
            font-weight: 600;
            font-size: 14px;
        }
        
        .page-number {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12px;
            font-weight: 500;
            color: #374151;
        }
        
        .product-name-section {
            background: linear-gradient(to right, white, #f8fafc);
            border-radius: 8px;
            padding: 8px; /* Reduziert von 12px auf 8px */
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
            margin-bottom: 6px; /* Reduziert von 12px auf 6px */
        }
        
        .product-name-label {
            font-size: 12px;
            font-weight: 500;
            color: #6b7280;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
            display: block;
        }
        
        .product-name {
            font-size: 18px;
            font-weight: bold;
            background: linear-gradient(to right, #d97706, #eab308);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        
        .product-image {
            text-align: center;
            margin-bottom: 6px; /* Reduziert von 12px auf 6px */
        }
        
        .product-image img {
            max-width: 300px;
            max-height: 128px;
            object-fit: contain;
        }
        
        .section {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 4px; /* Reduziert von 8px auf 4px */
            overflow: hidden;
            page-break-inside: avoid;
        }
        
        .section-header {
            padding: 2px 8px; /* Reduziert von 4px auf 2px */
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        
        .section-title {
            font-weight: 600;
            font-size: 14px;
            color: #1e293b;
            margin-bottom: 0;
        }
        
        .section-content {
            padding: 1px 8px; /* Reduziert von 2px auf 1px */
        }
        
        .ingredients-content {
            font-size: 12px; /* Reduziert von 14px auf 12px */
            line-height: 1.6;
            color: #374151;
        }
        
        .ingredients-note {
            font-size: 12px;
            color: #6b7280;
            font-style: italic;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid #e2e8f0;
        }
        
        .warning-box {
            border-left: 4px solid #3b82f6;
            padding: 2px 6px; /* Reduziert von 4px auf 2px */
            border-radius: 0 6px 6px 0;
            margin-bottom: 4px; /* Reduziert von 8px auf 4px */
            page-break-inside: avoid;
        }
        
        .warning-content {
            display: flex;
            align-items: flex-start; /* Geändert von center auf flex-start */
            gap: 4px; /* Reduziert von 6px auf 4px */
            line-height: 1.4; /* Reduziert von 1.5 auf 1.4 */
        }
        
        .warning-icon {
            width: 14px; /* Reduziert von 16px auf 14px */
            height: 14px; /* Reduziert von 16px auf 14px */
            color: #3b82f6;
            flex-shrink: 0;
            margin-top: 1px; /* Inline-Ausrichtung mit erster Textzeile */
        }
        
        .warning-text {
            font-size: 12px;
            color: #1e40af;
            line-height: 1.4; /* Reduziert von 1.5 auf 1.4 */
            font-weight: 500;
            margin: 0; /* Entfernt Standard-Margins */
        }
        
        .table-container {
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            font-size: 11px;
            border-collapse: collapse;
        }
        
        th {
            padding: 3px 4px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        td {
            padding: 3px 4px;
            border-bottom: 1px solid #f1f5f9;
            color: #374151;
        }
        
        .base-ingredient {
            color: #6b7280;
            font-style: italic;
            padding-left: 20px;
        }
        
        tr:hover {
            background: #f8fafc;
        }
        
        .grid-two-cols {
            display: grid;
            grid-template-columns: 1fr 2fr; /* 33:66 Verhältnis */
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .claims-section {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            page-break-inside: avoid;
        }
        
        .claims-header {
            padding: 4px 8px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        
        .claims-header h3 {
            margin-bottom: 0;
        }
        
        .claims-content {
            padding: 2px 8px;
        }
        
        .allergy-advice {
            border-left: 4px solid #ef4444;
            border-radius: 0 6px 6px 0;
            margin-bottom: 4px; /* Reduziert von 8px auf 4px */
            page-break-inside: avoid;
        }
        
        .allergy-content {
            display: flex;
            align-items: flex-start; /* Geändert von center auf flex-start */
            padding: 1px 8px; /* Reduziert von 2px auf 1px */
            gap: 4px; /* Reduziert von 6px auf 4px */
            line-height: 1.4; /* Reduziert von 1.5 auf 1.4 */
        }
        
        .allergy-icon {
            width: 14px; /* Reduziert von 16px auf 14px */
            height: 14px; /* Reduziert von 16px auf 14px */
            color: #ef4444;
            flex-shrink: 0;
            margin-top: 1px; /* Inline-Ausrichtung mit Text */
        }
        
        .allergy-text-container h3 {
            font-weight: 600;
            font-size: 15px;
            color: #991b1b;
            margin-bottom: 2px; /* Reduziert von 4px auf 2px */
        }
        
        .allergy-text {
            font-size: 13px;
            color: #991b1b;
            line-height: 1.4; /* Reduziert von 1.5 auf 1.4 */
            white-space: pre-line;
            margin: 0; /* Entfernt Standard-Margins */
        }
        
        .footer-section {
            margin-top: 12px;
            background: linear-gradient(to right, #f1f5f9, #f8fafc);
            border-radius: 8px;
            padding: 10px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            page-break-inside: avoid;
        }
        
        .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            font-size: 13px;
        }
        
        .footer-item {
            display: flex;
            align-items: center;
        }
        
        .footer-icon {
            width: 18px;
            height: 18px;
            color: #6b7280;
            margin-right: 10px;
            flex-shrink: 0;
        }
        
        .footer-label {
            font-weight: 600;
            color: #374151;
        }
        
        .footer-value {
            margin-left: 8px;
            color: #6b7280;
        }
        
        .disclaimer {
            font-size: 11px;
            color: #6b7280;
            font-style: italic;
            line-height: 1.5;
            margin-top: 12px;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .avoid-break {
            page-break-inside: avoid;
        }
        
        @media print {
            body { margin: 0; padding: 5mm; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="document-container">
        <!-- Page 1 Header -->
        <div class="header">
            <img src="${brueggenLogoBase64}" alt="Brüggen Logo" style="height: 30px; width: auto; position: absolute; left: 12px; top: 50%; transform: translateY(-50%);" />
            <div class="header-content" style="width: 100%; text-align: center; position: relative;">
                <h1 style="margin: 0; font-size: 16px;">Product Information</h1>
                <div class="product-number" style="font-size: 12px;">${formData.productNumber || "Recipe Number"}</div>
            </div>
            <div class="page-number" style="font-size: 11px; position: absolute; right: 12px; top: 50%; transform: translateY(-50%);">Page 1</div>
        </div></div>

        <!-- Product Name Section -->
        <div class="product-name-section avoid-break">
            <span class="product-name-label">Product Name</span>
            <h2 class="product-name">${formData.productName || "Product name will appear here..."}</h2>
        </div>

        <!-- Product Image -->
        ${formData.productImage ? `
        <div class="product-image avoid-break">
            <img src="${formData.productImage}" alt="Product" />
        </div>
        ` : ''}

        <!-- Ingredients Section -->
        <div class="section avoid-break">
            <div class="section-header">
                <h3 class="section-title">Ingredients</h3>
            </div>
            <div class="section-content">
                <div class="ingredients-content">
                    ${formatIngredients()}
                </div>
                <div class="ingredients-note">
                    * percentage in ingredient
                </div>
            </div>
        </div>

        <!-- Warning Box -->
        <div class="warning-box avoid-break">
            <div class="warning-content">
                <svg class="warning-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <div class="warning-text">
                    The quality of all raw materials used in the manufacture and the finished product meets the current applicable 
                    legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, 
                    pesticides and other - in accordance with applicable legislation.
                </div>
            </div>
        </div>

        <!-- Detailed Ingredients Table -->
        ${(formData.ingredients?.some(ing => ing.name.trim()) || formData.baseProductIngredients?.some(ing => ing.name.trim())) ? `
        <div class="section avoid-break">
            <div class="section-header">
                <h3 class="section-title">Detailed Ingredients Breakdown</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Ingredients</th>
                            <th>Percentage content per whole product</th>
                            <th>Country of Origin</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateIngredientsTable().map(ingredient => `
                        <tr>
                            <td class="${ingredient.isFinalProduct ? '' : 'base-ingredient'}">
                                ${ingredient.isFinalProduct ? 
                                  `<strong>${ingredient.name}</strong>` : 
                                  ingredient.name
                                }
                            </td>
                            <td>${ingredient.percentage}%</td>
                            <td>${ingredient.origin || "-"}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <!-- Page Break für Nutrition -->
        ${formData.nutrition ? '<div class="page-break"></div>' : ''}

        <!-- Page 2 Header (if nutrition exists) -->
        ${formData.nutrition ? `
        <div class="header">
            <img src="${brueggenLogoBase64}" alt="Brüggen Logo" style="height: 30px; width: auto; position: absolute; left: 12px; top: 50%; transform: translateY(-50%);" />
            <div class="header-content" style="width: 100%; text-align: center; position: relative;">
                <h1 style="margin: 0; font-size: 16px;">Product Information</h1>
                <div class="product-number" style="font-size: 12px;">${formData.productNumber || "Recipe Number"}</div>
            </div>
            <div class="page-number" style="font-size: 11px; position: absolute; right: 12px; top: 50%; transform: translateY(-50%);">Page 2</div>
        </div></div>
        ` : ''}

        <!-- Nutritional Table -->
        ${formData.nutrition ? `
        <div class="section avoid-break">
            <div class="section-header">
                <h3 class="section-title">Average Nutritional Value</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nutrient</th>
                            <th style="text-align: center;">per 100 g of product</th>
                            <th style="text-align: center;">per ${servingSize} g of product</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight: 500;">Energy</td>
                            <td style="text-align: center;">${formData.nutrition?.energy?.kj || 0} kJ / ${formData.nutrition?.energy?.kcal || 0} kcal</td>
                            <td style="text-align: center;">${calculatePerServing(formData.nutrition?.energy?.kj || 0)} kJ / ${calculatePerServing(formData.nutrition?.energy?.kcal || 0)} kcal</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 500;">Fat</td>
                            <td style="text-align: center;">${formData.nutrition?.fat || 0} g</td>
                            <td style="text-align: center;">${calculatePerServing(formData.nutrition?.fat || 0)} g</td>
                        </tr>
                        <tr>
                            <td style="padding-left: 16px; color: #6b7280;">of which saturates</td>
                            <td style="text-align: center;">${formData.nutrition?.saturatedFat || 0} g</td>
                            <td style="text-align: center;">${calculatePerServing(formData.nutrition?.saturatedFat || 0)} g</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 500;">Carbohydrates</td>
                            <td style="text-align: center;">${formData.nutrition?.carbohydrates || 0} g</td>
                            <td style="text-align: center;">${calculatePerServing(formData.nutrition?.carbohydrates || 0)} g</td>
                        </tr>
                        <tr>
                            <td style="padding-left: 16px; color: #6b7280;">of which sugars</td>
                            <td style="text-align: center;">${formData.nutrition?.sugars || 0} g</td>
                            <td style="text-align: center;">${calculatePerServing(formData.nutrition?.sugars || 0)} g</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 500;">Fibre</td>
                            <td style="text-align: center;">${formData.nutrition?.fiber || 0} g</td>
                            <td style="text-align: center;">${calculatePerServing(formData.nutrition?.fiber || 0)} g</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 500;">Protein</td>
                            <td style="text-align: center;">${formData.nutrition?.protein || 0} g</td>
                            <td style="text-align: center;">${calculatePerServing(formData.nutrition?.protein || 0)} g</td>
                        </tr>
                        <tr>
                            <td style="font-weight: 500;">Salt</td>
                            <td style="text-align: center;">${formData.nutrition?.salt || 0} g</td>
                            <td style="text-align: center;">${calculatePerServing(formData.nutrition?.salt || 0)} g</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        <!-- Nutri-Score and Claims -->
        ${formData.nutrition ? `
        <div class="grid-two-cols avoid-break">
            ${nutriScoreHtml}
            <div class="claims-section">
                <div class="claims-header">
                    <h3 class="section-title">Possible Declarations</h3>
                </div>
                <div class="claims-content">
                    ${claimsHtml}
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Storage Conditions -->
        <div class="section avoid-break">
            <div class="section-header">
                <h3 class="section-title">Storage Conditions</h3>
            </div>
            <div class="section-content">
                <div style="display: flex; align-items: flex-start; gap: 4px; line-height: 1.4;">
                    <svg style="width: 14px; height: 14px; color: #3b82f6; flex-shrink: 0; margin-top: 1px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div style="font-size: 13px; color: #374151; line-height: 1.4; white-space: pre-line; margin: 0;">
                        ${formData.storageConditions || "Storage conditions will be generated based on product type selection..."}
                    </div>
                </div>
            </div>
        </div>

        <!-- Allergy Advice -->
        <div class="allergy-advice avoid-break">
            <div class="allergy-content">
                <svg class="allergy-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <div class="allergy-text-container">
                    <h3>Allergy Advice</h3>
                    <div class="allergy-text">
                        ${formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products."}
                    </div>
                </div>
            </div>
        </div>

        <!-- Preparation Instructions -->
        ${formData.preparation ? `
        <div class="section avoid-break">
            <div class="section-header">
                <h3 class="section-title">Preparation Instructions</h3>
            </div>
            <div class="section-content">
                <div style="display: flex; align-items: flex-start; gap: 4px; line-height: 1.4;">
                    <svg style="width: 14px; height: 14px; color: #8b5cf6; flex-shrink: 0; margin-top: 1px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div style="font-size: 13px; color: #374151; line-height: 1.4; white-space: pre-line; margin: 0;">
                        ${formData.preparation}
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer-section avoid-break">
            <div class="footer-grid">
                <div class="footer-item">
                    <svg class="footer-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                        <span class="footer-label">Valid from:</span>
                        <span class="footer-value">${new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                </div>
                ${(formData.preparedBy || formData.jobTitle) ? `
                <div class="footer-item">
                    <svg class="footer-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                        <span class="footer-label">Prepared by:</span>
                        <span class="footer-value">
                            ${formData.preparedBy && formData.jobTitle 
                              ? `${formData.preparedBy}, ${formData.jobTitle}`
                              : formData.preparedBy || formData.jobTitle || ''
                            }
                        </span>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Disclaimer -->
        <div class="disclaimer">
            The purpose of this product information is to describe a sample made
            in the laboratory. Nutritional values are calculated. Minor variations
            may occur due to different production conditions during manufacture.
        </div>
    </div>
</body>
</html>
  `;
}
