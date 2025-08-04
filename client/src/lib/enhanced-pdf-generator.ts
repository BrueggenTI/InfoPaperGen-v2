
import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore, getNutriScoreColor } from "./nutri-score";
import { calculateClaims } from "./claims-calculator";

export async function generateEnhancedPDF(formData: ProductInfo) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;
  
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  // Helper functions for precise Live Preview matching
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

  const drawCard = (x: number, y: number, width: number, height: number, fillColor?: [number, number, number]) => {
    // Shadow effect
    pdf.setFillColor(0, 0, 0, 0.1);
    pdf.roundedRect(x + 1, y + 1, width, height, 3, 3, 'F');
    
    // White background
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    
    // Border - exact Live Preview color (slate-200)
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, width, height, 3, 3, 'S');
    
    // Gradient background if specified
    if (fillColor) {
      pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    }
  };

  const drawGradientHeader = (x: number, y: number, width: number, height: number) => {
    // Exact Live Preview gradient from slate-50 to slate-100
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x, y, width, height, 3, 3, 'S');
  };

  // Load and embed Brüggen logo
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

  // PAGE 1 - Document Container exactly like Live Preview
  const cardWidth = pageWidth - 2 * margin;
  const cardX = margin;
  
  // Outer shadow and main card
  drawCard(cardX, yPosition, cardWidth, pageHeight - 2 * margin);
  
  // Content starts inside the card with exact padding
  const contentMargin = 6;
  yPosition += contentMargin;

  // Header Section - exactly like Live Preview
  drawGradientHeader(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 15);
  
  // Logo (left side) - exact positioning
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', cardX + contentMargin + 3, yPosition + 2, 12, 8);
    } catch {
      // Fallback to text if image fails
      addText("Brüggen", cardX + contentMargin + 3, yPosition + 9, { 
        fontSize: 11, 
        fontStyle: 'bold', 
        color: [220, 38, 127] // Brüggen brand color
      });
    }
  } else {
    addText("Brüggen", cardX + contentMargin + 3, yPosition + 9, { 
      fontSize: 11, 
      fontStyle: 'bold', 
      color: [220, 38, 127]
    });
  }
  
  // Center title - exact Live Preview styling
  addText("Product Information", pageWidth / 2, yPosition + 6, { 
    fontSize: 14, 
    fontStyle: 'bold', 
    align: 'center', 
    color: [51, 65, 85] // slate-700
  });
  addText(formData.productNumber || "Recipe Number", pageWidth / 2, yPosition + 11, { 
    fontSize: 10, 
    fontStyle: 'bold', 
    align: 'center', 
    color: [51, 65, 85]
  });
  
  // Page number badge (right) - exact Live Preview white badge
  const badgeX = pageWidth - margin - 20;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(badgeX, yPosition + 3, 15, 5, 2, 2, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(badgeX, yPosition + 3, 15, 5, 2, 2, 'S');
  addText("Page 1", badgeX + 7.5, yPosition + 7, { 
    fontSize: 7, 
    align: 'center', 
    color: [71, 85, 105] // slate-600
  });
  
  yPosition += 20;

  // Product Name Section - gradient card exactly like Live Preview
  drawGradientHeader(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 18);
  
  addText("PRODUCT NAME", pageWidth / 2, yPosition + 6, { 
    fontSize: 7, 
    color: [100, 116, 139], // slate-500
    align: 'center',
    fontStyle: 'bold'
  });
  
  // Product name with amber gradient effect
  const productName = formData.productName || "Product name will appear here...";
  addText(productName, pageWidth / 2, yPosition + 12, { 
    fontSize: 13, 
    fontStyle: 'bold', 
    align: 'center',
    color: [217, 119, 6], // amber-600
    maxWidth: cardWidth - 20
  });
  yPosition += 25;

  // Product Image Section - if exists
  if (formData.productImage) {
    const imageHeight = 30;
    drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, imageHeight);
    
    // Try to embed actual product image
    try {
      if (formData.productImage.startsWith('data:')) {
        const imageX = cardX + contentMargin + 10;
        const imageY = yPosition + 5;
        const imageW = cardWidth - 2 * contentMargin - 20;
        const imageH = imageHeight - 10;
        pdf.addImage(formData.productImage, 'JPEG', imageX, imageY, imageW, imageH);
      } else {
        // Placeholder
        addText("📷 Product Image", pageWidth / 2, yPosition + imageHeight/2, { 
          fontSize: 12, 
          align: 'center',
          color: [100, 116, 139]
        });
      }
    } catch {
      addText("📷 Product Image", pageWidth / 2, yPosition + imageHeight/2, { 
        fontSize: 12, 
        align: 'center',
        color: [100, 116, 139]
      });
    }
    yPosition += imageHeight + 5;
  }

  // Ingredients Section - exact Live Preview card design
  const ingredientsHeight = 45;
  drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, ingredientsHeight);
  
  // Header with slate background - exact Live Preview style
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.roundedRect(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 8, 3, 3, 'F');
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.setLineWidth(0.2);
  pdf.line(cardX + contentMargin, yPosition + 8, cardX + cardWidth - contentMargin, yPosition + 8);
  
  addText("Ingredients", cardX + contentMargin + 3, yPosition + 5, { 
    fontSize: 11, 
    fontStyle: 'bold', 
    color: [51, 65, 85] // slate-700
  });
  
  // Format ingredients exactly like Live Preview
  const formatIngredientsForPDF = () => {
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

  const ingredientsText = formatIngredientsForPDF();
  addText(ingredientsText, cardX + contentMargin + 3, yPosition + 12, { 
    maxWidth: cardWidth - 2 * contentMargin - 6,
    fontSize: 9,
    color: [71, 85, 105] // slate-600
  });
  
  // Asterisk note for base ingredients
  if ((formData.baseProductIngredients || []).length > 0) {
    addText("* percentage in ingredient", cardX + contentMargin + 3, yPosition + ingredientsHeight - 5, { 
      fontSize: 7, 
      color: [100, 116, 139] // slate-500
    });
  }
  
  yPosition += ingredientsHeight + 5;

  // Blue info box - exact Live Preview styling
  const infoBoxHeight = 22;
  
  // Left blue border accent
  pdf.setFillColor(96, 165, 250); // blue-400
  pdf.rect(cardX + contentMargin - 1, yPosition, 3, infoBoxHeight, 'F');
  
  // Main light blue background
  pdf.setFillColor(239, 246, 255); // blue-50
  pdf.roundedRect(cardX + contentMargin + 2, yPosition, cardWidth - 2 * contentMargin - 2, infoBoxHeight, 2, 2, 'F');
  pdf.setDrawColor(191, 219, 254); // blue-200
  pdf.setLineWidth(0.2);
  pdf.roundedRect(cardX + contentMargin + 2, yPosition, cardWidth - 2 * contentMargin - 2, infoBoxHeight, 2, 2, 'S');
  
  // Warning icon
  addText("⚠", cardX + contentMargin + 5, yPosition + 6, { 
    fontSize: 10, 
    color: [96, 165, 250] // blue-400
  });
  
  const qualityText = "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.";
  addText(qualityText, cardX + contentMargin + 12, yPosition + 4, { 
    maxWidth: cardWidth - 2 * contentMargin - 18,
    fontSize: 7,
    color: [30, 64, 175] // blue-800
  });
  
  yPosition += infoBoxHeight + 8;

  // Detailed Ingredients Table - exact Live Preview design
  if ((formData.ingredients || []).length > 0 || (formData.baseProductIngredients || []).length > 0) {
    const tableHeight = Math.min(50, pageHeight - yPosition - 50);
    
    drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, tableHeight);
    
    // Table header with slate background
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.roundedRect(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 8, 3, 3, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.line(cardX + contentMargin, yPosition + 8, cardX + cardWidth - contentMargin, yPosition + 8);
    
    addText("Detailed Ingredients Breakdown", cardX + contentMargin + 3, yPosition + 5, { 
      fontSize: 11, 
      fontStyle: 'bold', 
      color: [51, 65, 85] // slate-700
    });
    yPosition += 10;
    
    // Table structure - exact Live Preview column widths
    const tableWidth = cardWidth - 2 * contentMargin - 6;
    const colWidths = [tableWidth * 0.5, tableWidth * 0.3, tableWidth * 0.2];
    const colX = [
      cardX + contentMargin + 3, 
      cardX + contentMargin + 3 + colWidths[0], 
      cardX + contentMargin + 3 + colWidths[0] + colWidths[1]
    ];
    
    // Header row with exact Live Preview styling
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.rect(colX[0], yPosition, colWidths[0] + colWidths[1] + colWidths[2], 6, 'F');
    pdf.setDrawColor(226, 232, 240); // slate-200
    pdf.setLineWidth(0.2);
    pdf.rect(colX[0], yPosition, colWidths[0] + colWidths[1] + colWidths[2], 6, 'S');
    
    addText("Ingredients", colX[0] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Percentage content", colX[1] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Country of Origin", colX[2] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    
    // Column separators
    pdf.setDrawColor(226, 232, 240);
    pdf.line(colX[1], yPosition, colX[1], yPosition + 6);
    pdf.line(colX[2], yPosition, colX[2], yPosition + 6);
    
    yPosition += 8;
    
    // Generate table data exactly like Live Preview
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
                  name: `  ${baseIng.name}`, // Indent base ingredients
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
      
      return tableIngredients.slice(0, 6); // Limit to fit on page
    };
    
    const tableIngredients = generateTableIngredients();
    
    // Table rows with exact Live Preview alternating colors
    tableIngredients.forEach((ingredient, index) => {
      const rowY = yPosition;
      const rowHeight = 5;
      
      // Alternating row colors - exact Live Preview pattern
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250); // gray-50
        pdf.rect(colX[0], rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249); // slate-100
      pdf.setLineWidth(0.1);
      pdf.rect(colX[0], rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, 'S');
      
      // Text styling exactly like Live Preview
      addText(ingredient.name, colX[0] + 2, rowY + 3, { 
        fontSize: 7, 
        fontStyle: ingredient.isFinalProduct ? 'bold' : 'normal',
        color: ingredient.isFinalProduct ? [51, 65, 85] : [100, 116, 139], // slate-700 : slate-500
        maxWidth: colWidths[0] - 4
      });
      addText(`${ingredient.percentage}%`, colX[1] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      addText(ingredient.origin || "-", colX[2] + 2, rowY + 3, { fontSize: 7, color: [100, 116, 139] });
      
      // Column separators
      pdf.line(colX[1], rowY, colX[1], rowY + rowHeight);
      pdf.line(colX[2], rowY, colX[2], rowY + rowHeight);
      
      yPosition += rowHeight;
    });
    
    yPosition += 8;
  }

  // PAGE BREAK indicator - exact Live Preview styling
  if (formData.nutrition) {
    yPosition += 10;
    
    // Red dashed line
    pdf.setDrawColor(252, 165, 165); // red-300
    pdf.setLineWidth(0.5);
    const dashLength = 3;
    const gapLength = 2;
    let currentX = cardX + contentMargin;
    const lineEnd = cardX + cardWidth - contentMargin;
    
    while (currentX < lineEnd) {
      const nextX = Math.min(currentX + dashLength, lineEnd);
      pdf.line(currentX, yPosition, nextX, yPosition);
      currentX = nextX + gapLength;
    }
    
    // Page break badge - exact Live Preview styling
    pdf.setFillColor(254, 242, 242); // red-50
    pdf.setDrawColor(252, 165, 165); // red-300
    const badgeWidth = 85;
    const badgeX = (pageWidth - badgeWidth) / 2;
    pdf.roundedRect(badgeX, yPosition - 3, badgeWidth, 6, 3, 3, 'F');
    pdf.roundedRect(badgeX, yPosition - 3, badgeWidth, 6, 3, 3, 'S');
    
    addText("📄 Page Break - Page 2 begins here", pageWidth / 2, yPosition, { 
      fontSize: 8, 
      color: [185, 28, 28], // red-700
      align: 'center',
      fontStyle: 'bold'
    });
    
    // Bottom dashed line
    currentX = cardX + contentMargin;
    while (currentX < lineEnd) {
      const nextX = Math.min(currentX + dashLength, lineEnd);
      pdf.line(currentX, yPosition + 3, nextX, yPosition + 3);
      currentX = nextX + gapLength;
    }
    
    // NEW PAGE
    pdf.addPage();
    yPosition = margin + contentMargin;
    
    // PAGE 2 - Same document card styling
    drawCard(cardX, margin, cardWidth, pageHeight - 2 * margin);
    
    // PAGE 2 Header - exactly like Page 1
    drawGradientHeader(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 15);
    
    // Logo
    if (logoDataUrl) {
      try {
        pdf.addImage(logoDataUrl, 'PNG', cardX + contentMargin + 3, yPosition + 2, 12, 8);
      } catch {
        addText("Brüggen", cardX + contentMargin + 3, yPosition + 9, { 
          fontSize: 11, 
          fontStyle: 'bold', 
          color: [220, 38, 127]
        });
      }
    } else {
      addText("Brüggen", cardX + contentMargin + 3, yPosition + 9, { 
        fontSize: 11, 
        fontStyle: 'bold', 
        color: [220, 38, 127]
      });
    }
    
    addText("Product Information", pageWidth / 2, yPosition + 6, { 
      fontSize: 14, 
      fontStyle: 'bold', 
      align: 'center', 
      color: [51, 65, 85]
    });
    addText(formData.productNumber || "Recipe Number", pageWidth / 2, yPosition + 11, { 
      fontSize: 10, 
      fontStyle: 'bold', 
      align: 'center', 
      color: [51, 65, 85]
    });
    
    // Page 2 badge
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(badgeX, yPosition + 3, 15, 5, 2, 2, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(badgeX, yPosition + 3, 15, 5, 2, 2, 'S');
    addText("Page 2", badgeX + 7.5, yPosition + 7, { 
      fontSize: 7, 
      align: 'center', 
      color: [71, 85, 105]
    });
    
    yPosition += 20;
    
    // Nutrition Table - exact Live Preview design
    const nutrition = formData.nutrition;
    const nutritionHeight = 65;
    
    drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, nutritionHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.roundedRect(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 8, 3, 3, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.line(cardX + contentMargin, yPosition + 8, cardX + cardWidth - contentMargin, yPosition + 8);
    
    addText("Average Nutritional Value", cardX + contentMargin + 3, yPosition + 5, { 
      fontSize: 11, 
      fontStyle: 'bold', 
      color: [51, 65, 85]
    });
    yPosition += 10;
    
    // Nutrition table columns - exact Live Preview layout
    const nutritionTableWidth = cardWidth - 2 * contentMargin - 6;
    const nutritionCols = [nutritionTableWidth * 0.4, nutritionTableWidth * 0.3, nutritionTableWidth * 0.3];
    const nutritionColX = [
      cardX + contentMargin + 3,
      cardX + contentMargin + 3 + nutritionCols[0],
      cardX + contentMargin + 3 + nutritionCols[0] + nutritionCols[1]
    ];
    
    // Header row
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.rect(nutritionColX[0], yPosition, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(nutritionColX[0], yPosition, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 6, 'S');
    
    addText("Nutrient", nutritionColX[0] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("per 100 g", nutritionColX[1] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText(`per ${servingSize} g`, nutritionColX[2] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    
    pdf.line(nutritionColX[1], yPosition, nutritionColX[1], yPosition + 6);
    pdf.line(nutritionColX[2], yPosition, nutritionColX[2], yPosition + 6);
    
    yPosition += 8;
    
    // Nutrition rows exactly like Live Preview
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
      const rowHeight = 5;
      
      // Alternating colors
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(nutritionColX[0], rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249);
      pdf.rect(nutritionColX[0], rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], rowHeight, 'S');
      
      // Indentation for sub-items exactly like Live Preview
      const indentedLabel = row.label.startsWith('of which') ? `    ${row.label}` : row.label;
      const labelStyle = row.isMain ? 'bold' : 'normal';
      const labelColor = row.isMain ? [51, 65, 85] : [100, 116, 139];
      
      addText(indentedLabel, nutritionColX[0] + 2, rowY + 3, { fontSize: 7, fontStyle: labelStyle, color: labelColor });
      addText(row.value100g, nutritionColX[1] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      addText(row.valueServing, nutritionColX[2] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      
      pdf.line(nutritionColX[1], rowY, nutritionColX[1], rowY + rowHeight);
      pdf.line(nutritionColX[2], rowY, nutritionColX[2], rowY + rowHeight);
      
      yPosition += rowHeight;
    });
    
    yPosition += 15;

    // Nutri-Score and Claims side by side - exact Live Preview layout
    const twoColumnWidth = (cardWidth - 2 * contentMargin - 8) / 2;
    
    // Nutri-Score Section (left column)
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
    
    const nutriScoreHeight = 28;
    drawCard(cardX + contentMargin, yPosition, twoColumnWidth, nutriScoreHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(cardX + contentMargin, yPosition, twoColumnWidth, 8, 3, 3, 'F');
    pdf.line(cardX + contentMargin, yPosition + 8, cardX + contentMargin + twoColumnWidth, yPosition + 8);
    
    addText("Nutri-Score Rating", cardX + contentMargin + 3, yPosition + 5, { 
      fontSize: 9, 
      fontStyle: 'bold', 
      color: [51, 65, 85]
    });
    
    // Nutri-Score grade display - exact Live Preview styling
    const gradeY = yPosition + 12;
    
    // Grade color background exactly like Live Preview
    const gradeColors: { [key: string]: [number, number, number] } = {
      'A': [21, 128, 61],   // green-700
      'B': [132, 204, 22],  // lime-500
      'C': [234, 179, 8],   // yellow-500
      'D': [249, 115, 22],  // orange-500
      'E': [239, 68, 68]    // red-500
    };
    
    const gradeColor = gradeColors[nutriScoreResult.nutriGrade] || [0, 0, 0];
    
    // Colored circle background for grade
    pdf.setFillColor(gradeColor[0], gradeColor[1], gradeColor[2]);
    pdf.circle(cardX + contentMargin + 20, gradeY + 4, 6, 'F');
    
    // White text on colored background
    addText(nutriScoreResult.nutriGrade, cardX + contentMargin + 20, gradeY + 5, { 
      fontSize: 14, 
      fontStyle: 'bold', 
      align: 'center',
      color: [255, 255, 255]
    });
    
    addText(`Grade: ${nutriScoreResult.nutriGrade} • Score: ${nutriScoreResult.finalScore}`, cardX + contentMargin + 3, yPosition + 25, { 
      fontSize: 7, 
      color: [71, 85, 105]
    });

    // Claims Section (right column)
    const claimsX = cardX + contentMargin + twoColumnWidth + 4;
    
    drawCard(claimsX, yPosition, twoColumnWidth, nutriScoreHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(claimsX, yPosition, twoColumnWidth, 8, 3, 3, 'F');
    pdf.line(claimsX, yPosition + 8, claimsX + twoColumnWidth, yPosition + 8);
    
    addText("Possible Declarations", claimsX + 3, yPosition + 5, { 
      fontSize: 9, 
      fontStyle: 'bold', 
      color: [51, 65, 85]
    });
    
    // Calculate claims exactly like Live Preview
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

    // Add manual declarations
    if (formData.declarations?.wholegrain) {
      claimsToShow.push({ label: "Wholegrain", claim: "✓" });
    }

    if (claimsToShow.length === 0) {
      addText("No claims available", claimsX + 3, yPosition + 15, { 
        fontSize: 7, 
        color: [100, 116, 139]
      });
    } else {
      claimsToShow.slice(0, 4).forEach((claim, index) => {
        const claimY = yPosition + 10 + (index * 4);
        
        // Green background for claims - exact Live Preview styling
        pdf.setFillColor(240, 253, 244); // green-50
        pdf.roundedRect(claimsX + 2, claimY - 1, twoColumnWidth - 4, 3, 1, 1, 'F');
        pdf.setDrawColor(187, 247, 208); // green-200
        pdf.roundedRect(claimsX + 2, claimY - 1, twoColumnWidth - 4, 3, 1, 1, 'S');
        
        addText(claim.label, claimsX + 3, claimY + 1, { fontSize: 6, color: [71, 85, 105] });
        
        // Green badge
        pdf.setFillColor(22, 163, 74); // green-600
        const badgeWidth = 10;
        pdf.roundedRect(claimsX + twoColumnWidth - badgeWidth - 3, claimY - 0.5, badgeWidth, 2, 1, 1, 'F');
        
        addText(claim.claim, claimsX + twoColumnWidth - badgeWidth + 2, claimY + 1, { 
          fontSize: 5, 
          color: [255, 255, 255],
          align: 'center'
        });
      });
    }
    
    yPosition += nutriScoreHeight + 10;
  }

  // Storage Conditions - exact Live Preview styling
  const storageHeight = 24;
  drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, storageHeight);
  
  // Header
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 8, 3, 3, 'F');
  pdf.line(cardX + contentMargin, yPosition + 8, cardX + cardWidth - contentMargin, yPosition + 8);
  
  addText("Storage Conditions", cardX + contentMargin + 3, yPosition + 5, { 
    fontSize: 11, 
    fontStyle: 'bold', 
    color: [51, 65, 85]
  });
  
  // Storage icon
  addText("📦", cardX + contentMargin + 3, yPosition + 12, { 
    fontSize: 10, 
    color: [59, 130, 246] // blue-500
  });
  
  const storageText = formData.storageConditions || "Storage conditions will be generated based on product type selection...";
  addText(storageText, cardX + contentMargin + 12, yPosition + 10, { 
    maxWidth: cardWidth - 2 * contentMargin - 18,
    fontSize: 8,
    color: [71, 85, 105]
  });
  
  yPosition += storageHeight + 5;

  // Allergy Advice - exact Live Preview red styling
  const allergyHeight = 22;
  
  // Left red border accent
  pdf.setFillColor(248, 113, 113); // red-400
  pdf.rect(cardX + contentMargin - 1, yPosition, 3, allergyHeight, 'F');
  
  // Main red background
  pdf.setFillColor(254, 242, 242); // red-50
  pdf.roundedRect(cardX + contentMargin + 2, yPosition, cardWidth - 2 * contentMargin - 2, allergyHeight, 2, 2, 'F');
  pdf.setDrawColor(252, 165, 165); // red-300
  pdf.roundedRect(cardX + contentMargin + 2, yPosition, cardWidth - 2 * contentMargin - 2, allergyHeight, 2, 2, 'S');
  
  // Warning icon
  addText("⚠", cardX + contentMargin + 5, yPosition + 6, { 
    fontSize: 10, 
    color: [239, 68, 68] // red-500
  });
  
  addText("Allergy Advice", cardX + contentMargin + 12, yPosition + 6, { 
    fontSize: 10, 
    fontStyle: 'bold', 
    color: [153, 27, 27] // red-800
  });
  
  const allergyText = formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";
  addText(allergyText, cardX + contentMargin + 12, yPosition + 10, { 
    maxWidth: cardWidth - 2 * contentMargin - 18,
    fontSize: 8,
    color: [153, 27, 27]
  });
  
  yPosition += allergyHeight + 5;

  // Preparation Instructions (if exists)
  if (formData.preparation) {
    const prepHeight = 20;
    drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, prepHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 8, 3, 3, 'F');
    pdf.line(cardX + contentMargin, yPosition + 8, cardX + cardWidth - contentMargin, yPosition + 8);
    
    addText("Preparation Instructions", cardX + contentMargin + 3, yPosition + 5, { 
      fontSize: 11, 
      fontStyle: 'bold', 
      color: [51, 65, 85]
    });
    
    // Preparation icon
    addText("📖", cardX + contentMargin + 3, yPosition + 12, { 
      fontSize: 10, 
      color: [139, 69, 19] // amber-800
    });
    
    addText(formData.preparation, cardX + contentMargin + 12, yPosition + 10, { 
      maxWidth: cardWidth - 2 * contentMargin - 18,
      fontSize: 8,
      color: [71, 85, 105]
    });
    
    yPosition += prepHeight + 5;
  }

  // Footer section - exact Live Preview positioning
  const footerY = pageHeight - 25;
  drawGradientHeader(cardX + contentMargin, footerY, cardWidth - 2 * contentMargin, 15);
  
  // Valid from (left)
  addText("📅", cardX + contentMargin + 3, footerY + 6, { 
    fontSize: 8, 
    color: [100, 116, 139]
  });
  addText(`Valid from: ${new Date().toLocaleDateString('en-GB')}`, cardX + contentMargin + 10, footerY + 6, { 
    fontSize: 8, 
    color: [71, 85, 105],
    fontStyle: 'bold'
  });
  
  // Prepared by (right)
  if (formData.preparedBy || formData.jobTitle) {
    addText("👤", pageWidth - 80, footerY + 6, { 
      fontSize: 8, 
      color: [100, 116, 139]
    });
    const preparedByText = formData.preparedBy && formData.jobTitle 
      ? `${formData.preparedBy}, ${formData.jobTitle}`
      : formData.preparedBy || formData.jobTitle || '';
    addText(`Prepared by: ${preparedByText}`, pageWidth - 75, footerY + 6, { 
      fontSize: 8, 
      color: [71, 85, 105],
      fontStyle: 'bold'
    });
  }

  // Disclaimer - exact Live Preview positioning and styling
  const disclaimerY = pageHeight - 8;
  addText("The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.", 
    cardX + contentMargin, disclaimerY, { 
    maxWidth: cardWidth - 2 * contentMargin,
    fontSize: 6,
    color: [100, 116, 139]
  });

  // Save PDF with proper filename
  const fileName = `${formData.productName || 'Product-Information'}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_');
  pdf.save(fileName);
}
