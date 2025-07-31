import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore, getNutriScoreImage } from "./nutri-score";
import { calculateClaims } from "./claims-calculator";

export async function generatePDF(formData: ProductInfo) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  const calculatePerServing = (per100g: number) => {
    return (per100g * servingSize / 100).toFixed(1);
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to draw bordered table
  const drawTable = (
    headers: string[],
    rows: string[][],
    columnWidths: number[],
    headerBg: boolean = true
  ) => {
    // Calculate approximate height considering text wrapping
    const estimatedRowHeight = 8;
    const tableHeight = (rows.length + 1) * estimatedRowHeight + 10;
    checkPageBreak(tableHeight);
    
    const startY = yPosition;
    const startX = margin;
    
    // Draw header
    if (headerBg) {
      pdf.setFillColor(248, 250, 252); // bg-slate-50
    }
    
    let currentX = startX;
    headers.forEach((header, i) => {
      // Draw cell border
      pdf.rect(currentX, startY, columnWidths[i], 8);
      if (headerBg) {
        pdf.rect(currentX, startY, columnWidths[i], 8, 'F');
      }
      
      // Add text
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      const textX = currentX + 2;
      const textY = startY + 5.5;
      pdf.text(header, textX, textY);
      
      currentX += columnWidths[i];
    });
    
    yPosition += 8;
    
    // Draw rows
    rows.forEach(row => {
      currentX = startX;
      row.forEach((cell, i) => {
        // Draw cell border
        pdf.rect(currentX, yPosition, columnWidths[i], 8);
        
        // Add text
        pdf.setFont("helvetica", "normal");
        const textX = currentX + 2;
        const textY = yPosition + 5.5;
        
        // Handle HTML formatting and special cases
        if (cell.includes('<strong>') && cell.includes('</strong>')) {
          const cleanText = cell.replace(/<\/?strong>/g, '');
          pdf.setFont("helvetica", "bold");
          pdf.text(cleanText, textX, textY);
          pdf.setFont("helvetica", "normal");
        } else if (cell.startsWith('**') && cell.endsWith('**')) {
          // Handle markdown-style bold
          const cleanText = cell.replace(/\*\*/g, '');
          pdf.setFont("helvetica", "bold");
          pdf.text(cleanText, textX, textY);
          pdf.setFont("helvetica", "normal");
        } else {
          // Handle text wrapping for long content
          const splitText = pdf.splitTextToSize(cell, columnWidths[i] - 4);
          pdf.text(splitText, textX, textY);
        }
        
        currentX += columnWidths[i];
      });
      yPosition += 8;
    });
  };

  // === HEADER SECTION ===
  // Add logo placeholder (would need to convert image to base64 for actual inclusion)
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("BRÜGGEN LOGO", margin, yPosition + 5);
  
  // Center title
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  const title = "Product Information";
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, (pageWidth - titleWidth) / 2, yPosition + 3);
  
  // Product number (centered)
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  const productNumber = formData.productNumber || "Recipe Number";
  const productNumberWidth = pdf.getTextWidth(productNumber);
  pdf.text(productNumber, (pageWidth - productNumberWidth) / 2, yPosition + 10);
  
  // Page number (right)
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Page 1", pageWidth - margin - 20, yPosition + 5);
  
  // Draw header border line
  yPosition += 15;
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // === PRODUCT NAME SECTION ===
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("Product name:", margin, yPosition);
  
  // Product name in center with golden color simulation (using bold)
  pdf.setFont("helvetica", "bold");
  const productName = formData.productName || "Product name will appear here...";
  const productNameWidth = pdf.getTextWidth(productName);
  pdf.text(productName, (pageWidth - productNameWidth) / 2, yPosition);
  yPosition += 15;

  // === PRODUCT IMAGE ===
  // Note: In a real implementation, you'd need to convert the image to base64 and add it
  if (formData.productImage) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");
    pdf.text("[Product Image]", (pageWidth - 40) / 2, yPosition);
    yPosition += 20;
  }

  // === INGREDIENTS TABLE ===
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
        const ingredientText = `${ingredient.name}${percentage}`;
        
        // Check if this ingredient is marked as base recipe
        if (ingredient.isMarkedAsBase && baseFormatted) {
          return `<strong>${ingredientText}</strong> [${baseFormatted}]`;
        }
        
        return `<strong>${ingredientText}</strong>`;
      })
      .join(', ');
    
    return finalFormatted || "Ingredients will appear here after extraction...";
  };

  // Ingredients table
  const ingredientsText = formatIngredients();
  drawTable(
    ["Ingredients:"],
    [[ingredientsText]],
    [pageWidth - margin * 2],
    true
  );
  
  yPosition += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.text("* percentage in ingredient", margin, yPosition);
  yPosition += 10;

  // Legal text
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  const legalText = "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.";
  const splitLegalText = pdf.splitTextToSize(legalText, pageWidth - margin * 2);
  pdf.text(splitLegalText, margin, yPosition);
  yPosition += splitLegalText.length * 3 + 8;

  // === DETAILED INGREDIENTS TABLE ===
  const generateIngredientsTable = () => {
    const finalIngredients = formData.ingredients || [];
    const baseIngredients = formData.baseProductIngredients || [];
    const markedIngredient = finalIngredients.find(ing => ing.isMarkedAsBase);
    const markedIngredientPercentage = markedIngredient?.percentage || 0;
    const tableIngredients: Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> = [];

    finalIngredients
      .filter(ing => ing.name.trim())
      .forEach(ing => {
        if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
          // Add the marked ingredient itself
          tableIngredients.push({
            name: ing.name,
            percentage: ing.percentage || 0,
            origin: ing.origin || "",
            isFinalProduct: true
          });
          
          // Add base product ingredients with recalculated percentages
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
            name: ing.name,
            percentage: ing.percentage || 0,
            origin: ing.origin || "",
            isFinalProduct: true
          });
        }
      });

    return tableIngredients;
  };

  if (formData.ingredients?.some(ing => ing.name.trim()) || formData.baseProductIngredients?.some(ing => ing.name.trim())) {
    const ingredientsTable = generateIngredientsTable();
    const ingredientRows = ingredientsTable.map(ingredient => [
      ingredient.isFinalProduct ? `**${ingredient.name}**` : ingredient.name,
      `${ingredient.percentage}%`,
      ingredient.origin || ""
    ]);
    
    drawTable(
      ["Ingredients", "Percentage content per whole product", "Country of Origin"],
      ingredientRows,
      [70, 60, 40],
      true
    );
    yPosition += 8;
  }

  // === NUTRITIONAL TABLE ===
  if (formData.nutrition) {
    checkPageBreak(80);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Average nutritional value:", margin, yPosition);
    yPosition += 8;

    const nutritionRows = [
      ["Energy", `${formData.nutrition.energy.kj} kJ / ${formData.nutrition.energy.kcal} kcal`, `${calculatePerServing(formData.nutrition.energy.kj)} kJ / ${calculatePerServing(formData.nutrition.energy.kcal)} kcal`],
      ["Fat", `${formData.nutrition.fat} g`, `${calculatePerServing(formData.nutrition.fat)} g`],
      ["of which saturates", `${formData.nutrition.saturatedFat} g`, `${calculatePerServing(formData.nutrition.saturatedFat)} g`],
      ["Carbohydrates", `${formData.nutrition.carbohydrates} g`, `${calculatePerServing(formData.nutrition.carbohydrates)} g`],
      ["of which sugars", `${formData.nutrition.sugars} g`, `${calculatePerServing(formData.nutrition.sugars)} g`],
      ["Fibre", `${formData.nutrition.fiber} g`, `${calculatePerServing(formData.nutrition.fiber)} g`],
      ["Protein", `${formData.nutrition.protein} g`, `${calculatePerServing(formData.nutrition.protein)} g`],
      ["Salt", `${formData.nutrition.salt} g`, `${calculatePerServing(formData.nutrition.salt)} g`]
    ];

    drawTable(
      ["", "per 100 g of product", `per ${servingSize} g of product`],
      nutritionRows,
      [50, 60, 60],
      true
    );
    yPosition += 8;

    // === NUTRI-SCORE SECTION ===
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

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Nutri-Score", margin, yPosition);
    yPosition += 5;
    
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    const nutriScoreText = `Nutri-Score: ${nutriScore.nutriGrade}`;
    const nutriScoreWidth = pdf.getTextWidth(nutriScoreText);
    pdf.text(nutriScoreText, (pageWidth - nutriScoreWidth) / 2, yPosition);
    yPosition += 15;

    // === CLAIMS SECTION ===
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
    
    // Add manual declarations
    if (formData.declarations?.wholegrain) {
      claimsToShow.push({ label: "Content of wholegrain", claim: "✓" });
    }
    if (formData.declarations?.other) {
      claimsToShow.push({ label: "Other", claim: formData.declarations.other });
    }

    if (claimsToShow.length > 0) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Possible declarations", margin, yPosition);
      yPosition += 8;

      const claimsRows = claimsToShow.map(item => [item.label, item.claim || ""]);
      drawTable(
        ["Claim", "Status"],
        claimsRows,
        [120, 50],
        true
      );
      yPosition += 8;
    }
  }

  // === ADDITIONAL SECTIONS ===
  // Storage Conditions
  if (formData.storageConditions) {
    checkPageBreak(25);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Storage Conditions", margin, yPosition);
    yPosition += 8;
    
    drawTable(
      [""],
      [[formData.storageConditions]],
      [pageWidth - margin * 2],
      false
    );
    yPosition += 8;
  }

  // Allergy Advice - Always include in PDF
  checkPageBreak(25);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Allergy Advice", margin, yPosition);
  yPosition += 8;
  
  const allergyText = formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";
  drawTable(
    [""],
    [[allergyText]],
    [pageWidth - margin * 2],
    false
  );
  yPosition += 8;

  // Preparation
  if (formData.preparation) {
    checkPageBreak(25);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Preparation", margin, yPosition);
    yPosition += 8;
    
    drawTable(
      [""],
      [[formData.preparation]],
      [pageWidth - margin * 2],
      false
    );
    yPosition += 8;
  }

  // === FOOTER SECTION ===
  checkPageBreak(40);
  
  // Draw separator line
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Footer content
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  const today = new Date().toLocaleDateString('en-GB');
  pdf.text(`Valid from: ${today}`, margin, yPosition);
  
  if (formData.preparedBy || formData.jobTitle) {
    const preparedByText = formData.preparedBy && formData.jobTitle 
      ? `${formData.preparedBy}, ${formData.jobTitle}`
      : formData.preparedBy || formData.jobTitle || '';
    pdf.text(`Prepared by: ${preparedByText}`, pageWidth - margin - 80, yPosition);
  }
  
  yPosition += 15;

  // Final disclaimer
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  const finalNote = "The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.";
  const splitFinalNote = pdf.splitTextToSize(finalNote, pageWidth - margin * 2);
  pdf.text(splitFinalNote, margin, yPosition);

  // Save the PDF
  const filename = `${formData.productName || 'Product'}_Information_Paper.pdf`;
  pdf.save(filename);
}
