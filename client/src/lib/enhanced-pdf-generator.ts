
import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore, getNutriScoreColor } from "./nutri-score";
import { calculateClaims } from "./claims-calculator";

export async function generateEnhancedPDF(formData: ProductInfo) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10; // Reduced margin to match Live Preview
  let yPosition = margin;
  
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  // Helper functions for EXACT Live Preview matching
  const addText = (text: string, x: number, y: number, options: {
    fontSize?: number;
    fontStyle?: 'normal' | 'bold';
    align?: 'left' | 'center' | 'right';
    color?: [number, number, number];
    maxWidth?: number;
  } = {}) => {
    pdf.setFontSize(options.fontSize || 10);
    pdf.setFont("helvetica", options.fontStyle || "normal");
    if (options.color) {
      pdf.setTextColor(options.color[0], options.color[1], options.color[2]);
    } else {
      pdf.setTextColor(0, 0, 0);
    }
    
    if (options.maxWidth) {
      const lines = pdf.splitTextToSize(text, options.maxWidth);
      pdf.text(lines, x, y, { align: options.align || 'left' });
      return lines.length * (options.fontSize || 10) * 0.35;
    } else {
      pdf.text(text, x, y, { align: options.align || 'left' });
      return (options.fontSize || 10) * 0.35;
    }
  };

  // Draw white card with subtle shadow - EXACT Live Preview styling
  const drawCard = (x: number, y: number, width: number, height: number) => {
    // Subtle shadow effect
    pdf.setFillColor(0, 0, 0, 0.05);
    pdf.roundedRect(x + 0.5, y + 0.5, width, height, 2, 2, 'F');
    
    // White background
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Light border - exact Live Preview color
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x, y, width, height, 2, 2, 'S');
  };

  // Gradient header for sections - EXACT Live Preview colors
  const drawSectionHeader = (x: number, y: number, width: number, height: number) => {
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.roundedRect(x, y, width, height, 2, 2, 'F');
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.1);
    pdf.roundedRect(x, y, width, height, 2, 2, 'S');
  };

  // DOCUMENT CONTAINER - EXACT Live Preview layout
  const documentWidth = pageWidth - 2 * margin;
  const documentX = margin;
  
  // Main document card
  drawCard(documentX, yPosition, documentWidth, pageHeight - 2 * margin);
  
  // Content padding inside card
  const contentPadding = 4;
  const contentX = documentX + contentPadding;
  const contentWidth = documentWidth - 2 * contentPadding;
  yPosition += contentPadding;

  // === HEADER SECTION - EXACT Live Preview ===
  const headerHeight = 12;
  drawSectionHeader(contentX, yPosition, contentWidth, headerHeight);
  
  // Load Brüggen logo
  const loadLogo = async (): Promise<string | null> => {
    try {
      const response = await fetch('/src/assets/brueggen-logo.png');
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const logoDataUrl = await loadLogo();
  
  // Logo (left)
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', contentX + 2, yPosition + 1.5, 10, 6);
    } catch {
      addText("Brüggen", contentX + 2, yPosition + 6, { 
        fontSize: 10, 
        fontStyle: 'bold', 
        color: [220, 38, 127] 
      });
    }
  } else {
    addText("Brüggen", contentX + 2, yPosition + 6, { 
      fontSize: 10, 
      fontStyle: 'bold', 
      color: [220, 38, 127] 
    });
  }
  
  // Center title - EXACT Live Preview
  addText("Product Information", pageWidth / 2, yPosition + 4.5, { 
    fontSize: 12, 
    fontStyle: 'bold', 
    align: 'center', 
    color: [51, 65, 85] // slate-700
  });
  addText(formData.productNumber || "Recipe Number", pageWidth / 2, yPosition + 8, { 
    fontSize: 9, 
    fontStyle: 'bold', 
    align: 'center', 
    color: [51, 65, 85]
  });
  
  // Page number (right)
  const pageBadgeX = pageWidth - margin - 18;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(pageBadgeX, yPosition + 2, 14, 4, 1, 1, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.1);
  pdf.roundedRect(pageBadgeX, yPosition + 2, 14, 4, 1, 1, 'S');
  addText("Page 1", pageBadgeX + 7, yPosition + 5, { 
    fontSize: 6, 
    align: 'center', 
    color: [71, 85, 105] 
  });
  
  yPosition += headerHeight + 3;

  // === PRODUCT NAME SECTION - EXACT Live Preview ===
  const productNameHeight = 16;
  drawSectionHeader(contentX, yPosition, contentWidth, productNameHeight);
  
  addText("PRODUCT NAME", pageWidth / 2, yPosition + 4, { 
    fontSize: 6, 
    color: [100, 116, 139], // slate-500
    align: 'center',
    fontStyle: 'bold'
  });
  
  const productName = formData.productName || "Product name will appear here...";
  addText(productName, pageWidth / 2, yPosition + 10, { 
    fontSize: 11, 
    fontStyle: 'bold', 
    align: 'center',
    color: [217, 119, 6], // amber-600
    maxWidth: contentWidth - 8
  });
  yPosition += productNameHeight + 3;

  // === PRODUCT IMAGE SECTION ===
  if (formData.productImage) {
    const imageHeight = 25;
    drawCard(contentX, yPosition, contentWidth, imageHeight);
    
    try {
      if (formData.productImage.startsWith('data:')) {
        pdf.addImage(formData.productImage, 'JPEG', contentX + 2, yPosition + 2, contentWidth - 4, imageHeight - 4);
      } else {
        addText("📷 Product Image", pageWidth / 2, yPosition + imageHeight/2, { 
          fontSize: 10, 
          align: 'center',
          color: [100, 116, 139]
        });
      }
    } catch {
      addText("📷 Product Image", pageWidth / 2, yPosition + imageHeight/2, { 
        fontSize: 10, 
        align: 'center',
        color: [100, 116, 139]
      });
    }
    yPosition += imageHeight + 3;
  }

  // === INGREDIENTS SECTION - EXACT Live Preview ===
  const ingredientsHeight = 35;
  drawCard(contentX, yPosition, contentWidth, ingredientsHeight);
  
  // Header
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.roundedRect(contentX, yPosition, contentWidth, 6, 2, 2, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(contentX, yPosition + 6, contentX + contentWidth, yPosition + 6);
  
  addText("Ingredients", contentX + 2, yPosition + 4, { 
    fontSize: 9, 
    fontStyle: 'bold', 
    color: [51, 65, 85] 
  });
  
  // Format ingredients EXACTLY like Live Preview
  const formatIngredientsText = () => {
    const finalIngredients = formData.ingredients || [];
    const baseIngredients = formData.baseProductIngredients || [];
    
    if (finalIngredients.length === 0 && baseIngredients.length === 0) {
      return "Ingredients will appear here after extraction...";
    }

    const baseFormatted = baseIngredients
      .filter(ingredient => ingredient.name.trim() !== "")
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` ${ingredient.percentage}%*` : '';
        return `${ingredient.name}${percentage}`;
      })
      .join(', ');

    const finalFormatted = finalIngredients
      .filter(ingredient => ingredient.name.trim() !== "")
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` (${ingredient.percentage}%)` : '';
        let ingredientText = `${ingredient.name}${percentage}`;
        
        if (ingredient.isMarkedAsBase && baseFormatted) {
          ingredientText = `${ingredientText} [${baseFormatted}]`;
        }
        
        return ingredientText;
      })
      .join(', ');
    
    return finalFormatted || "Ingredients will appear here after extraction...";
  };

  const ingredientsText = formatIngredientsText();
  addText(ingredientsText, contentX + 2, yPosition + 9, { 
    maxWidth: contentWidth - 4,
    fontSize: 8,
    color: [71, 85, 105] 
  });
  
  // Asterisk note
  if ((formData.baseProductIngredients || []).length > 0) {
    addText("* percentage in ingredient", contentX + 2, yPosition + ingredientsHeight - 3, { 
      fontSize: 6, 
      color: [100, 116, 139] 
    });
  }
  
  yPosition += ingredientsHeight + 3;

  // === QUALITY ASSURANCE BOX - EXACT Live Preview blue styling ===
  const qualityHeight = 18;
  
  // Blue left border accent
  pdf.setFillColor(96, 165, 250); // blue-400
  pdf.rect(contentX - 1, yPosition, 2, qualityHeight, 'F');
  
  // Light blue background
  pdf.setFillColor(239, 246, 255); // blue-50
  pdf.roundedRect(contentX + 1, yPosition, contentWidth - 1, qualityHeight, 1, 1, 'F');
  pdf.setDrawColor(191, 219, 254); // blue-200
  pdf.setLineWidth(0.1);
  pdf.roundedRect(contentX + 1, yPosition, contentWidth - 1, qualityHeight, 1, 1, 'S');
  
  // Warning icon
  addText("⚠", contentX + 3, yPosition + 4, { 
    fontSize: 8, 
    color: [96, 165, 250] 
  });
  
  const qualityText = "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.";
  addText(qualityText, contentX + 8, yPosition + 3, { 
    maxWidth: contentWidth - 12,
    fontSize: 6,
    color: [30, 64, 175] // blue-800
  });
  
  yPosition += qualityHeight + 5;

  // === DETAILED INGREDIENTS TABLE - EXACT Live Preview ===
  if ((formData.ingredients || []).length > 0 || (formData.baseProductIngredients || []).length > 0) {
    const tableHeight = 40;
    
    drawCard(contentX, yPosition, contentWidth, tableHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(contentX, yPosition, contentWidth, 6, 2, 2, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.line(contentX, yPosition + 6, contentX + contentWidth, yPosition + 6);
    
    addText("Detailed Ingredients Breakdown", contentX + 2, yPosition + 4, { 
      fontSize: 9, 
      fontStyle: 'bold', 
      color: [51, 65, 85] 
    });
    yPosition += 8;
    
    // Table columns
    const tableWidth = contentWidth - 4;
    const colWidths = [tableWidth * 0.5, tableWidth * 0.3, tableWidth * 0.2];
    const colX = [
      contentX + 2, 
      contentX + 2 + colWidths[0], 
      contentX + 2 + colWidths[0] + colWidths[1]
    ];
    
    // Header row
    pdf.setFillColor(248, 250, 252);
    pdf.rect(colX[0], yPosition, colWidths[0] + colWidths[1] + colWidths[2], 5, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(colX[0], yPosition, colWidths[0] + colWidths[1] + colWidths[2], 5, 'S');
    
    addText("Ingredients", colX[0] + 1, yPosition + 3, { fontSize: 7, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Percentage content", colX[1] + 1, yPosition + 3, { fontSize: 7, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Country of Origin", colX[2] + 1, yPosition + 3, { fontSize: 7, fontStyle: 'bold', color: [71, 85, 105] });
    
    // Column separators
    pdf.line(colX[1], yPosition, colX[1], yPosition + 5);
    pdf.line(colX[2], yPosition, colX[2], yPosition + 5);
    
    yPosition += 6;
    
    // Generate table data EXACTLY like Live Preview
    const generateTableIngredients = () => {
      const finalIngredients = formData.ingredients || [];
      const baseIngredients = formData.baseProductIngredients || [];
      const markedIngredientPercentage = finalIngredients.find(ing => ing.isMarkedAsBase)?.percentage || 0;
      const tableIngredients: Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> = [];
      
      finalIngredients
        .filter(ingredient => ingredient.name.trim() !== "")
        .forEach(ingredient => {
          if (ingredient.isMarkedAsBase && baseIngredients.length > 0) {
            tableIngredients.push({
              name: ingredient.name,
              percentage: ingredient.percentage || 0,
              origin: ingredient.origin || "",
              isFinalProduct: true
            });
            
            baseIngredients
              .filter(baseIng => baseIng.name.trim())
              .forEach(baseIng => {
                const wholeProductPercentage = baseIng.percentage 
                  ? +((baseIng.percentage * markedIngredientPercentage) / 100).toFixed(1)
                  : 0;
                tableIngredients.push({
                  name: `  ${baseIng.name}`,
                  percentage: wholeProductPercentage,
                  origin: baseIng.origin || "",
                  isFinalProduct: false
                });
              });
          } else {
            tableIngredients.push({
              name: ingredient.name,
              percentage: ingredient.percentage || 0,
              origin: ingredient.origin || "",
              isFinalProduct: true
            });
          }
        });
      
      return tableIngredients.slice(0, 5);
    };
    
    const tableIngredients = generateTableIngredients();
    
    // Table rows
    tableIngredients.forEach((ingredient, index) => {
      const rowY = yPosition;
      const rowHeight = 4;
      
      // Alternating colors
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(colX[0], rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.05);
      pdf.rect(colX[0], rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, 'S');
      
      addText(ingredient.name, colX[0] + 1, rowY + 2.5, { 
        fontSize: 6, 
        fontStyle: ingredient.isFinalProduct ? 'bold' : 'normal',
        color: ingredient.isFinalProduct ? [51, 65, 85] : [100, 116, 139],
        maxWidth: colWidths[0] - 2
      });
      addText(`${ingredient.percentage}%`, colX[1] + 1, rowY + 2.5, { fontSize: 6, color: [71, 85, 105] });
      addText(ingredient.origin || "-", colX[2] + 1, rowY + 2.5, { fontSize: 6, color: [100, 116, 139] });
      
      pdf.line(colX[1], rowY, colX[1], rowY + rowHeight);
      pdf.line(colX[2], rowY, colX[2], rowY + rowHeight);
      
      yPosition += rowHeight;
    });
    
    yPosition += 5;
  }

  // === PAGE BREAK INDICATOR ===
  if (formData.nutrition) {
    yPosition += 8;
    
    // Red dashed line
    pdf.setDrawColor(252, 165, 165);
    pdf.setLineWidth(0.3);
    const dashLength = 2;
    const gapLength = 1.5;
    let currentX = contentX;
    const lineEnd = contentX + contentWidth;
    
    while (currentX < lineEnd) {
      const nextX = Math.min(currentX + dashLength, lineEnd);
      pdf.line(currentX, yPosition, nextX, yPosition);
      currentX = nextX + gapLength;
    }
    
    // Page break badge
    pdf.setFillColor(254, 242, 242);
    pdf.setDrawColor(252, 165, 165);
    const badgeWidth = 70;
    const badgeX = (pageWidth - badgeWidth) / 2;
    pdf.roundedRect(badgeX, yPosition - 2, badgeWidth, 4, 2, 2, 'F');
    pdf.roundedRect(badgeX, yPosition - 2, badgeWidth, 4, 2, 2, 'S');
    
    addText("📄 Page Break - Page 2 begins here", pageWidth / 2, yPosition, { 
      fontSize: 6, 
      color: [185, 28, 28],
      align: 'center',
      fontStyle: 'bold'
    });
    
    // Bottom dashed line
    currentX = contentX;
    while (currentX < lineEnd) {
      const nextX = Math.min(currentX + dashLength, lineEnd);
      pdf.line(currentX, yPosition + 2, nextX, yPosition + 2);
      currentX = nextX + gapLength;
    }
    
    // === NEW PAGE ===
    pdf.addPage();
    yPosition = margin + contentPadding;
    
    // PAGE 2 - Same document structure
    drawCard(documentX, margin, documentWidth, pageHeight - 2 * margin);
    
    // PAGE 2 Header
    drawSectionHeader(contentX, yPosition, contentWidth, headerHeight);
    
    // Logo
    if (logoDataUrl) {
      try {
        pdf.addImage(logoDataUrl, 'PNG', contentX + 2, yPosition + 1.5, 10, 6);
      } catch {
        addText("Brüggen", contentX + 2, yPosition + 6, { 
          fontSize: 10, 
          fontStyle: 'bold', 
          color: [220, 38, 127] 
        });
      }
    } else {
      addText("Brüggen", contentX + 2, yPosition + 6, { 
        fontSize: 10, 
        fontStyle: 'bold', 
        color: [220, 38, 127] 
      });
    }
    
    addText("Product Information", pageWidth / 2, yPosition + 4.5, { 
      fontSize: 12, 
      fontStyle: 'bold', 
      align: 'center', 
      color: [51, 65, 85]
    });
    addText(formData.productNumber || "Recipe Number", pageWidth / 2, yPosition + 8, { 
      fontSize: 9, 
      fontStyle: 'bold', 
      align: 'center', 
      color: [51, 65, 85]
    });
    
    // Page 2 badge
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(pageBadgeX, yPosition + 2, 14, 4, 1, 1, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(pageBadgeX, yPosition + 2, 14, 4, 1, 1, 'S');
    addText("Page 2", pageBadgeX + 7, yPosition + 5, { 
      fontSize: 6, 
      align: 'center', 
      color: [71, 85, 105]
    });
    
    yPosition += headerHeight + 3;
    
    // === NUTRITION TABLE - EXACT Live Preview ===
    const nutrition = formData.nutrition;
    const nutritionHeight = 50;
    
    drawCard(contentX, yPosition, contentWidth, nutritionHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(contentX, yPosition, contentWidth, 6, 2, 2, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.line(contentX, yPosition + 6, contentX + contentWidth, yPosition + 6);
    
    addText("Average Nutritional Value", contentX + 2, yPosition + 4, { 
      fontSize: 9, 
      fontStyle: 'bold', 
      color: [51, 65, 85]
    });
    yPosition += 8;
    
    // Nutrition table columns
    const nutritionTableWidth = contentWidth - 4;
    const nutritionCols = [nutritionTableWidth * 0.4, nutritionTableWidth * 0.3, nutritionTableWidth * 0.3];
    const nutritionColX = [
      contentX + 2,
      contentX + 2 + nutritionCols[0],
      contentX + 2 + nutritionCols[0] + nutritionCols[1]
    ];
    
    // Header row
    pdf.setFillColor(248, 250, 252);
    pdf.rect(nutritionColX[0], yPosition, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 5, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(nutritionColX[0], yPosition, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 5, 'S');
    
    addText("Nutrient", nutritionColX[0] + 1, yPosition + 3, { fontSize: 7, fontStyle: 'bold', color: [71, 85, 105] });
    addText("per 100 g", nutritionColX[1] + 1, yPosition + 3, { fontSize: 7, fontStyle: 'bold', color: [71, 85, 105] });
    addText(`per ${servingSize} g`, nutritionColX[2] + 1, yPosition + 3, { fontSize: 7, fontStyle: 'bold', color: [71, 85, 105] });
    
    pdf.line(nutritionColX[1], yPosition, nutritionColX[1], yPosition + 5);
    pdf.line(nutritionColX[2], yPosition, nutritionColX[2], yPosition + 5);
    
    yPosition += 6;
    
    // Nutrition rows
    const calculatePerServing = (per100g: number) => (per100g * servingSize / 100).toFixed(1);
    
    const nutritionRows = [
      { 
        label: "Energy", 
        value100g: `${nutrition.energy?.kj || 0} kJ / ${nutrition.energy?.kcal || 0} kcal`,
        valueServing: `${calculatePerServing(nutrition.energy?.kj || 0)} kJ / ${calculatePerServing(nutrition.energy?.kcal || 0)} kcal`,
        isMain: true
      },
      { label: "Fat", value100g: `${nutrition.fat || 0} g`, valueServing: `${calculatePerServing(nutrition.fat || 0)} g`, isMain: true },
      { label: "of which saturates", value100g: `${nutrition.saturatedFat || 0} g`, valueServing: `${calculatePerServing(nutrition.saturatedFat || 0)} g`, isMain: false },
      { label: "Carbohydrates", value100g: `${nutrition.carbohydrates || 0} g`, valueServing: `${calculatePerServing(nutrition.carbohydrates || 0)} g`, isMain: true },
      { label: "of which sugars", value100g: `${nutrition.sugars || 0} g`, valueServing: `${calculatePerServing(nutrition.sugars || 0)} g`, isMain: false },
      { label: "Fibre", value100g: `${nutrition.fiber || 0} g`, valueServing: `${calculatePerServing(nutrition.fiber || 0)} g`, isMain: true },
      { label: "Protein", value100g: `${nutrition.protein || 0} g`, valueServing: `${calculatePerServing(nutrition.protein || 0)} g`, isMain: true },
      { label: "Salt", value100g: `${nutrition.salt || 0} g`, valueServing: `${calculatePerServing(nutrition.salt || 0)} g`, isMain: true }
    ];
    
    nutritionRows.forEach((row, index) => {
      const rowY = yPosition;
      const rowHeight = 4;
      
      // Alternating colors
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(nutritionColX[0], rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249);
      pdf.rect(nutritionColX[0], rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], rowHeight, 'S');
      
      const indentedLabel = row.label.startsWith('of which') ? `    ${row.label}` : row.label;
      const labelStyle = row.isMain ? 'bold' : 'normal';
      const labelColor: [number, number, number] = row.isMain ? [51, 65, 85] : [100, 116, 139];
      
      addText(indentedLabel, nutritionColX[0] + 1, rowY + 2.5, { fontSize: 6, fontStyle: labelStyle, color: labelColor });
      addText(row.value100g, nutritionColX[1] + 1, rowY + 2.5, { fontSize: 6, color: [71, 85, 105] });
      addText(row.valueServing, nutritionColX[2] + 1, rowY + 2.5, { fontSize: 6, color: [71, 85, 105] });
      
      pdf.line(nutritionColX[1], rowY, nutritionColX[1], rowY + rowHeight);
      pdf.line(nutritionColX[2], rowY, nutritionColX[2], rowY + rowHeight);
      
      yPosition += rowHeight;
    });
    
    yPosition += 8;

    // === NUTRI-SCORE AND CLAIMS - EXACT Live Preview side by side ===
    const twoColumnWidth = (contentWidth - 3) / 2;
    
    // Nutri-Score (left)
    const nutriScoreResult = calculateNutriScore({
      energy: nutrition.energy || { kj: 0, kcal: 0 },
      fat: nutrition.fat || 0,
      saturatedFat: nutrition.saturatedFat || 0,
      carbohydrates: nutrition.carbohydrates || 0,
      sugars: nutrition.sugars || 0,
      fiber: nutrition.fiber || 0,
      protein: nutrition.protein || 0,
      salt: nutrition.salt || 0,
      fruitVegLegumeContent: nutrition.fruitVegLegumeContent || 0
    });
    
    const nutriScoreHeight = 22;
    drawCard(contentX, yPosition, twoColumnWidth, nutriScoreHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(contentX, yPosition, twoColumnWidth, 6, 2, 2, 'F');
    pdf.line(contentX, yPosition + 6, contentX + twoColumnWidth, yPosition + 6);
    
    addText("Nutri-Score Rating", contentX + 2, yPosition + 4, { 
      fontSize: 8, 
      fontStyle: 'bold', 
      color: [51, 65, 85]
    });
    
    // Nutri-Score grade
    const gradeY = yPosition + 10;
    const gradeColors: { [key: string]: [number, number, number] } = {
      'A': [21, 128, 61],
      'B': [132, 204, 22],
      'C': [234, 179, 8],
      'D': [249, 115, 22],
      'E': [239, 68, 68]
    };
    
    const gradeColor = gradeColors[nutriScoreResult.nutriGrade] || [0, 0, 0];
    
    // Colored circle
    pdf.setFillColor(gradeColor[0], gradeColor[1], gradeColor[2]);
    pdf.circle(contentX + 15, gradeY + 2, 4, 'F');
    
    addText(nutriScoreResult.nutriGrade, contentX + 15, gradeY + 3, { 
      fontSize: 10, 
      fontStyle: 'bold', 
      align: 'center',
      color: [255, 255, 255]
    });
    
    addText(`Grade: ${nutriScoreResult.nutriGrade} • Score: ${nutriScoreResult.finalScore}`, contentX + 2, yPosition + 19, { 
      fontSize: 6, 
      color: [71, 85, 105]
    });

    // Claims (right)
    const claimsX = contentX + twoColumnWidth + 3;
    
    drawCard(claimsX, yPosition, twoColumnWidth, nutriScoreHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(claimsX, yPosition, twoColumnWidth, 6, 2, 2, 'F');
    pdf.line(claimsX, yPosition + 6, claimsX + twoColumnWidth, yPosition + 6);
    
    addText("Possible Declarations", claimsX + 2, yPosition + 4, { 
      fontSize: 8, 
      fontStyle: 'bold', 
      color: [51, 65, 85]
    });
    
    // Claims calculation
    const claimsResult = calculateClaims({
      protein: nutrition.protein || 0,
      fiber: nutrition.fiber || 0,
      salt: nutrition.salt || 0,
      sugars: nutrition.sugars || 0,
      fat: nutrition.fat || 0,
      saturatedFat: nutrition.saturatedFat || 0
    });

    const allPossibleClaims = [
      { label: "High fibre", claim: claimsResult.fiber.bestClaim },
      { label: "High protein", claim: claimsResult.protein.bestClaim },
      { label: "Low salt", claim: claimsResult.salt.bestClaim },
      { label: "Low sugar", claim: claimsResult.sugar.bestClaim }
    ];

    const claimsToShow = allPossibleClaims.filter(item => item.claim);

    if (formData.declarations?.wholegrain) {
      claimsToShow.push({ label: "Wholegrain", claim: "✓" });
    }

    if (claimsToShow.length === 0) {
      addText("No claims available", claimsX + 2, yPosition + 12, { 
        fontSize: 6, 
        color: [100, 116, 139]
      });
    } else {
      claimsToShow.slice(0, 3).forEach((claim, index) => {
        const claimY = yPosition + 8 + (index * 3);
        
        // Green background
        pdf.setFillColor(240, 253, 244);
        pdf.roundedRect(claimsX + 1, claimY - 0.5, twoColumnWidth - 2, 2.5, 0.5, 0.5, 'F');
        pdf.setDrawColor(187, 247, 208);
        pdf.roundedRect(claimsX + 1, claimY - 0.5, twoColumnWidth - 2, 2.5, 0.5, 0.5, 'S');
        
        addText(claim.label, claimsX + 2, claimY + 1, { fontSize: 5, color: [71, 85, 105] });
        
        // Green badge
        pdf.setFillColor(22, 163, 74);
        const badgeWidth = 8;
        pdf.roundedRect(claimsX + twoColumnWidth - badgeWidth - 2, claimY - 0.2, badgeWidth, 1.5, 0.5, 0.5, 'F');
        
        addText(claim.claim || '', claimsX + twoColumnWidth - badgeWidth + 2, claimY + 0.8, { 
          fontSize: 4, 
          color: [255, 255, 255],
          align: 'center'
        });
      });
    }
    
    yPosition += nutriScoreHeight + 5;
  }

  // === STORAGE CONDITIONS ===
  const storageHeight = 18;
  drawCard(contentX, yPosition, contentWidth, storageHeight);
  
  // Header
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(contentX, yPosition, contentWidth, 6, 2, 2, 'F');
  pdf.line(contentX, yPosition + 6, contentX + contentWidth, yPosition + 6);
  
  addText("Storage Conditions", contentX + 2, yPosition + 4, { 
    fontSize: 9, 
    fontStyle: 'bold', 
    color: [51, 65, 85]
  });
  
  addText("📦", contentX + 2, yPosition + 10, { 
    fontSize: 8, 
    color: [59, 130, 246]
  });
  
  const storageText = formData.storageConditions || "Storage conditions will be generated based on product type selection...";
  addText(storageText, contentX + 8, yPosition + 8, { 
    maxWidth: contentWidth - 12,
    fontSize: 7,
    color: [71, 85, 105]
  });
  
  yPosition += storageHeight + 3;

  // === ALLERGY ADVICE - EXACT Live Preview red styling ===
  const allergyHeight = 18;
  
  // Red left border
  pdf.setFillColor(248, 113, 113);
  pdf.rect(contentX - 1, yPosition, 2, allergyHeight, 'F');
  
  // Red background
  pdf.setFillColor(254, 242, 242);
  pdf.roundedRect(contentX + 1, yPosition, contentWidth - 1, allergyHeight, 1, 1, 'F');
  pdf.setDrawColor(252, 165, 165);
  pdf.roundedRect(contentX + 1, yPosition, contentWidth - 1, allergyHeight, 1, 1, 'S');
  
  addText("⚠", contentX + 3, yPosition + 4, { 
    fontSize: 8, 
    color: [239, 68, 68]
  });
  
  addText("Allergy Advice", contentX + 8, yPosition + 4, { 
    fontSize: 8, 
    fontStyle: 'bold', 
    color: [153, 27, 27]
  });
  
  const allergyText = formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";
  addText(allergyText, contentX + 8, yPosition + 7, { 
    maxWidth: contentWidth - 12,
    fontSize: 7,
    color: [153, 27, 27]
  });
  
  yPosition += allergyHeight + 3;

  // === PREPARATION INSTRUCTIONS ===
  if (formData.preparation) {
    const prepHeight = 16;
    drawCard(contentX, yPosition, contentWidth, prepHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(contentX, yPosition, contentWidth, 6, 2, 2, 'F');
    pdf.line(contentX, yPosition + 6, contentX + contentWidth, yPosition + 6);
    
    addText("Preparation Instructions", contentX + 2, yPosition + 4, { 
      fontSize: 9, 
      fontStyle: 'bold', 
      color: [51, 65, 85]
    });
    
    addText("📖", contentX + 2, yPosition + 10, { 
      fontSize: 8, 
      color: [139, 69, 19]
    });
    
    addText(formData.preparation, contentX + 8, yPosition + 8, { 
      maxWidth: contentWidth - 12,
      fontSize: 7,
      color: [71, 85, 105]
    });
    
    yPosition += prepHeight + 3;
  }

  // === FOOTER ===
  const footerY = pageHeight - 20;
  drawSectionHeader(contentX, footerY, contentWidth, 10);
  
  // Valid from (left)
  addText("📅", contentX + 2, footerY + 4, { 
    fontSize: 7, 
    color: [100, 116, 139]
  });
  addText(`Valid from: ${new Date().toLocaleDateString('en-GB')}`, contentX + 6, footerY + 4, { 
    fontSize: 7, 
    color: [71, 85, 105],
    fontStyle: 'bold'
  });
  
  // Prepared by (right)
  if (formData.preparedBy || formData.jobTitle) {
    addText("👤", pageWidth - 60, footerY + 4, { 
      fontSize: 7, 
      color: [100, 116, 139]
    });
    const preparedByText = formData.preparedBy && formData.jobTitle 
      ? `${formData.preparedBy}, ${formData.jobTitle}`
      : formData.preparedBy || formData.jobTitle || '';
    addText(`Prepared by: ${preparedByText}`, pageWidth - 56, footerY + 4, { 
      fontSize: 7, 
      color: [71, 85, 105],
      fontStyle: 'bold'
    });
  }

  // === DISCLAIMER ===
  const disclaimerY = pageHeight - 6;
  addText("The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.", 
    contentX, disclaimerY, { 
    maxWidth: contentWidth,
    fontSize: 5,
    color: [100, 116, 139]
  });

  // Save PDF
  const fileName = `${formData.productName || 'Product-Information'}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_');
  pdf.save(fileName);
}
