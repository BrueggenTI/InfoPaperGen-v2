
import { ProductInfo } from "@shared/schema";

/**
 * Generiert ein sauberes HTML-Template für PDF-Generierung
 * Dieses Template enthält nur die Formular-Daten ohne andere Webseiten-Elemente
 */
export function generatePDFTemplate(formData: ProductInfo): string {
  const calculateNutriScore = (nutrition: any) => {
    if (!nutrition) return 'C';
    // Vereinfachte Nutri-Score Berechnung
    const energy = parseFloat(nutrition.energy?.kcal || '0');
    const saturatedFat = parseFloat(nutrition.saturatedFat || '0');
    const sugars = parseFloat(nutrition.sugars || '0');
    const sodium = parseFloat(nutrition.sodium || '0');
    const fiber = parseFloat(nutrition.fiber || '0');
    const protein = parseFloat(nutrition.protein || '0');
    
    let score = 0;
    if (energy > 335) score += 10;
    else if (energy > 270) score += 8;
    else if (energy > 210) score += 6;
    else if (energy > 160) score += 4;
    else if (energy > 80) score += 2;
    
    if (saturatedFat > 10) score += 10;
    else if (saturatedFat > 7) score += 8;
    else if (saturatedFat > 4) score += 6;
    else if (saturatedFat > 2) score += 4;
    else if (saturatedFat > 1) score += 2;

    if (sugars > 45) score += 10;
    else if (sugars > 31) score += 8;
    else if (sugars > 22.5) score += 6;
    else if (sugars > 13.5) score += 4;
    else if (sugars > 4.5) score += 2;

    if (sodium > 900) score += 10;
    else if (sodium > 630) score += 8;
    else if (sodium > 360) score += 6;
    else if (sodium > 180) score += 4;
    else if (sodium > 90) score += 2;

    if (fiber > 4.7) score -= 5;
    else if (fiber > 3.7) score -= 4;
    else if (fiber > 2.8) score -= 3;
    else if (fiber > 1.9) score -= 2;
    else if (fiber > 0.9) score -= 1;

    if (protein > 8) score -= 5;
    else if (protein > 6.4) score -= 4;
    else if (protein > 4.8) score -= 3;
    else if (protein > 3.2) score -= 2;
    else if (protein > 1.6) score -= 1;

    if (score < -1) return 'A';
    if (score <= 2) return 'B';
    if (score <= 10) return 'C';
    if (score <= 18) return 'D';
    return 'E';
  };

  const getNutriScoreColor = (score: string) => {
    const colors = {
      'A': '#038141',
      'B': '#85BB2F', 
      'C': '#FECB02',
      'D': '#EE8100',
      'E': '#E63E11'
    };
    return colors[score as keyof typeof colors] || '#999';
  };

  const nutriScore = calculateNutriScore(formData.nutrition);
  const nutriScoreColor = getNutriScoreColor(nutriScore);

  return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Information - ${formData.productName || 'Unbenanntes Produkt'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .pdf-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 15mm;
            background: white;
        }
        
        .header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo-section h1 {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
        }
        
        .company-info {
            text-align: right;
            font-size: 12px;
            color: #6b7280;
        }
        
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .product-header {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        
        .product-name {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .product-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 14px;
        }
        
        .meta-item {
            display: flex;
            justify-content: space-between;
        }
        
        .meta-label {
            font-weight: 600;
            color: #4b5563;
        }
        
        .meta-value {
            color: #1f2937;
        }
        
        .nutrition-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        
        .nutrition-table th,
        .nutrition-table td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .nutrition-table th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
        }
        
        .nutrition-table td:last-child {
            text-align: right;
            font-weight: 500;
        }
        
        .ingredients-list {
            background: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .nutri-score {
            display: inline-flex;
            align-items: center;
            background: ${nutriScoreColor};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 16px;
        }
        
        .conditions-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        
        .condition-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background: #f0f9ff;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .condition-check {
            color: #059669;
            margin-right: 8px;
            font-weight: bold;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }
        
        @media print {
            body { margin: 0; }
            .pdf-container { margin: 0; padding: 10mm; }
        }
    </style>
</head>
<body>
    <div class="pdf-container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <h1>Product Information</h1>
            </div>
            <div class="company-info">
                <div><strong>Brüggen KG</strong></div>
                <div>Erstellt am: ${new Date().toLocaleDateString('de-DE')}</div>
            </div>
        </div>

        <!-- Produkt-Übersicht -->
        <div class="product-header">
            <div class="product-name">${formData.productName || 'Unbenanntes Produkt'}</div>
            <div class="product-meta">
                <div class="meta-item">
                    <span class="meta-label">Artikel-Nr.:</span>
                    <span class="meta-value">${formData.articleNumber || 'Nicht angegeben'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">EAN:</span>
                    <span class="meta-value">${formData.ean || 'Nicht angegeben'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Nettogewicht:</span>
                    <span class="meta-value">${formData.weight || 'Nicht angegeben'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Nutri-Score:</span>
                    <span class="nutri-score">${nutriScore}</span>
                </div>
            </div>
        </div>

        <!-- Produktbeschreibung -->
        ${formData.description ? `
        <div class="section">
            <h2 class="section-title">Produktbeschreibung</h2>
            <p>${formData.description}</p>
        </div>
        ` : ''}

        <!-- Zutaten -->
        ${formData.ingredients && formData.ingredients.length > 0 ? `
        <div class="section">
            <h2 class="section-title">Zutaten</h2>
            <div class="ingredients-list">
                ${formData.ingredients.map(ingredient => ingredient.name).join(', ')}
            </div>
        </div>
        ` : ''}

        <!-- Nährwerte -->
        ${formData.nutrition ? `
        <div class="section">
            <h2 class="section-title">Nährwerte je 100g</h2>
            <table class="nutrition-table">
                <thead>
                    <tr>
                        <th>Nährstoff</th>
                        <th>Menge</th>
                    </tr>
                </thead>
                <tbody>
                    ${formData.nutrition.energy ? `
                    <tr>
                        <td>Brennwert</td>
                        <td>${formData.nutrition.energy.kcal || 0} kcal / ${formData.nutrition.energy.kj || 0} kJ</td>
                    </tr>
                    ` : ''}
                    ${formData.nutrition.fat ? `
                    <tr>
                        <td>Fett</td>
                        <td>${formData.nutrition.fat} g</td>
                    </tr>
                    ` : ''}
                    ${formData.nutrition.saturatedFat ? `
                    <tr>
                        <td>davon gesättigte Fettsäuren</td>
                        <td>${formData.nutrition.saturatedFat} g</td>
                    </tr>
                    ` : ''}
                    ${formData.nutrition.carbohydrates ? `
                    <tr>
                        <td>Kohlenhydrate</td>
                        <td>${formData.nutrition.carbohydrates} g</td>
                    </tr>
                    ` : ''}
                    ${formData.nutrition.sugars ? `
                    <tr>
                        <td>davon Zucker</td>
                        <td>${formData.nutrition.sugars} g</td>
                    </tr>
                    ` : ''}
                    ${formData.nutrition.fiber ? `
                    <tr>
                        <td>Ballaststoffe</td>
                        <td>${formData.nutrition.fiber} g</td>
                    </tr>
                    ` : ''}
                    ${formData.nutrition.protein ? `
                    <tr>
                        <td>Eiweiß</td>
                        <td>${formData.nutrition.protein} g</td>
                    </tr>
                    ` : ''}
                    ${formData.nutrition.salt ? `
                    <tr>
                        <td>Salz</td>
                        <td>${formData.nutrition.salt} g</td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>
        </div>
        ` : ''}

        <!-- Lager- und Verwendungshinweise -->
        ${(formData.storageConditions || formData.shelfLife) ? `
        <div class="section">
            <h2 class="section-title">Lager- und Verwendungshinweise</h2>
            ${formData.storageConditions ? `<p><strong>Lagerung:</strong> ${formData.storageConditions}</p>` : ''}
            ${formData.shelfLife ? `<p><strong>Mindesthaltbarkeitsdatum:</strong> ${formData.shelfLife}</p>` : ''}
        </div>
        ` : ''}

        <!-- Allergene und Hinweise -->
        ${(formData.allergens && formData.allergens.length > 0) || formData.additionalNotes ? `
        <div class="section">
            <h2 class="section-title">Allergene und Hinweise</h2>
            ${formData.allergens && formData.allergens.length > 0 ? `
            <p><strong>Allergene:</strong> ${formData.allergens.join(', ')}</p>
            ` : ''}
            ${formData.additionalNotes ? `
            <p><strong>Zusätzliche Hinweise:</strong> ${formData.additionalNotes}</p>
            ` : ''}
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <p>Dieses Dokument wurde automatisch generiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
            <p>© ${new Date().getFullYear()} Brüggen KG - Alle Rechte vorbehalten</p>
        </div>
    </div>
</body>
</html>
  `;
}
