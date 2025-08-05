
import { ProductInfo } from '@shared/schema';
import { calculateNutriScore, getNutriScoreColor } from '../../client/src/lib/nutri-score';
import { calculateClaims } from '../../client/src/lib/claims-calculator';

/**
 * HTML-Template-Generator für PDF-Erstellung
 * 
 * Diese Datei erstellt ein vollständiges HTML-Template aus den Formular-Daten,
 * das exakt der Live-Vorschau entspricht und für PDF-Generierung optimiert ist.
 */

export function generatePDFTemplate(formData: ProductInfo): string {
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
          tableIngredients.push({
            name: ing.name,
            percentage: ing.percentage || 0,
            origin: ing.origin || "",
            isFinalProduct: true
          });

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

    nutriScoreHtml = `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
        <h3 style="font-weight: 600; font-size: 16px; color: #1e293b; margin-bottom: 8px;">Nutri-Score Rating</h3>
        <div style="text-align: center;">
          <div style="display: flex; justify-content: center;">
            <div style="background: white; padding: 8px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
              <div style="height: 64px; width: auto; background: ${getNutriScoreColor(nutriScore.nutriGrade)}; color: white; font-weight: bold; font-size: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; min-width: 80px;">
                ${nutriScore.nutriGrade}
              </div>
            </div>
          </div>
          <p style="font-size: 14px; color: #374151; margin-top: 8px; font-weight: 500;">
            Grade: ${nutriScore.nutriGrade} • Score: ${nutriScore.finalScore}
          </p>
        </div>
      </div>
    `;

    // Claims berechnen
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
              <span style="font-size: 14px; font-weight: 500; color: #374151;">${item.label}</span>
              <span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534;">
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
            padding: 20px;
        }
        
        .document-container {
            max-width: 100%;
            margin: 0 auto;
            background: white;
        }
        
        .header {
            position: relative;
            background: linear-gradient(to right, #f8fafc, #f1f5f9);
            padding: 16px;
            border-bottom: 2px solid #cbd5e1;
            border-radius: 8px 8px 0 0;
            margin-bottom: 16px;
        }
        
        .logo {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            height: 40px;
            width: auto;
        }
        
        .header-content {
            text-align: center;
        }
        
        .header h1 {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
            letter-spacing: 0.025em;
        }
        
        .product-number {
            color: #1e293b;
            font-weight: 600;
            font-size: 16px;
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
            padding: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
            margin-bottom: 16px;
        }
        
        .product-name-label {
            font-size: 12px;
            font-weight: 500;
            color: #6b7280;
            text-transform: uppercase;
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
            margin-bottom: 16px;
        }
        
        .product-image img {
            max-width: 300px;
            max-height: 128px;
            object-fit: contain;
        }
        
        .section {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
        }
        
        .section-header {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        
        .section-title {
            font-weight: 600;
            font-size: 16px;
            color: #1e293b;
        }
        
        .section-content {
            padding: 12px;
        }
        
        .ingredients-content {
            font-size: 14px;
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
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 8px;
            border-radius: 0 8px 8px 0;
            margin-bottom: 16px;
        }
        
        .warning-content {
            display: flex;
            align-items: flex-start;
        }
        
        .warning-icon {
            width: 16px;
            height: 16px;
            color: #3b82f6;
            margin-right: 8px;
            margin-top: 2px;
            flex-shrink: 0;
        }
        
        .warning-text {
            font-size: 12px;
            color: #1e40af;
            line-height: 1.5;
            font-weight: 500;
        }
        
        .table-container {
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            font-size: 12px;
            border-collapse: collapse;
        }
        
        th {
            padding: 8px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        td {
            padding: 8px;
            border-bottom: 1px solid #f1f5f9;
            color: #374151;
        }
        
        tr:hover {
            background: #f8fafc;
        }
        
        .grid-two-cols {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
        }
        
        .claims-section {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
        }
        
        .claims-header {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        
        .claims-content {
            padding: 12px;
        }
        
        .allergy-advice {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            border-radius: 0 8px 8px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 16px;
        }
        
        .allergy-content {
            display: flex;
            align-items: flex-start;
            padding: 12px;
        }
        
        .allergy-icon {
            width: 20px;
            height: 20px;
            color: #ef4444;
            margin-right: 8px;
            flex-shrink: 0;
        }
        
        .allergy-text-container h3 {
            font-weight: 600;
            font-size: 16px;
            color: #991b1b;
            margin-bottom: 4px;
        }
        
        .allergy-text {
            font-size: 14px;
            color: #991b1b;
            line-height: 1.5;
            white-space: pre-line;
        }
        
        .footer-section {
            margin-top: 16px;
            background: linear-gradient(to right, #f1f5f9, #f8fafc);
            border-radius: 8px;
            padding: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            font-size: 14px;
        }
        
        .footer-item {
            display: flex;
            align-items: center;
        }
        
        .footer-icon {
            width: 20px;
            height: 20px;
            color: #6b7280;
            margin-right: 12px;
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
            font-size: 12px;
            color: #6b7280;
            font-style: italic;
            line-height: 1.5;
            margin-top: 16px;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .avoid-break {
            page-break-inside: avoid;
        }
        
        @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="document-container">
        <!-- Page 1 Header -->
        <div class="header">
            <img src="data:image/png;base64,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" alt="Brüggen Logo" class="logo">
            <div class="header-content">
                <h1>Product Information</h1>
                <div class="product-number">${formData.productNumber || "Recipe Number"}</div>
            </div>
            <div class="page-number">Page 1</div>
        </div>

        <!-- Product Name Section -->
        <div class="product-name-section">
            <span class="product-name-label">Product Name</span>
            <h2 class="product-name">${formData.productName || "Product name will appear here..."}</h2>
        </div>

        <!-- Product Image -->
        ${formData.productImage ? `
        <div class="product-image">
            <img src="${formData.productImage}" alt="Product" />
        </div>
        ` : ''}

        <!-- Ingredients Section -->
        <div class="section">
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
        <div class="warning-box">
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
                            <td>
                                ${ingredient.isFinalProduct ? 
                                  `<strong>${ingredient.name}</strong>` : 
                                  `<span style="color: #6b7280;">${ingredient.name}</span>`
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

        <!-- Page Break -->
        ${formData.nutrition ? '<div class="page-break"></div>' : ''}

        <!-- Page 2 Header (if nutrition exists) -->
        ${formData.nutrition ? `
        <div class="header">
            <img src="data:image/png;base64,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" alt="Brüggen Logo" class="logo">
            <div class="header-content">
                <h1>Product Information</h1>
                <div class="product-number">${formData.productNumber || "Recipe Number"}</div>
            </div>
            <div class="page-number">Page 2</div>
        </div>
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
        <div class="grid-two-cols">
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
        <div class="section">
            <div class="section-header">
                <h3 class="section-title">Storage Conditions</h3>
            </div>
            <div class="section-content">
                <div style="display: flex; align-items: flex-start;">
                    <svg style="width: 20px; height: 20px; color: #3b82f6; margin-right: 12px; margin-top: 2px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div style="font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-line;">
                        ${formData.storageConditions || "Storage conditions will be generated based on product type selection..."}
                    </div>
                </div>
            </div>
        </div>

        <!-- Allergy Advice -->
        <div class="allergy-advice">
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
        <div class="section">
            <div class="section-header">
                <h3 class="section-title">Preparation Instructions</h3>
            </div>
            <div class="section-content">
                <div style="display: flex; align-items: flex-start;">
                    <svg style="width: 20px; height: 20px; color: #8b5cf6; margin-right: 12px; margin-top: 2px; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div style="font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-line;">
                        ${formData.preparation}
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer-section">
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
