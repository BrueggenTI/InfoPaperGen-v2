
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

  // Helper functions for exact Live Preview matching
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
    // White background with shadow effect
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    
    // Border
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x, y, width, height, 3, 3, 'S');
    
    // Gradient background if specified
    if (fillColor) {
      pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    }
  };

  const drawGradientHeader = (x: number, y: number, width: number, height: number) => {
    // Gradient effect from slate-50 to slate-100
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(x, y, width, height, 3, 3, 'S');
  };

  // PAGE 1 - Document Container (matches Live Preview card styling)
  const cardWidth = pageWidth - 2 * margin;
  const cardX = margin;
  
  // White document card with shadow
  drawCard(cardX, yPosition, cardWidth, pageHeight - 2 * margin);
  
  // Content starts inside the card
  const contentMargin = 6;
  yPosition += contentMargin;

  // Header Section - exactly like Live Preview gradient header
  drawGradientHeader(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 15);
  
  // Logo placeholder (left) - exactly positioned like Live Preview
  addText("Brüggen", cardX + contentMargin + 3, yPosition + 9, { 
    fontSize: 11, 
    fontStyle: 'bold', 
    color: [51, 65, 85] 
  });
  
  // Center title - exactly like Live Preview
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
  
  // Page number badge (right) - white background like Live Preview
  const badgeX = pageWidth - margin - 20;
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(badgeX, yPosition + 3, 15, 5, 2, 2, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(badgeX, yPosition + 3, 15, 5, 2, 2, 'S');
  addText("Page 1", badgeX + 7.5, yPosition + 7, { 
    fontSize: 7, 
    align: 'center', 
    color: [71, 85, 105] 
  });
  
  yPosition += 20;

  // Product Name Section - exactly like Live Preview gradient card
  drawGradientHeader(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 18);
  
  addText("PRODUCT NAME", pageWidth / 2, yPosition + 6, { 
    fontSize: 7, 
    color: [100, 116, 139], 
    align: 'center' 
  });
  addText(formData.productName || "Product name will appear here...", pageWidth / 2, yPosition + 12, { 
    fontSize: 12, 
    fontStyle: 'bold', 
    align: 'center',
    color: [217, 119, 6], // amber-600 gradient
    maxWidth: cardWidth - 20
  });
  yPosition += 25;

  // Product Image - if exists
  if (formData.productImage) {
    // Center image like Live Preview
    addText("📷 [Product Image]", pageWidth / 2, yPosition + 8, { 
      fontSize: 10, 
      align: 'center',
      color: [100, 116, 139]
    });
    yPosition += 20;
  }

  // Ingredients Section - exactly like Live Preview card with border
  const ingredientsHeight = 40;
  drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, ingredientsHeight);
  
  // Header with slate background
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 8, 3, 3, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(cardX + contentMargin, yPosition + 8, cardX + cardWidth - contentMargin, yPosition + 8);
  
  addText("Ingredients", cardX + contentMargin + 3, yPosition + 5, { 
    fontSize: 11, 
    fontStyle: 'bold', 
    color: [51, 65, 85] 
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
    color: [71, 85, 105]
  });
  
  // Asterisk note for base ingredients
  if ((formData.baseProductIngredients || []).length > 0) {
    addText("* percentage in ingredient", cardX + contentMargin + 3, yPosition + ingredientsHeight - 5, { 
      fontSize: 7, 
      color: [100, 116, 139] 
    });
  }
  
  yPosition += ingredientsHeight + 5;

  // Blue info box - exactly like Live Preview
  const infoBoxHeight = 20;
  
  // Left blue border
  pdf.setFillColor(96, 165, 250);
  pdf.rect(cardX + contentMargin - 1, yPosition, 3, infoBoxHeight, 'F');
  
  // Main blue background
  pdf.setFillColor(239, 246, 255);
  pdf.roundedRect(cardX + contentMargin + 2, yPosition, cardWidth - 2 * contentMargin - 2, infoBoxHeight, 2, 2, 'F');
  
  // Warning icon
  addText("⚠", cardX + contentMargin + 5, yPosition + 6, { 
    fontSize: 10, 
    color: [96, 165, 250] 
  });
  
  const qualityText = "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.";
  addText(qualityText, cardX + contentMargin + 12, yPosition + 4, { 
    maxWidth: cardWidth - 2 * contentMargin - 18,
    fontSize: 7,
    color: [30, 64, 175]
  });
  
  yPosition += infoBoxHeight + 8;

  // Detailed Ingredients Table - exactly like Live Preview
  if ((formData.ingredients || []).length > 0 || (formData.baseProductIngredients || []).length > 0) {
    const tableStartY = yPosition;
    const tableHeight = Math.min(45, pageHeight - yPosition - 40); // Ensure it fits on page
    
    drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, tableHeight);
    
    // Table header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 8, 3, 3, 'F');
    pdf.line(cardX + contentMargin, yPosition + 8, cardX + cardWidth - contentMargin, yPosition + 8);
    
    addText("Detailed Ingredients Breakdown", cardX + contentMargin + 3, yPosition + 5, { 
      fontSize: 11, 
      fontStyle: 'bold', 
      color: [51, 65, 85] 
    });
    yPosition += 10;
    
    // Table structure exactly like Live Preview
    const tableWidth = cardWidth - 2 * contentMargin - 6;
    const colWidths = [tableWidth * 0.5, tableWidth * 0.3, tableWidth * 0.2];
    const colX = [
      cardX + contentMargin + 3, 
      cardX + contentMargin + 3 + colWidths[0], 
      cardX + contentMargin + 3 + colWidths[0] + colWidths[1]
    ];
    
    // Header row with slate background
    pdf.setFillColor(248, 250, 252);
    pdf.rect(colX[0], yPosition, colWidths[0] + colWidths[1] + colWidths[2], 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(colX[0], yPosition, colWidths[0] + colWidths[1] + colWidths[2], 6, 'S');
    
    addText("Ingredients", colX[0] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Percentage content", colX[1] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Country of Origin", colX[2] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    
    // Column separators
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
                  name: baseIng.name,
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
      
      return tableIngredients.slice(0, 5); // Limit rows to fit on page
    };
    
    const tableIngredients = generateTableIngredients();
    
    // Table rows with alternating colors
    tableIngredients.forEach((ingredient, index) => {
      const rowY = yPosition;
      const rowHeight = 5;
      
      // Alternating row colors like Live Preview
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(colX[0], rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249);
      pdf.rect(colX[0], rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, 'S');
      
      // Text styling exactly like Live Preview
      addText(ingredient.name, colX[0] + 2, rowY + 3, { 
        fontSize: 7, 
        fontStyle: ingredient.isFinalProduct ? 'bold' : 'normal',
        color: ingredient.isFinalProduct ? [51, 65, 85] : [100, 116, 139],
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

  // PAGE BREAK - exactly like Live Preview
  if (formData.nutrition) {
    // Page break indicator
    yPosition += 10;
    pdf.setDrawColor(252, 165, 165);
    pdf.line(cardX + contentMargin, yPosition, cardX + cardWidth - contentMargin, yPosition);
    
    // Page break text with red background
    pdf.setFillColor(254, 242, 242);
    pdf.setDrawColor(252, 165, 165);
    const textWidth = 80;
    const textX = (pageWidth - textWidth) / 2;
    pdf.roundedRect(textX, yPosition - 3, textWidth, 6, 3, 3, 'F');
    pdf.roundedRect(textX, yPosition - 3, textWidth, 6, 3, 3, 'S');
    
    addText("📄 Page Break - Page 2 begins here", pageWidth / 2, yPosition, { 
      fontSize: 8, 
      color: [185, 28, 28],
      align: 'center',
      fontStyle: 'bold'
    });
    
    pdf.line(cardX + contentMargin, yPosition + 3, cardX + cardWidth - contentMargin, yPosition + 3);
    
    // NEW PAGE
    pdf.addPage();
    yPosition = margin + contentMargin;
    
    // PAGE 2 - Same document card styling
    drawCard(cardX, margin, cardWidth, pageHeight - 2 * margin);
    
    // PAGE 2 Header - exactly like Page 1
    drawGradientHeader(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 15);
    
    addText("Brüggen", cardX + contentMargin + 3, yPosition + 9, { 
      fontSize: 11, 
      fontStyle: 'bold', 
      color: [51, 65, 85] 
    });
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
    
    // Nutrition Table - exactly like Live Preview
    const nutrition = formData.nutrition;
    const nutritionHeight = 60;
    
    drawCard(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, nutritionHeight);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(cardX + contentMargin, yPosition, cardWidth - 2 * contentMargin, 8, 3, 3, 'F');
    pdf.line(cardX + contentMargin, yPosition + 8, cardX + cardWidth - contentMargin, yPosition + 8);
    
    addText("Average Nutritional Value", cardX + contentMargin + 3, yPosition + 5, { 
      fontSize: 11, 
      fontStyle: 'bold', 
      color: [51, 65, 85] 
    });
    yPosition += 10;
    
    // Nutrition table columns
    const nutritionTableWidth = cardWidth - 2 * contentMargin - 6;
    const nutritionCols = [nutritionTableWidth * 0.4, nutritionTableWidth * 0.3, nutritionTableWidth * 0.3];
    const nutritionColX = [
      cardX + contentMargin + 3,
      cardX + contentMargin + 3 + nutritionCols[0],
      cardX + contentMargin + 3 + nutritionCols[0] + nutritionCols[1]
    ];
    
    // Header row
    pdf.setFillColor(248, 250, 252);
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
        valueServing: `${calculatePerServing(nutrition.energy?.kj || 0)} kJ / ${calculatePerServing(nutrition.energy?.kcal || 0)} kcal`
      },
      { label: "Fat", value100g: `${nutrition.fat || 0} g`, valueServing: `${calculatePerServing(nutrition.fat || 0)} g` },
      { label: "of which saturates", value100g: `${nutrition.saturatedFat || 0} g`, valueServing: `${calculatePerServing(nutrition.saturatedFat || 0)} g` },
      { label: "Carbohydrates", value100g: `${nutrition.carbohydrates || 0} g`, valueServing: `${calculatePerServing(nutrition.carbohydrates || 0)} g` },
      { label: "of which sugars", value100g: `${nutrition.sugars || 0} g`, valueServing: `${calculatePerServing(nutrition.sugars || 0)} g` },
      { label: "Fibre", value100g: `${nutrition.fiber || 0} g`, valueServing: `${calculatePerServing(nutrition.fiber || 0)} g` },
      { label: "Protein", value100g: `${nutrition.protein || 0} g`, valueServing: `${calculatePerServing(nutrition.protein || 0)} g` },
      { label: "Salt", value100g: `${nutrition.salt || 0} g`, valueServing: `${calculatePerServing(nutrition.salt || 0)} g` }
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
      
      // Indentation for sub-items
      const indentedLabel = row.label.startsWith('of which') ? `    ${row.label}` : row.label;
      const labelStyle = row.label.startsWith('of which') ? 'normal' : 'bold';
      const labelColor = row.label.startsWith('of which') ? [100, 116, 139] : [51, 65, 85];
      
      addText(indentedLabel, nutritionColX[0] + 2, rowY + 3, { fontSize: 7, fontStyle: labelStyle, color: labelColor });
      addText(row.value100g, nutritionColX[1] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      addText(row.valueServing, nutritionColX[2] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      
      pdf.line(nutritionColX[1], rowY, nutritionColX[1], rowY + rowHeight);
      pdf.line(nutritionColX[2], rowY, nutritionColX[2], rowY + rowHeight);
      
      yPosition += rowHeight;
    });
    
    yPosition += 15;

    // Nutri-Score and Claims side by side - exactly like Live Preview
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
    
    const nutriScoreHeight = 25;
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
    
    // Nutri-Score grade display
    const gradeY = yPosition + 12;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(cardX + contentMargin + 10, gradeY, 20, 8, 2, 2, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(cardX + contentMargin + 10, gradeY, 20, 8, 2, 2, 'S');
    
    // Grade color based on Nutri-Score
    const gradeColors: { [key: string]: [number, number, number] } = {
      'A': [0, 128, 0],
      'B': [154, 205, 50],
      'C': [255, 165, 0],
      'D': [255, 140, 0],
      'E': [255, 69, 0]
    };
    
    const gradeColor = gradeColors[nutriScoreResult.nutriGrade] || [0, 0, 0];
    addText(nutriScoreResult.nutriGrade, cardX + contentMargin + 20, gradeY + 5, { 
      fontSize: 12, 
      fontStyle: 'bold', 
      align: 'center',
      color: gradeColor
    });
    
    addText(`Grade: ${nutriScoreResult.nutriGrade} • Score: ${nutriScoreResult.finalScore}`, cardX + contentMargin + 3, yPosition + 22, { 
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
      claimsToShow.slice(0, 3).forEach((claim, index) => {
        const claimY = yPosition + 10 + (index * 4);
        
        // Green background for claims
        pdf.setFillColor(240, 253, 244);
        pdf.roundedRect(claimsX + 2, claimY - 1, twoColumnWidth - 4, 3, 1, 1, 'F');
        
        addText(claim.label, claimsX + 3, claimY + 1, { fontSize: 6, color: [71, 85, 105] });
        
        // Green badge
        pdf.setFillColor(220, 252, 231);
        const badgeWidth = 12;
        pdf.roundedRect(claimsX + twoColumnWidth - badgeWidth - 3, claimY - 0.5, badgeWidth, 2, 1, 1, 'F');
        
        addText(claim.claim, claimsX + twoColumnWidth - badgeWidth + 3, claimY + 1, { 
          fontSize: 5, 
          color: [22, 101, 52],
          align: 'center'
        });
      });
    }
    
    yPosition += nutriScoreHeight + 10;
  }

  // Storage Conditions - exactly like Live Preview
  const storageHeight = 22;
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
    color: [59, 130, 246] 
  });
  
  const storageText = formData.storageConditions || "Storage conditions will be generated based on product type selection...";
  addText(storageText, cardX + contentMargin + 12, yPosition + 10, { 
    maxWidth: cardWidth - 2 * contentMargin - 18,
    fontSize: 8,
    color: [71, 85, 105]
  });
  
  yPosition += storageHeight + 5;

  // Allergy Advice - exactly like Live Preview with red styling
  const allergyHeight = 20;
  
  // Left red border
  pdf.setFillColor(248, 113, 113);
  pdf.rect(cardX + contentMargin - 1, yPosition, 3, allergyHeight, 'F');
  
  // Main red background
  pdf.setFillColor(254, 242, 242);
  pdf.roundedRect(cardX + contentMargin + 2, yPosition, cardWidth - 2 * contentMargin - 2, allergyHeight, 2, 2, 'F');
  
  // Warning icon
  addText("⚠", cardX + contentMargin + 5, yPosition + 6, { 
    fontSize: 10, 
    color: [239, 68, 68] 
  });
  
  addText("Allergy Advice", cardX + contentMargin + 12, yPosition + 6, { 
    fontSize: 10, 
    fontStyle: 'bold', 
    color: [153, 27, 27] 
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
    const prepHeight = 18;
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
      color: [139, 69, 19] 
    });
    
    addText(formData.preparation, cardX + contentMargin + 12, yPosition + 10, { 
      maxWidth: cardWidth - 2 * contentMargin - 18,
      fontSize: 8,
      color: [71, 85, 105]
    });
    
    yPosition += prepHeight + 5;
  }

  // Footer section - exactly like Live Preview
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

  // Disclaimer - exactly like Live Preview
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
