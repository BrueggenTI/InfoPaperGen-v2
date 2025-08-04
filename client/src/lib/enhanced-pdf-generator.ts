
import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore, getNutriScoreColor } from "./nutri-score";
import { calculateClaims } from "./claims-calculator";

export async function generateEnhancedPDF(formData: ProductInfo) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let yPosition = margin;
  
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  // Helper functions exactly matching Live Preview styles
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

  const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number = 2) => {
    pdf.roundedRect(x, y, width, height, radius, radius);
  };

  // PAGE 1 - Header with gradient background effect (mimicking Live Preview)
  pdf.setFillColor(248, 250, 252); // bg-slate-50
  drawRoundedRect(margin, yPosition - 3, pageWidth - 2 * margin, 15, 3);
  pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 15, 'F');
  
  pdf.setDrawColor(226, 232, 240); // border-slate-200
  drawRoundedRect(margin, yPosition - 3, pageWidth - 2 * margin, 15, 3);
  
  // Logo placeholder (left)
  addText("Brüggen", margin + 3, yPosition + 3, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
  
  // Center title
  addText("Product Information", pageWidth / 2, yPosition + 2, { fontSize: 12, fontStyle: 'bold', align: 'center', color: [51, 65, 85] });
  addText(formData.productNumber || "Recipe Number", pageWidth / 2, yPosition + 6, { fontSize: 10, fontStyle: 'bold', align: 'center', color: [51, 65, 85] });
  
  // Page number (right) with white background
  pdf.setFillColor(255, 255, 255);
  pdf.ellipse(pageWidth - margin - 8, yPosition + 4, 6, 2, 'F');
  addText("Page 1", pageWidth - margin - 8, yPosition + 4, { fontSize: 8, align: 'center', color: [71, 85, 105] });
  
  yPosition += 20;

  // Product Name Section with gradient background
  pdf.setFillColor(253, 254, 255); // from-white to-slate-50
  drawRoundedRect(margin, yPosition - 2, pageWidth - 2 * margin, 15, 3);
  pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 15, 'F');
  
  pdf.setDrawColor(226, 232, 240);
  drawRoundedRect(margin, yPosition - 2, pageWidth - 2 * margin, 15, 3);
  
  addText("PRODUCT NAME", pageWidth / 2, yPosition + 3, { fontSize: 8, color: [100, 116, 139], align: 'center' });
  addText(formData.productName || "Product name will appear here...", pageWidth / 2, yPosition + 8, { 
    fontSize: 11, 
    fontStyle: 'bold', 
    align: 'center',
    color: [217, 119, 6] // amber-600
  });
  yPosition += 20;

  // Ingredients Section exactly like Live Preview
  const finalIngredients = formData.ingredients || [];
  const baseIngredients = formData.baseProductIngredients || [];
  
  // Section with border and header
  const ingredientsSectionHeight = 35;
  pdf.setDrawColor(226, 232, 240);
  drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, ingredientsSectionHeight, 3);
  
  // Header with background
  pdf.setFillColor(248, 250, 252);
  drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 6, 3);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
  pdf.line(margin, yPosition + 6, pageWidth - margin, yPosition + 6);
  
  addText("Ingredients", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
  
  // Format ingredients exactly like Live Preview
  const formatIngredientsForPDF = () => {
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
  addText(ingredientsText, margin + 3, yPosition + 10, { 
    maxWidth: pageWidth - 2 * margin - 6,
    fontSize: 8,
    color: [71, 85, 105]
  });
  
  if (baseIngredients.length > 0) {
    addText("* percentage in ingredient", margin + 3, yPosition + ingredientsSectionHeight - 4, { 
      fontSize: 7, 
      color: [100, 116, 139]
    });
  }
  
  yPosition += ingredientsSectionHeight + 5;

  // Blue info box exactly like Live Preview
  pdf.setFillColor(239, 246, 255); // bg-blue-50
  pdf.setDrawColor(96, 165, 250); // border-blue-400
  pdf.rect(margin - 2, yPosition, 4, 18, 'F'); // Left border
  pdf.setFillColor(239, 246, 255);
  drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 3);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'F');
  
  // Blue icon
  addText("⚠", margin + 3, yPosition + 4, { fontSize: 10, color: [96, 165, 250] });
  
  const qualityText = "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.";
  addText(qualityText, margin + 8, yPosition + 3, { 
    maxWidth: pageWidth - 2 * margin - 12,
    fontSize: 7,
    color: [30, 64, 175] // text-blue-800
  });
  
  yPosition += 23;

  // Detailed Ingredients Table exactly like Live Preview
  if (finalIngredients.length > 0 || baseIngredients.length > 0) {
    const tableStartY = yPosition;
    
    // Table header
    pdf.setFillColor(248, 250, 252);
    drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 6, 3);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 6, 3);
    
    addText("Detailed Ingredients Breakdown", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    yPosition += 8;
    
    // Table structure exactly like Live Preview
    const colWidths = [90, 55, 40];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];
    
    // Header row
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, colWidths[0] + colWidths[1] + colWidths[2], 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition, colWidths[0] + colWidths[1] + colWidths[2], 6);
    
    addText("Ingredients", colX[0] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Percentage content per whole product", colX[1] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Country of Origin", colX[2] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    
    // Column separators
    pdf.line(colX[1], yPosition, colX[1], yPosition + 6);
    pdf.line(colX[2], yPosition, colX[2], yPosition + 6);
    
    yPosition += 8;
    
    // Generate table data exactly like Live Preview
    const generateTableIngredients = () => {
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
      
      return tableIngredients;
    };
    
    const tableIngredients = generateTableIngredients();
    
    // Table rows
    tableIngredients.forEach((ingredient, index) => {
      const rowY = yPosition;
      const rowHeight = 5;
      
      // Alternating row colors like Live Preview
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249);
      pdf.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight);
      
      // Text styling exactly like Live Preview
      addText(ingredient.name, colX[0] + 2, rowY + 3, { 
        fontSize: 7, 
        fontStyle: ingredient.isFinalProduct ? 'bold' : 'normal',
        color: ingredient.isFinalProduct ? [51, 65, 85] : [100, 116, 139]
      });
      addText(`${ingredient.percentage}%`, colX[1] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      addText(ingredient.origin || "-", colX[2] + 2, rowY + 3, { fontSize: 7, color: [100, 116, 139] });
      
      // Column separators
      pdf.line(colX[1], rowY, colX[1], rowY + rowHeight);
      pdf.line(colX[2], rowY, colX[2], rowY + rowHeight);
      
      yPosition += rowHeight;
    });
    
    // Table border
    const tableEndY = yPosition;
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, tableStartY + 6, pageWidth - 2 * margin, tableEndY - tableStartY - 6);
    
    yPosition += 5;
  }

  // PAGE BREAK for Nutrition Section exactly like Live Preview
  if (formData.nutrition) {
    // Page break indicator styling
    yPosition += 10;
    pdf.setDrawColor(252, 165, 165); // border-red-300
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    
    // Page break text box
    pdf.setFillColor(254, 242, 242); // bg-red-100
    pdf.setDrawColor(252, 165, 165);
    const textWidth = 80;
    const textX = (pageWidth - textWidth) / 2;
    drawRoundedRect(textX, yPosition - 3, textWidth, 6, 3);
    pdf.rect(textX, yPosition - 3, textWidth, 6, 'F');
    drawRoundedRect(textX, yPosition - 3, textWidth, 6, 3);
    
    addText("📄 Page Break - Page 2 begins here", pageWidth / 2, yPosition, { 
      fontSize: 8, 
      color: [185, 28, 28], // text-red-700
      align: 'center',
      fontStyle: 'bold'
    });
    
    pdf.line(margin, yPosition + 3, pageWidth - margin, yPosition + 3);
    
    pdf.addPage();
    yPosition = margin;
    
    // PAGE 2 Header exactly like Page 1
    pdf.setFillColor(248, 250, 252);
    drawRoundedRect(margin, yPosition - 3, pageWidth - 2 * margin, 15, 3);
    pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 15, 'F');
    
    pdf.setDrawColor(226, 232, 240);
    drawRoundedRect(margin, yPosition - 3, pageWidth - 2 * margin, 15, 3);
    
    addText("Brüggen", margin + 3, yPosition + 3, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    addText("Product Information", pageWidth / 2, yPosition + 2, { fontSize: 12, fontStyle: 'bold', align: 'center', color: [51, 65, 85] });
    addText(formData.productNumber || "Recipe Number", pageWidth / 2, yPosition + 6, { fontSize: 10, fontStyle: 'bold', align: 'center', color: [51, 65, 85] });
    
    pdf.setFillColor(255, 255, 255);
    pdf.ellipse(pageWidth - margin - 8, yPosition + 4, 6, 2, 'F');
    addText("Page 2", pageWidth - margin - 8, yPosition + 4, { fontSize: 8, align: 'center', color: [71, 85, 105] });
    
    yPosition += 20;
    
    // Nutrition Table exactly like Live Preview
    const nutritionStartY = yPosition;
    
    pdf.setFillColor(248, 250, 252);
    drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 6, 3);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 6, 3);
    
    addText("Average Nutritional Value", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    yPosition += 8;
    
    const nutrition = formData.nutrition;
    const calculatePerServing = (per100g: number) => (per100g * servingSize / 100).toFixed(1);
    
    // Nutrition table columns
    const nutritionCols = [70, 60, 50];
    const nutritionColX = [margin, margin + nutritionCols[0], margin + nutritionCols[0] + nutritionCols[1]];
    
    // Header row
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 6);
    
    addText("Nutrient", nutritionColX[0] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("per 100 g of product", nutritionColX[1] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText(`per ${servingSize} g of product`, nutritionColX[2] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    
    pdf.line(nutritionColX[1], yPosition, nutritionColX[1], yPosition + 6);
    pdf.line(nutritionColX[2], yPosition, nutritionColX[2], yPosition + 6);
    
    yPosition += 8;
    
    // Nutrition rows exactly like Live Preview
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
        pdf.rect(margin, rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249);
      pdf.rect(margin, rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], rowHeight);
      
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
    
    // Nutrition table border
    const nutritionEndY = yPosition;
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, nutritionStartY + 6, pageWidth - 2 * margin, nutritionEndY - nutritionStartY - 6);
    
    yPosition += 10;

    // Nutri-Score and Claims side by side exactly like Live Preview
    const twoColumnY = yPosition;
    const columnWidth = (pageWidth - 2 * margin - 5) / 2;
    
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
    
    pdf.setDrawColor(226, 232, 240);
    drawRoundedRect(margin, yPosition, columnWidth, 25, 3);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    drawRoundedRect(margin, yPosition, columnWidth, 6, 3);
    pdf.rect(margin, yPosition, columnWidth, 6, 'F');
    pdf.line(margin, yPosition + 6, margin + columnWidth, yPosition + 6);
    
    addText("Nutri-Score Rating", margin + 3, yPosition + 4, { fontSize: 9, fontStyle: 'bold', color: [51, 65, 85] });
    
    // Nutri-Score grade display
    const gradeY = yPosition + 12;
    pdf.setFillColor(255, 255, 255);
    drawRoundedRect(margin + 10, gradeY, 20, 8, 2);
    pdf.rect(margin + 10, gradeY, 20, 8, 'F');
    pdf.setDrawColor(226, 232, 240);
    drawRoundedRect(margin + 10, gradeY, 20, 8, 2);
    
    // Grade color based on Nutri-Score
    const gradeColors: { [key: string]: [number, number, number] } = {
      'A': [0, 128, 0],
      'B': [154, 205, 50],
      'C': [255, 165, 0],
      'D': [255, 140, 0],
      'E': [255, 69, 0]
    };
    
    const gradeColor = gradeColors[nutriScoreResult.nutriGrade] || [0, 0, 0];
    addText(nutriScoreResult.nutriGrade, margin + 20, gradeY + 5, { 
      fontSize: 12, 
      fontStyle: 'bold', 
      align: 'center',
      color: gradeColor
    });
    
    addText(`Grade: ${nutriScoreResult.nutriGrade} • Score: ${nutriScoreResult.finalScore}`, margin + 3, yPosition + 22, { 
      fontSize: 7, 
      color: [71, 85, 105]
    });

    // Claims Section (right column)
    const claimsX = margin + columnWidth + 5;
    
    pdf.setDrawColor(226, 232, 240);
    drawRoundedRect(claimsX, yPosition, columnWidth, 25, 3);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    drawRoundedRect(claimsX, yPosition, columnWidth, 6, 3);
    pdf.rect(claimsX, yPosition, columnWidth, 6, 'F');
    pdf.line(claimsX, yPosition + 6, claimsX + columnWidth, yPosition + 6);
    
    addText("Possible Declarations", claimsX + 3, yPosition + 4, { fontSize: 9, fontStyle: 'bold', color: [51, 65, 85] });
    
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
      { label: "Source of fibre / High fibre", claim: claimsResult.fiber.bestClaim },
      { label: "Source of protein / High protein", claim: claimsResult.protein.bestClaim },
      { label: "Low/Free salt", claim: claimsResult.salt.bestClaim },
      { label: "Low/Free sugar", claim: claimsResult.sugar.bestClaim },
      { label: "Low/Free fat", claim: claimsResult.fat.bestClaim },
      { label: "Low saturated fat", claim: claimsResult.saturatedFat.bestClaim }
    ];

    const claimsToShow = allPossibleClaims.filter(item => item.claim);

    // Add manual declarations
    if (formData.declarations?.wholegrain) {
      claimsToShow.push({ label: "Content of wholegrain", claim: "✓" });
    }
    if (formData.declarations?.other) {
      claimsToShow.push({ label: "Other", claim: formData.declarations.other });
    }

    if (claimsToShow.length === 0) {
      addText("No nutritional claims available", claimsX + 3, yPosition + 12, { fontSize: 7, color: [100, 116, 139] });
    } else {
      claimsToShow.slice(0, 4).forEach((claim, index) => {
        const claimY = yPosition + 9 + (index * 3.5);
        
        // Green background for claims
        pdf.setFillColor(240, 253, 244); // from-green-50
        drawRoundedRect(claimsX + 2, claimY - 1, columnWidth - 4, 3, 1);
        pdf.rect(claimsX + 2, claimY - 1, columnWidth - 4, 3, 'F');
        
        addText(claim.label, claimsX + 3, claimY + 1, { fontSize: 6, color: [71, 85, 105] });
        
        // Green badge
        pdf.setFillColor(220, 252, 231); // bg-green-100
        const badgeWidth = 15;
        drawRoundedRect(claimsX + columnWidth - badgeWidth - 3, claimY - 0.5, badgeWidth, 2, 1);
        pdf.rect(claimsX + columnWidth - badgeWidth - 3, claimY - 0.5, badgeWidth, 2, 'F');
        
        addText(claim.claim, claimsX + columnWidth - badgeWidth + 2, claimY + 1, { 
          fontSize: 5, 
          color: [22, 101, 52], // text-green-800
          align: 'center'
        });
      });
    }
    
    yPosition += 30;
  }

  // Storage Conditions exactly like Live Preview
  pdf.setDrawColor(226, 232, 240);
  drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 3);
  
  // Header
  pdf.setFillColor(248, 250, 252);
  drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 6, 3);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
  pdf.line(margin, yPosition + 6, pageWidth - margin, yPosition + 6);
  
  addText("Storage Conditions", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
  
  // Storage icon
  addText("📦", margin + 3, yPosition + 10, { fontSize: 10, color: [59, 130, 246] }); // text-blue-500
  
  const storageText = formData.storageConditions || "Storage conditions will be generated based on product type selection...";
  addText(storageText, margin + 10, yPosition + 9, { 
    maxWidth: pageWidth - 2 * margin - 12,
    fontSize: 8,
    color: [71, 85, 105]
  });
  
  yPosition += 25;

  // Allergy Advice exactly like Live Preview with red styling
  pdf.setFillColor(254, 242, 242); // bg-red-50
  pdf.setDrawColor(248, 113, 113); // border-red-400
  pdf.rect(margin - 2, yPosition, 4, 18, 'F'); // Left red border
  
  drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 3);
  pdf.setFillColor(254, 242, 242);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'F');
  
  // Warning icon
  addText("⚠", margin + 3, yPosition + 4, { fontSize: 10, color: [239, 68, 68] }); // text-red-500
  
  addText("Allergy Advice", margin + 8, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [153, 27, 27] }); // text-red-800
  
  const allergyText = formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";
  addText(allergyText, margin + 8, yPosition + 8, { 
    maxWidth: pageWidth - 2 * margin - 12,
    fontSize: 8,
    color: [153, 27, 27] // text-red-800
  });
  
  yPosition += 23;

  // Preparation Instructions (if exists)
  if (formData.preparation) {
    pdf.setDrawColor(226, 232, 240);
    drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 15, 3);
    
    // Header
    pdf.setFillColor(248, 250, 252);
    drawRoundedRect(margin, yPosition, pageWidth - 2 * margin, 6, 3);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
    pdf.line(margin, yPosition + 6, pageWidth - margin, yPosition + 6);
    
    addText("Preparation Instructions", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    
    // Preparation icon
    addText("📖", margin + 3, yPosition + 10, { fontSize: 10, color: [139, 69, 19] }); // text-purple-500
    
    addText(formData.preparation, margin + 10, yPosition + 9, { 
      maxWidth: pageWidth - 2 * margin - 12,
      fontSize: 8,
      color: [71, 85, 105]
    });
    
    yPosition += 20;
  }

  // Footer section exactly like Live Preview
  const footerY = pageHeight - 25;
  pdf.setFillColor(248, 250, 252); // bg-slate-100
  drawRoundedRect(margin, footerY, pageWidth - 2 * margin, 15, 3);
  pdf.rect(margin, footerY, pageWidth - 2 * margin, 15, 'F');
  pdf.setDrawColor(226, 232, 240);
  drawRoundedRect(margin, footerY, pageWidth - 2 * margin, 15, 3);
  
  // Valid from (left)
  addText("📅", margin + 3, footerY + 5, { fontSize: 8, color: [100, 116, 139] });
  addText(`Valid from: ${new Date().toLocaleDateString('en-GB')}`, margin + 8, footerY + 5, { 
    fontSize: 8, 
    color: [71, 85, 105],
    fontStyle: 'bold'
  });
  
  // Prepared by (right)
  if (formData.preparedBy || formData.jobTitle) {
    addText("👤", pageWidth - margin - 50, footerY + 5, { fontSize: 8, color: [100, 116, 139] });
    const preparedByText = formData.preparedBy && formData.jobTitle 
      ? `${formData.preparedBy}, ${formData.jobTitle}`
      : formData.preparedBy || formData.jobTitle || '';
    addText(`Prepared by: ${preparedByText}`, pageWidth - margin - 45, footerY + 5, { 
      fontSize: 8, 
      color: [71, 85, 105],
      fontStyle: 'bold'
    });
  }

  // Disclaimer exactly like Live Preview
  const disclaimerY = pageHeight - 8;
  addText("The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.", 
    margin, disclaimerY, { 
    maxWidth: pageWidth - 2 * margin,
    fontSize: 6,
    color: [100, 116, 139] // text-slate-600
  });

  // Save PDF with proper filename
  const fileName = `${formData.productName || 'Product-Information'}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_');
  pdf.save(fileName);
}
