import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore, getNutriScoreImage } from "./nutri-score";
import { getValidClaims } from "./claims-calculator";

export async function generateEnhancedPDF(formData: ProductInfo) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
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
      return lines.length * (options.fontSize || 10) * 0.35; // Return height used
    } else {
      pdf.text(text, x, y, { align: options.align || 'left' });
      return (options.fontSize || 10) * 0.35;
    }
  };

  const addSection = (title: string) => {
    yPosition += 8;
    addText(title, margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
    yPosition += 6;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header - styled like Live Preview
  addText("Brüggen", margin, yPosition, { fontSize: 14, fontStyle: 'bold', color: [200, 50, 50] });
  addText("Product Information", pageWidth / 2, yPosition, { fontSize: 16, fontStyle: 'bold', align: 'center' });
  addText(new Date().toLocaleDateString('de-DE'), pageWidth - margin, yPosition, { fontSize: 10, align: 'right' });
  yPosition += 10;

  // Product Name - Large centered like Live Preview
  yPosition += 5;
  addText(formData.productName || "Product Name", pageWidth / 2, yPosition, { 
    fontSize: 20, 
    fontStyle: 'bold', 
    align: 'center' 
  });
  yPosition += 15;

  // Product Details Section
  if (formData.productNumber || formData.category || formData.packageSize) {
    addSection("Product Details");
    
    if (formData.productNumber) {
      addText(`Product Number: ${formData.productNumber}`, margin, yPosition, { fontStyle: 'bold' });
      yPosition += 5;
    }
    
    if (formData.category) {
      addText(`Category: ${formData.category}`, margin, yPosition);
      yPosition += 5;
    }
    
    if (formData.packageSize) {
      addText(`Package Size: ${formData.packageSize}`, margin, yPosition);
      yPosition += 5;
    }
  }

  // Ingredients Section - Formatted like Live Preview
  const finalIngredients = formData.ingredients || [];
  const baseIngredients = formData.baseProductIngredients || [];
  
  if (finalIngredients.length > 0 || baseIngredients.length > 0) {
    checkPageBreak(30);
    addSection("Ingredients");
    
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
      
      return finalFormatted || "No ingredients specified";
    };

    const ingredientsText = formatIngredientsForPDF();
    const textHeight = addText(ingredientsText, margin, yPosition, { 
      maxWidth: pageWidth - 2 * margin,
      fontSize: 9
    });
    yPosition += textHeight + 2;
    
    if (baseIngredients.length > 0) {
      addText("* percentage in ingredient", margin, yPosition, { fontSize: 8, color: [100, 100, 100] });
      yPosition += 5;
    }
  }

  // Ingredients Table - Like Live Preview
  if (finalIngredients.length > 0 || baseIngredients.length > 0) {
    checkPageBreak(50);
    addSection("Ingredients Table");
    
    // Table headers
    const tableY = yPosition;
    const colWidths = [80, 60, 45];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];
    
    // Header row
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, tableY, colWidths[0] + colWidths[1] + colWidths[2], 8, 'F');
    
    addText("Ingredients", colX[0] + 2, tableY + 5, { fontSize: 9, fontStyle: 'bold' });
    addText("Percentage", colX[1] + 2, tableY + 5, { fontSize: 9, fontStyle: 'bold' });
    addText("Origin", colX[2] + 2, tableY + 5, { fontSize: 9, fontStyle: 'bold' });
    
    yPosition += 10;
    
    // Table rows
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
      checkPageBreak(6);
      
      const rowY = yPosition;
      
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2], 6, 'F');
      }
      
      addText(ingredient.name, colX[0] + 2, rowY + 4, { 
        fontSize: 8, 
        fontStyle: ingredient.isFinalProduct ? 'bold' : 'normal'
      });
      addText(`${ingredient.percentage}%`, colX[1] + 2, rowY + 4, { fontSize: 8 });
      addText(ingredient.origin, colX[2] + 2, rowY + 4, { fontSize: 8 });
      
      yPosition += 6;
    });
    
    // Table borders
    for (let i = 0; i <= tableIngredients.length; i++) {
      const lineY = tableY + (i * 6) + (i === 0 ? 8 : 0);
      pdf.line(margin, lineY, margin + colWidths[0] + colWidths[1] + colWidths[2], lineY);
    }
    
    for (let i = 0; i <= 3; i++) {
      const lineX = i === 0 ? margin : colX[i - 1] + colWidths[i - 1];
      pdf.line(lineX, tableY, lineX, yPosition);
    }
  }

  // Nutrition Information Section - Like Live Preview
  if (formData.nutrition) {
    checkPageBreak(80);
    addSection("Average Nutritional Value");
    
    const nutrition = formData.nutrition;
    const calculatePerServing = (per100g: number) => (per100g * servingSize / 100).toFixed(1);
    
    // Nutrition table
    const nutritionY = yPosition;
    const nutritionCols = [70, 50, 50];
    const nutritionColX = [margin, margin + nutritionCols[0], margin + nutritionCols[0] + nutritionCols[1]];
    
    // Header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, nutritionY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 8, 'F');
    
    addText("", nutritionColX[0] + 2, nutritionY + 5, { fontSize: 9, fontStyle: 'bold' });
    addText("per 100g", nutritionColX[1] + 2, nutritionY + 5, { fontSize: 9, fontStyle: 'bold' });
    addText(`per ${servingSize}g`, nutritionColX[2] + 2, nutritionY + 5, { fontSize: 9, fontStyle: 'bold' });
    
    yPosition += 10;
    
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
      checkPageBreak(6);
      
      const rowY = yPosition;
      
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, rowY, nutritionCols[0] + nutritionCols[1] + nutritionCols[2], 6, 'F');
      }
      
      addText(row.label, nutritionColX[0] + 2, rowY + 4, { fontSize: 8 });
      addText(row.value100g, nutritionColX[1] + 2, rowY + 4, { fontSize: 8 });
      addText(row.valueServing, nutritionColX[2] + 2, rowY + 4, { fontSize: 8 });
      
      yPosition += 6;
    });
    
    // Nutrition table borders
    for (let i = 0; i <= nutritionRows.length; i++) {
      const lineY = nutritionY + (i * 6) + (i === 0 ? 8 : 0);
      pdf.line(margin, lineY, margin + nutritionCols[0] + nutritionCols[1] + nutritionCols[2], lineY);
    }
    
    for (let i = 0; i <= 3; i++) {
      const lineX = i === 0 ? margin : nutritionColX[i - 1] + nutritionCols[i - 1];
      pdf.line(lineX, nutritionY, lineX, yPosition);
    }
  }

  // Nutri-Score Section - Like Live Preview
  if (formData.nutrition) {
    checkPageBreak(25);
    addSection("Nutri-Score");
    
    const nutriScoreResult = calculateNutriScore({
      energy: formData.nutrition.energy,
      fat: formData.nutrition.fat,
      saturatedFat: formData.nutrition.saturatedFat,
      carbohydrates: formData.nutrition.carbohydrates,
      sugars: formData.nutrition.sugars,
      fiber: formData.nutrition.fiber,
      protein: formData.nutrition.protein,
      salt: formData.nutrition.salt,
      fruitVegLegumeContent: formData.nutrition.fruitVegLegumeContent || 0
    });
    
    addText(`Grade: ${nutriScoreResult.nutriGrade}`, margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
    yPosition += 6;
    addText(`Score: ${nutriScoreResult.finalScore}`, margin, yPosition, { fontSize: 10 });
    yPosition += 10;
  }

  // Claims Section - Like Live Preview
  if (formData.nutrition) {
    const validClaims = getValidClaims({
      protein: formData.nutrition.protein,
      fiber: formData.nutrition.fiber,
      salt: formData.nutrition.salt,
      sugars: formData.nutrition.sugars,
      fat: formData.nutrition.fat,
      saturatedFat: formData.nutrition.saturatedFat
    });
    
    if (validClaims.length > 0) {
      checkPageBreak(20);
      addSection("Nutrient Claims");
      
      validClaims.forEach(claim => {
        addText(`• ${claim}`, margin, yPosition, { fontSize: 9 });
        yPosition += 5;
      });
    }
  }

  // Storage & Preparation Section - Like Live Preview
  if (formData.storageConditions || formData.preparation || formData.allergyAdvice) {
    checkPageBreak(30);
    
    if (formData.storageConditions) {
      addSection("Storage Conditions");
      const storageHeight = addText(formData.storageConditions, margin, yPosition, { 
        maxWidth: pageWidth - 2 * margin,
        fontSize: 9
      });
      yPosition += storageHeight + 5;
    }
    
    if (formData.allergyAdvice) {
      addSection("Allergy Advice");
      const allergyHeight = addText(formData.allergyAdvice, margin, yPosition, { 
        maxWidth: pageWidth - 2 * margin,
        fontSize: 9
      });
      yPosition += allergyHeight + 5;
    }
    
    if (formData.preparation) {
      addSection("Preparation");
      const prepHeight = addText(formData.preparation, margin, yPosition, { 
        maxWidth: pageWidth - 2 * margin,
        fontSize: 9
      });
      yPosition += prepHeight + 5;
    }
  }

  // Footer - Like Live Preview
  yPosition = pageHeight - 20;
  addText(`Valid from: ${new Date().toLocaleDateString('de-DE')}`, margin, yPosition, { fontSize: 8, color: [100, 100, 100] });
  
  if (formData.preparedBy || formData.jobTitle) {
    const preparedByText = `Prepared by: ${formData.preparedBy || 'Unknown'} (${formData.jobTitle || 'Position'})`;
    addText(preparedByText, pageWidth - margin, yPosition, { fontSize: 8, color: [100, 100, 100], align: 'right' });
  }

  // Save the PDF
  const fileName = `${formData.productName || 'Product-Information'}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_');
  pdf.save(fileName);
}