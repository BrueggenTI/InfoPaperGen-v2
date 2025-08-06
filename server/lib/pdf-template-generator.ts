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
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
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
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.3;
            color: #1a202c;
            background: white;
            margin: 0;
            padding: 5mm; /* Reduced margins for more content space */
            font-size: 10px; /* Smaller base font for more compact layout */
        }

        /* =================================================================== */
        /* CSS-Lösung zur Behebung des PDF-Abstandproblems (General Solution) */
        /* =================================================================== */

        h2, h3 {
            /* Setzt den Abstand UNTER der Überschrift auf einen kleinen, sauberen Wert. */
            margin-bottom: 4px !important; 
        }

        p {
            /* Entfernt den Abstand ÜBER dem Absatz vollständig. */
            margin-top: 0 !important;
            
            /* Verbessert die Lesbarkeit des Textes. */
            line-height: 1.5;
        }

        .document-container {
            width: 100%;
            margin: 0;
            background: white;
        }

        .header {
            position: relative;
            background: linear-gradient(135deg, #ff4143 0%, #661c31 100%);
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            color: white;
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
            font-size: 16px;
            font-weight: 700;
            color: white;
            margin-bottom: 1px;
            letter-spacing: 0.3px;
            text-rendering: optimizeLegibility;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .product-number {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
            font-size: 11px;
        }

        .page-number {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 10px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.1);
            padding: 3px 6px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
        }

        .product-name-section {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border-radius: 8px;
            padding: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            text-align: center;
            margin-bottom: 12px;
        }

        .product-name-label {
            font-size: 10px;
            font-weight: 500;
            color: #6b7280;
            letter-spacing: 0.03em;
            margin-bottom: 3px;
            display: block;
        }

        .product-name {
            font-size: 18px;
            font-weight: 800;
            background: linear-gradient(135deg, #ff4143 0%, #661c31 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .product-image {
            text-align: center;
            margin-bottom: 12px;
        }

        .product-image img {
            max-width: 300px;
            max-height: 128px;
            object-fit: contain;
        }

        .section {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 8px;
            overflow: hidden;
            page-break-inside: avoid;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            background: #ffffff;
        }

        .section-header {
            padding: 6px 10px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            margin-bottom: 0px;
        }

        .section-title {
            font-weight: 700;
            font-size: 12px;
            color: #2d3748;
            margin-bottom: 0;
            margin-top: 0;
            line-height: 1.2;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .section-content {
            padding: 8px 10px;
            margin-top: 0;
            background: #ffffff;
        }

        .ingredients-content {
            font-size: 10px;
            line-height: 1.4;
            color: #4a5568;
            text-align: justify;
        }

        .ingredients-note {
            font-size: 8px;
            color: #6b7280;
            font-style: italic;
            margin-top: 3px;
            padding-top: 3px;
            border-top: 1px solid #e2e8f0;
        }

        .warning-box {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 1px solid #93c5fd;
            border-left: 3px solid #3b82f6;
            padding: 8px;
            border-radius: 6px;
            margin-bottom: 8px;
            page-break-inside: avoid;
            box-shadow: 0 1px 4px rgba(59, 130, 246, 0.08);
        }

        .warning-content {
            display: flex;
            align-items: flex-start;
            gap: 3px;
            line-height: 1.3;
        }

        .warning-icon {
            width: 12px;
            height: 12px;
            color: #3b82f6;
            flex-shrink: 0;
            margin-top: 1px;
        }

        .warning-text {
            font-size: 9px;
            color: #1e40af;
            line-height: 1.3;
            font-weight: 500;
            margin: 0;
        }

        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            font-size: 9px;
            border-collapse: collapse;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }

        th {
            padding: 6px 6px;
            text-align: left;
            font-weight: 700;
            background: linear-gradient(135deg, #ff4143 0%, #661c31 100%);
            color: white;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        td {
            padding: 4px 6px;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
            vertical-align: top;
            line-height: 1.3;
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
            grid-template-columns: 1fr 2fr;
            gap: 8px;
            margin-bottom: 12px;
        }

        .claims-section {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 12px;
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

        /* KRITISCHE ÄNDERUNG: Spezielle Styling für Storage Conditions */
        .storage-conditions {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 8px;
            page-break-inside: avoid;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            background: #ffffff;
        }

        .storage-conditions .section-header {
            padding: 6px 10px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            margin-bottom: 0px;
        }

        .storage-conditions .section-header h3 {
            font-weight: 700;
            font-size: 12px;
            color: #2d3748;
            margin-bottom: 0;
            margin-top: 0;
            line-height: 1.2;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .storage-conditions .section-content {
            padding: 8px 10px;
            margin-top: 0;
            background: #ffffff;
        }

        .storage-conditions .section-text {
            font-size: 9px;
            color: #4a5568;
            line-height: 1.3;
            white-space: pre-line;
            margin: 0;
        }

        /* KRITISCHE ÄNDERUNG: Spezielle Styling für Allergy Advice */
        .allergy-advice {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 8px;
            page-break-inside: avoid;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            background: #ffffff;
        }

        .allergy-advice .section-header {
            padding: 6px 10px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            margin-bottom: 0px;
        }

        .allergy-advice .section-header h3 {
            font-weight: 700;
            font-size: 12px;
            color: #2d3748;
            margin-bottom: 0;
            margin-top: 0;
            line-height: 1.2;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .allergy-advice .section-content {
            padding: 8px 10px;
            margin-top: 0;
            background: #ffffff;
        }

        .allergy-advice .section-text {
            font-size: 9px;
            color: #4a5568;
            line-height: 1.3;
            white-space: pre-line;
            margin: 0;
        }

        /* KRITISCHE ÄNDERUNG: Spezielle Styling für Preparation Instructions */
        .preparation-instructions {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 8px;
            page-break-inside: avoid;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            background: #ffffff;
        }

        .preparation-instructions .section-header {
            padding: 6px 10px;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            margin-bottom: 0px;
        }

        .preparation-instructions .section-header h3 {
            font-weight: 700;
            font-size: 12px;
            color: #2d3748;
            margin-bottom: 0;
            margin-top: 0;
            line-height: 1.2;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .preparation-instructions .section-content {
            padding: 8px 10px;
            margin-top: 0;
            background: #ffffff;
        }

        .preparation-instructions .section-text {
            font-size: 9px;
            color: #4a5568;
            line-height: 1.3;
            white-space: pre-line;
            margin: 0;
        }

        .footer-section {
            margin-top: 12px;
            background: linear-gradient(135deg, #ff4143 0%, #661c31 100%);
            border-radius: 6px;
            padding: 10px;
            border: none;
            box-shadow: 0 2px 6px rgba(255, 65, 67, 0.2);
            page-break-inside: avoid;
            color: white;
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
            color: rgba(255, 255, 255, 0.9);
            margin-right: 12px;
            flex-shrink: 0;
        }

        .footer-label {
            font-weight: 600;
            color: white;
        }

        .footer-value {
            margin-left: 8px;
            color: rgba(255, 255, 255, 0.9);
        }

        .disclaimer {
            font-size: 10px;
            color: #64748b;
            font-style: italic;
            line-height: 1.6;
            margin-top: 20px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
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
        <!-- Page 1 Header mit korrektem UTF-8 Encoding -->
        <div class="header">
            <img src="${brueggenLogoBase64}" alt="Brüggen Logo" style="height: 30px; width: auto; position: absolute; left: 12px; top: 50%; transform: translateY(-50%);" />
            <div class="header-content" style="width: calc(100% - 160px); text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);">
                <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: white; letter-spacing: 0.3px; text-rendering: optimizeLegibility; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);">Product Information</h1>
                <div class="product-number" style="font-size: 11px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">${formData.productNumber || "Recipe number"}</div>
            </div>
            <div class="page-number" style="font-size: 10px; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: rgba(255, 255, 255, 0.9); background: rgba(255, 255, 255, 0.1); padding: 3px 6px; border-radius: 8px; backdrop-filter: blur(10px);">Page 1</div>
        </div>

        <!-- Product name Section -->
        <div class="product-name-section avoid-break">
            <span class="product-name-label">Product name</span>
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

        <!-- Page 2 Header mit korrektem UTF-8 Encoding und nur einem Seitenumbruch -->
        ${formData.nutrition ? `
        <div class="header" style="page-break-before: always; break-before: page; page-break-inside: avoid; break-inside: avoid; margin-top: 0;">
            <img src="${brueggenLogoBase64}" alt="Brüggen Logo" style="height: 30px; width: auto; position: absolute; left: 12px; top: 50%; transform: translateY(-50%);" />
            <div class="header-content" style="width: calc(100% - 160px); text-align: center; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);">
                <h1 style="margin: 0; font-size: 16px; font-weight: 700; color: white; letter-spacing: 0.3px; text-rendering: optimizeLegibility; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);">Product Information</h1>
                <div class="product-number" style="font-size: 11px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">${formData.productNumber || "Recipe number"}</div>
            </div>
            <div class="page-number" style="font-size: 10px; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: rgba(255, 255, 255, 0.9); background: rgba(255, 255, 255, 0.1); padding: 3px 6px; border-radius: 8px; backdrop-filter: blur(10px);">Page 2</div>
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

        <!-- Storage Conditions mit optimiertem Abstand -->
        <div class="storage-conditions avoid-break">
            <div class="section-header">
                <h3 class="section-title">Storage Conditions</h3>
            </div>
            <div class="section-content">
                <div class="section-text">
                    ${formData.storageConditions || "Storage conditions will be generated based on product type selection..."}
                </div>
            </div>
        </div>

        <!-- Allergy Advice mit optimiertem Abstand -->
        <div class="allergy-advice avoid-break">
            <div class="section-header">
                <h3 class="section-title">Allergy Advice</h3>
            </div>
            <div class="section-content">
                <div class="section-text">
                    ${formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products."}
                </div>
            </div>
        </div>

        <!-- Preparation Instructions mit optimiertem Abstand - immer anzeigen -->
        <div class="preparation-instructions avoid-break">
            <div class="section-header">
                <h3 class="section-title">Preparation Instructions</h3>
            </div>
            <div class="section-content">
                <div class="section-text">
                    ${formData.preparation || "Preparation instructions will be provided based on product type..."}
                </div>
            </div>
        </div>

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