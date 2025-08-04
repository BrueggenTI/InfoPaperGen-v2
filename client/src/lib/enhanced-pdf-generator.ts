import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore } from "./nutri-score";
import { getValidClaims } from "./claims-calculator";

export async function generateEnhancedPDF(formData: ProductInfo) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  let yPosition = margin;
  
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  // Helper functions
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

  // Header - exactly like Live Preview with gray background box
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 12, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 12);
  
  addText("Brüggen", margin + 3, yPosition + 3, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
  addText("Product Information", pageWidth / 2, yPosition + 1, { fontSize: 12, fontStyle: 'bold', align: 'center', color: [51, 65, 85] });
  addText(formData.productNumber || "Recipe Number", pageWidth / 2, yPosition + 5, { fontSize: 10, fontStyle: 'bold', align: 'center', color: [51, 65, 85] });
  addText("Page 1", pageWidth - margin - 3, yPosition + 3, { fontSize: 8, align: 'right', color: [51, 65, 85] });
  
  yPosition += 18;

  // Product Name Section - exactly like Live Preview with background
  pdf.setFillColor(253, 254, 255);
  pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 12, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 12);
  
  addText("PRODUCT NAME", pageWidth / 2, yPosition + 2, { fontSize: 8, color: [100, 116, 139], align: 'center' });
  addText(formData.productName || "Product name will appear here...", pageWidth / 2, yPosition + 7, { 
    fontSize: 11, 
    fontStyle: 'bold', 
    align: 'center',
    color: [217, 119, 6]
  });
  yPosition += 18;

  // Ingredients Section - exactly like Live Preview with border box
  const finalIngredients = formData.ingredients || [];
  const baseIngredients = formData.baseProductIngredients || [];
  
  if (finalIngredients.length > 0 || baseIngredients.length > 0) {
    const sectionHeight = 25;
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, sectionHeight);
    
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
    pdf.line(margin, yPosition + 6, pageWidth - margin, yPosition + 6);
    
    addText("Ingredients", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    
    const formatIngredientsForPDF = () => {
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
      addText("* percentage in ingredient", margin + 3, yPosition + sectionHeight - 4, { 
        fontSize: 7, 
        color: [100, 116, 139]
      });
    }
    
    yPosition += sectionHeight + 5;
  }

  // Detailed Ingredients Table - exactly like Live Preview  
  if (finalIngredients.length > 0 || baseIngredients.length > 0) {
    const tableStartY = yPosition;
    
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6);
    
    addText("Detailed Ingredients Breakdown", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    yPosition += 8;
    
    const colWidths = [90, 55, 40];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];
    
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, colWidths[0] + colWidths[1] + colWidths[2], 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition, colWidths[0] + colWidths[1] + colWidths[2], 6);
    
    addText("Ingredients", colX[0] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Percentage content per whole product", colX[1] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("Country of Origin", colX[2] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    
    pdf.line(colX[1], yPosition, colX[1], yPosition + 6);
    pdf.line(colX[2], yPosition, colX[2], yPosition + 6);
    
    yPosition += 8;
    
    // Generate table ingredients
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
    
    tableIngredients.forEach((ingredient, index) => {
      const rowY = yPosition;
      const rowHeight = 5;
      
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249);
      pdf.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight);
      
      addText(ingredient.name, colX[0] + 2, rowY + 3, { 
        fontSize: 7, 
        fontStyle: ingredient.isFinalProduct ? 'bold' : 'normal',
        color: ingredient.isFinalProduct ? [51, 65, 85] : [100, 116, 139]
      });
      addText(`${ingredient.percentage}%`, colX[1] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      addText(ingredient.origin || "-", colX[2] + 2, rowY + 3, { fontSize: 7, color: [100, 116, 139] });
      
      pdf.line(colX[1], rowY, colX[1], rowY + rowHeight);
      pdf.line(colX[2], rowY, colX[2], rowY + rowHeight);
      
      yPosition += rowHeight;
    });
    
    const tableEndY = yPosition;
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, tableStartY + 6, pageWidth - 2 * margin, tableEndY - tableStartY - 6);
    
    yPosition += 5;
  }

  // Page Break for Nutrition Section - like Live Preview
  if (formData.nutrition) {
    pdf.addPage();
    yPosition = margin;
    
    // Page 2 Header
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 12, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 12);
    
    addText("Brüggen", margin + 3, yPosition + 3, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    addText("Product Information", pageWidth / 2, yPosition + 1, { fontSize: 12, fontStyle: 'bold', align: 'center', color: [51, 65, 85] });
    addText(formData.productNumber || "Recipe Number", pageWidth / 2, yPosition + 5, { fontSize: 10, fontStyle: 'bold', align: 'center', color: [51, 65, 85] });
    addText("Page 2", pageWidth - margin - 3, yPosition + 3, { fontSize: 8, align: 'right', color: [51, 65, 85] });
    
    yPosition += 20;
    
    // Nutrition section
    const nutritionStartY = yPosition;
    
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6);
    
    addText("Average Nutritional Value", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    yPosition += 8;
    
    const nutrition = formData.nutrition;
    const calculatePerServing = (per100g: number) => (per100g * servingSize / 100).toFixed(1);
    
    const nutritionCols = [90, 50, 45];
    const nutritionColX = [margin, margin + nutritionCols[0], margin + nutritionCols[0] + nutritionCols[1]];
    
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 6, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 6);
    
    addText("", nutritionColX[0] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText("per 100g", nutritionColX[1] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    addText(`per ${servingSize}g`, nutritionColX[2] + 2, yPosition + 4, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
    
    pdf.line(nutritionColX[1], yPosition, nutritionColX[1], yPosition + 6);
    pdf.line(nutritionColX[2], yPosition, nutritionColX[2], yPosition + 6);
    
    yPosition += 8;
    
    const nutritionRows = [
      { 
        label: "Energy", 
        value100g: `${nutrition.energy.kj} kJ / ${nutrition.energy.kcal} kcal`,
        valueServing: `${calculatePerServing(nutrition.energy.kj)} kJ / ${calculatePerServing(nutrition.energy.kcal)} kcal`
      },
      { label: "Fat", value100g: `${nutrition.fat}g`, valueServing: `${calculatePerServing(nutrition.fat)}g` },
      { label: "of which saturates", value100g: `${nutrition.saturatedFat}g`, valueServing: `${calculatePerServing(nutrition.saturatedFat)}g` },
      { label: "Carbohydrates", value100g: `${nutrition.carbohydrates}g`, valueServing: `${calculatePerServing(nutrition.carbohydrates)}g` },
      { label: "of which sugars", value100g: `${nutrition.sugars}g`, valueServing: `${calculatePerServing(nutrition.sugars)}g` },
      { label: "Fiber", value100g: `${nutrition.fiber}g`, valueServing: `${calculatePerServing(nutrition.fiber)}g` },
      { label: "Protein", value100g: `${nutrition.protein}g`, valueServing: `${calculatePerServing(nutrition.protein)}g` },
      { label: "Salt", value100g: `${nutrition.salt}g`, valueServing: `${calculatePerServing(nutrition.salt)}g` }
    ];
    
    nutritionRows.forEach((row, index) => {
      const rowY = yPosition;
      const rowHeight = 5;
      
      if (index % 2 === 1) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], rowHeight, 'F');
      }
      
      pdf.setDrawColor(241, 245, 249);
      pdf.rect(margin, rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], rowHeight);
      
      addText(row.label, nutritionColX[0] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      addText(row.value100g, nutritionColX[1] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      addText(row.valueServing, nutritionColX[2] + 2, rowY + 3, { fontSize: 7, color: [71, 85, 105] });
      
      pdf.line(nutritionColX[1], rowY, nutritionColX[1], rowY + rowHeight);
      pdf.line(nutritionColX[2], rowY, nutritionColX[2], rowY + rowHeight);
      
      yPosition += rowHeight;
    });
    
    const nutritionEndY = yPosition;
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, nutritionStartY + 6, pageWidth - 2 * margin, nutritionEndY - nutritionStartY - 6);
    
    yPosition += 5;

    // Nutri-Score Section
    const nutriScoreResult = calculateNutriScore({
      energy: nutrition.energy,
      fat: nutrition.fat,
      saturatedFat: nutrition.saturatedFat,
      carbohydrates: nutrition.carbohydrates,
      sugars: nutrition.sugars,
      fiber: nutrition.fiber,
      protein: nutrition.protein,
      salt: nutrition.salt,
      fruitVegLegumeContent: nutrition.fruitVegLegumeContent || 0
    });
    
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6);
    
    addText("Nutri-Score", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
    yPosition += 8;
    
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12);
    
    addText(`Grade: ${nutriScoreResult.nutriGrade}`, margin + 3, yPosition + 4, { fontSize: 9, fontStyle: 'bold', color: [71, 85, 105] });
    addText(`Score: ${nutriScoreResult.finalScore}`, margin + 3, yPosition + 8, { fontSize: 8, color: [71, 85, 105] });
    
    yPosition += 17;

    // Claims Section
    const validClaims = getValidClaims({
      protein: nutrition.protein,
      fiber: nutrition.fiber,
      salt: nutrition.salt,
      sugars: nutrition.sugars,
      fat: nutrition.fat,
      saturatedFat: nutrition.saturatedFat
    });
    
    if (validClaims.length > 0) {
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6);
      
      addText("Nutrient Claims", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
      yPosition += 8;
      
      const claimsHeight = validClaims.length * 4 + 4;
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, claimsHeight);
      
      validClaims.forEach((claim, index) => {
        addText(`• ${claim}`, margin + 3, yPosition + 3 + (index * 4), { fontSize: 8, color: [71, 85, 105] });
      });
      
      yPosition += claimsHeight + 5;
    }

    // Storage Conditions Section
    if (formData.storageConditions) {
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6);
      
      addText("Storage Conditions", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
      yPosition += 8;
      
      const storageLines = pdf.splitTextToSize(formData.storageConditions, pageWidth - 2 * margin - 6);
      const storageHeight = storageLines.length * 3 + 4;
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, storageHeight);
      
      addText(formData.storageConditions, margin + 3, yPosition + 3, { 
        maxWidth: pageWidth - 2 * margin - 6,
        fontSize: 8,
        color: [71, 85, 105]
      });
      yPosition += storageHeight + 5;
    }
    
    // Preparation Section
    if (formData.preparation) {
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6);
      
      addText("Preparation", margin + 3, yPosition + 4, { fontSize: 10, fontStyle: 'bold', color: [51, 65, 85] });
      yPosition += 8;
      
      const prepLines = pdf.splitTextToSize(formData.preparation, pageWidth - 2 * margin - 6);
      const prepHeight = prepLines.length * 3 + 4;
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, prepHeight);
      
      addText(formData.preparation, margin + 3, yPosition + 3, { 
        maxWidth: pageWidth - 2 * margin - 6,
        fontSize: 8,
        color: [71, 85, 105]
      });
      yPosition += prepHeight + 5;
    }
  }

  // Footer - exactly like Live Preview at bottom of page
  const footerY = pageHeight - 15;
  addText(`Valid from: ${new Date().toLocaleDateString('de-DE')}`, margin, footerY, { fontSize: 8, color: [100, 116, 139] });
  
  if (formData.preparedBy && formData.jobTitle) {
    const preparedByText = `Prepared by: ${formData.preparedBy} (${formData.jobTitle})`;
    addText(preparedByText, pageWidth - margin, footerY, { fontSize: 8, color: [100, 116, 139], align: 'right' });
  }

  // Save the PDF
  const fileName = `${formData.productName || 'Product-Information'}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_');
  pdf.save(fileName);
}