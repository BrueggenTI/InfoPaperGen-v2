
import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore } from "./nutri-score";
import { calculateClaims } from "./claims-calculator";

export async function generatePDF(formData: ProductInfo) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;
  let currentPage = 1;
  
  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  const calculatePerServing = (per100g: number) => {
    return (per100g * servingSize / 100).toFixed(1);
  };

  // Helper function to add a new page with header
  const addNewPageWithHeader = () => {
    pdf.addPage();
    currentPage++;
    yPosition = margin;
    drawHeader();
    yPosition += 35; // Space after header
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin - 20) {
      addNewPageWithHeader();
      return true;
    }
    return false;
  };

  // Draw header exactly like live preview
  const drawHeader = () => {
    // Header background - gradient simulation with light gray
    pdf.setFillColor(248, 250, 252); // from-slate-50
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 30, 4, 4, 'F');
    
    // Header border
    pdf.setDrawColor(203, 213, 225); // border-slate-200
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 30, 4, 4);

    // Logo text (left side)
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85); // text-slate-800
    pdf.text("Brüggen", margin + 10, yPosition + 12);

    // Centered content
    const centerX = pageWidth / 2;
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text("Product Information", centerX, yPosition + 15, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text(formData.productNumber || "Recipe Number", centerX, yPosition + 22, { align: 'center' });

    // Page number (right side)
    const pageNumX = pageWidth - margin - 35;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(pageNumX, yPosition + 8, 30, 14, 6, 6, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(pageNumX, yPosition + 8, 30, 14, 6, 6);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Page ${currentPage}`, pageNumX + 15, yPosition + 17, { align: 'center' });

    yPosition += 30;
  };

  // Draw section with exact styling from live preview
  const drawSection = (title: string, content: () => void, minHeight = 0) => {
    const startY = yPosition;
    
    // Section border and background
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(203, 213, 225); // border-slate-200
    pdf.setLineWidth(0.5);
    
    // Title bar
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 4, 4, 'F');
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 4, 4);
    
    // Title with bottom border
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, yPosition + 18, pageWidth - margin, yPosition + 18);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85); // text-slate-800
    pdf.text(title, margin + 12, yPosition + 12);
    
    yPosition += 18;
    
    // Content area
    const contentStartY = yPosition;
    content();
    
    // Calculate actual content height
    const contentHeight = Math.max(yPosition - contentStartY, minHeight);
    
    // Draw content area border
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin, contentStartY, pageWidth - 2 * margin, contentHeight, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(margin, contentStartY, pageWidth - 2 * margin, contentHeight);
    
    // Complete section border (rounded corners)
    const totalHeight = 18 + contentHeight;
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin, startY, pageWidth - 2 * margin, totalHeight, 4, 4);
    
    yPosition = contentStartY + contentHeight + 8; // Space after section
  };

  // Draw info box exactly like live preview
  const drawInfoBox = (title: string, content: string, borderColor = [248, 113, 113], bgColor = [254, 242, 242], textColor = [153, 27, 27]) => {
    checkPageBreak(30);
    
    const lines = pdf.splitTextToSize(content, pageWidth - 2 * margin - 20);
    const boxHeight = Math.max(25, lines.length * 5 + 20);
    
    // Background
    pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, boxHeight, 4, 4, 'F');
    
    // Left accent border
    pdf.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.roundedRect(margin, yPosition, 4, boxHeight, 2, 2, 'F');
    
    // Main border
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(1);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, boxHeight, 4, 4);
    
    // Icon area (simulated)
    pdf.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.circle(margin + 15, yPosition + 12, 3, 'F');
    
    // Title
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    pdf.text(title, margin + 25, yPosition + 10);
    
    // Content
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    lines.forEach((line: string, index: number) => {
      pdf.text(line, margin + 25, yPosition + 18 + (index * 5));
    });
    
    yPosition += boxHeight + 12;
  };

  // Start PDF generation
  drawHeader();
  yPosition += 10;

  // Product Name Section - exact styling from live preview
  checkPageBreak(25);
  pdf.setFillColor(255, 255, 255); // bg-white
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 22, 4, 4, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 22, 4, 4);
  
  // Gradient background simulation
  pdf.setFillColor(248, 250, 252); // from-slate-50
  pdf.roundedRect(margin + 1, yPosition + 1, pageWidth - 2 * margin - 2, 20, 3, 3, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 116, 139); // text-slate-500
  pdf.text("PRODUCT NAME", pageWidth / 2, yPosition + 8, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(217, 119, 6); // amber-600
  pdf.text(formData.productName || "Product name will appear here...", pageWidth / 2, yPosition + 16, { align: 'center' });
  
  yPosition += 30;

  // Ingredients Section - exact match to live preview
  if (formData.ingredients?.length || formData.baseProductIngredients?.length) {
    drawSection("Ingredients", () => {
      yPosition += 8;
      
      // Format ingredients exactly like live preview
      const finalIngredients = formData.ingredients || [];
      const baseIngredients = formData.baseProductIngredients || [];
      
      let ingredientsText = "";
      if (finalIngredients.length > 0 || baseIngredients.length > 0) {
        const finalFormatted = finalIngredients
          .filter(ingredient => ingredient.name.trim() !== "")
          .map(ingredient => {
            const percentage = ingredient.percentage ? ` (${ingredient.percentage}%)` : '';
            let ingredientText = `${ingredient.name}${percentage}`;
            
            if (ingredient.isMarkedAsBase && baseIngredients.length > 0) {
              const baseFormatted = baseIngredients
                .filter(baseIng => baseIng.name.trim() !== "")
                .map(baseIng => {
                  const basePercentage = baseIng.percentage ? ` ${baseIng.percentage}%*` : '';
                  return `${baseIng.name}${basePercentage}`;
                })
                .join(', ');
              
              if (baseFormatted) {
                ingredientText = `${ingredientText} [${baseFormatted}]`;
              }
            }
            
            return ingredientText;
          })
          .join(', ');
        
        ingredientsText = finalFormatted || "Ingredients will appear here after extraction...";
      } else {
        ingredientsText = "Ingredients will appear here after extraction...";
      }
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105); // text-slate-700
      
      const maxWidth = pageWidth - 2 * margin - 24;
      const lines = pdf.splitTextToSize(ingredientsText, maxWidth);
      
      lines.forEach((line: string, index: number) => {
        if (index > 0) checkPageBreak(6);
        pdf.text(line, margin + 12, yPosition + 4 + (index * 6));
      });
      
      yPosition += Math.max(lines.length * 6, 12) + 8;
      
      // Percentage note
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 116, 139); // text-slate-500
      pdf.text("* percentage in ingredient", margin + 12, yPosition);
      yPosition += 10;
    });

    // Quality assurance info box - exact blue styling from live preview
    drawInfoBox("Quality Assurance", 
      "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.",
      [96, 165, 250], [239, 246, 255], [30, 64, 175]); // Blue colors
  }

  // Detailed Ingredients Table - exact match to live preview
  if ((formData.ingredients?.some(ing => ing.name.trim()) || formData.baseProductIngredients?.some(ing => ing.name.trim()))) {
    const generateIngredientsTable = (): Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> => {
      const finalIngredients = formData.ingredients || [];
      const baseIngredients = formData.baseProductIngredients || [];
      const tableIngredients: Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> = [];

      const markedIngredient = finalIngredients.find(ing => ing.isMarkedAsBase);
      const markedIngredientPercentage = markedIngredient?.percentage || 0;

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

    const tableIngredients = generateIngredientsTable();
    
    if (tableIngredients.length > 0) {
      drawSection("Detailed Ingredients Breakdown", () => {
        yPosition += 8;
        
        const rowHeight = 12;
        const colWidths = [90, 80, 60];
        
        // Table header
        pdf.setFillColor(248, 250, 252); // bg-slate-50
        pdf.rect(margin + 8, yPosition, pageWidth - 2 * margin - 16, rowHeight, 'F');
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(margin + 8, yPosition, pageWidth - 2 * margin - 16, rowHeight);
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(71, 85, 105);
        
        pdf.text("Ingredients", margin + 12, yPosition + 8);
        pdf.text("Percentage content per whole product", margin + 12 + colWidths[0], yPosition + 8);
        pdf.text("Country of Origin", margin + 12 + colWidths[0] + colWidths[1], yPosition + 8);
        
        yPosition += rowHeight;
        
        // Table rows
        tableIngredients.forEach((ingredient, index) => {
          checkPageBreak(rowHeight + 2);
          
          // Alternating row colors
          if (index % 2 === 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(margin + 8, yPosition, pageWidth - 2 * margin - 16, rowHeight, 'F');
          }
          
          pdf.setDrawColor(203, 213, 225);
          pdf.rect(margin + 8, yPosition, pageWidth - 2 * margin - 16, rowHeight);
          
          pdf.setFontSize(8);
          pdf.setFont("helvetica", ingredient.isFinalProduct ? "bold" : "normal");
          pdf.setTextColor(ingredient.isFinalProduct ? 51 : 100, ingredient.isFinalProduct ? 65 : 116, ingredient.isFinalProduct ? 85 : 139);
          
          pdf.text(ingredient.name, margin + 12, yPosition + 8);
          pdf.text(`${ingredient.percentage}%`, margin + 12 + colWidths[0], yPosition + 8);
          pdf.text(ingredient.origin || "-", margin + 12 + colWidths[0] + colWidths[1], yPosition + 8);
          
          yPosition += rowHeight;
        });
        
        yPosition += 8;
      });
    }
  }

  // Page break for nutrition section if needed
  if (formData.nutrition) {
    if (yPosition > pageHeight * 0.6) {
      addNewPageWithHeader();
    }
  }

  // Nutritional Table - exact match to live preview
  if (formData.nutrition) {
    drawSection("Average Nutritional Value", () => {
      yPosition += 8;
      
      const rowHeight = 12;
      const colWidth = (pageWidth - 2 * margin - 16) / 3;
      
      // Table header
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin + 8, yPosition, pageWidth - 2 * margin - 16, rowHeight, 'F');
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(margin + 8, yPosition, pageWidth - 2 * margin - 16, rowHeight);
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(71, 85, 105);
      
      pdf.text("Nutrient", margin + 12, yPosition + 8);
      pdf.text("per 100 g of product", margin + 12 + colWidth, yPosition + 8, { align: 'center' });
      pdf.text(`per ${servingSize} g of product`, margin + 12 + 2 * colWidth, yPosition + 8, { align: 'center' });
      
      yPosition += rowHeight;
      
      // Nutrition rows - exact match to live preview
      const nutritionRows = [
        ["Energy", `${formData.nutrition.energy?.kj || 0} kJ / ${formData.nutrition.energy?.kcal || 0} kcal`, `${calculatePerServing(formData.nutrition.energy?.kj || 0)} kJ / ${calculatePerServing(formData.nutrition.energy?.kcal || 0)} kcal`, true],
        ["Fat", `${formData.nutrition.fat || 0} g`, `${calculatePerServing(formData.nutrition.fat || 0)} g`, true],
        ["of which saturates", `${formData.nutrition.saturatedFat || 0} g`, `${calculatePerServing(formData.nutrition.saturatedFat || 0)} g`, false],
        ["Carbohydrates", `${formData.nutrition.carbohydrates || 0} g`, `${calculatePerServing(formData.nutrition.carbohydrates || 0)} g`, true],
        ["of which sugars", `${formData.nutrition.sugars || 0} g`, `${calculatePerServing(formData.nutrition.sugars || 0)} g`, false],
        ["Fibre", `${formData.nutrition.fiber || 0} g`, `${calculatePerServing(formData.nutrition.fiber || 0)} g`, true],
        ["Protein", `${formData.nutrition.protein || 0} g`, `${calculatePerServing(formData.nutrition.protein || 0)} g`, true],
        ["Salt", `${formData.nutrition.salt || 0} g`, `${calculatePerServing(formData.nutrition.salt || 0)} g`, true]
      ];

      nutritionRows.forEach((row, index) => {
        checkPageBreak(rowHeight + 2);
        
        // Alternating row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin + 8, yPosition, pageWidth - 2 * margin - 16, rowHeight, 'F');
        }
        
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(margin + 8, yPosition, pageWidth - 2 * margin - 16, rowHeight);
        
        pdf.setFontSize(8);
        const isBold = row[3] as boolean;
        pdf.setFont("helvetica", isBold ? "bold" : "normal");
        pdf.setTextColor(isBold ? 51 : 100, isBold ? 65 : 116, isBold ? 85 : 139);
        
        const indent = isBold ? 0 : 8;
        pdf.text(row[0] as string, margin + 12 + indent, yPosition + 8);
        pdf.text(row[1] as string, margin + 12 + colWidth, yPosition + 8, { align: 'center' });
        pdf.text(row[2] as string, margin + 12 + 2 * colWidth, yPosition + 8, { align: 'center' });
        
        yPosition += rowHeight;
      });
      
      yPosition += 8;
    });

    // Nutri-Score and Claims side by side - exact match to live preview
    checkPageBreak(50);
    
    const halfWidth = (pageWidth - 2 * margin - 10) / 2;
    
    // Nutri-Score section
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, yPosition, halfWidth, 40, 4, 4, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, yPosition, halfWidth, 40, 4, 4);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text("Nutri-Score Rating", margin + 8, yPosition + 12);
    
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
    
    // Nutri-Score visual representation
    const scoreColors = {
      'A': [26, 135, 84],   // green
      'B': [101, 163, 13],  // light green
      'C': [234, 179, 8],   // yellow
      'D': [249, 115, 22],  // orange
      'E': [220, 38, 38]    // red
    };
    
    const gradeColor = scoreColors[nutriScore.nutriGrade as keyof typeof scoreColors] || [156, 163, 175];
    pdf.setFillColor(gradeColor[0], gradeColor[1], gradeColor[2]);
    pdf.circle(margin + halfWidth/2, yPosition + 24, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(nutriScore.nutriGrade, margin + halfWidth/2, yPosition + 28, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Grade: ${nutriScore.nutriGrade} • Score: ${nutriScore.finalScore}`, margin + 8, yPosition + 35);

    // Claims section
    const rightX = margin + halfWidth + 10;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(rightX, yPosition, halfWidth, 40, 4, 4, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(rightX, yPosition, halfWidth, 40, 4, 4);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text("Possible Declarations", rightX + 8, yPosition + 12);
    
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
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      claimsToShow.slice(0, 3).forEach((claim, index) => {
        pdf.text(`${claim.label}: ${claim.claim}`, rightX + 8, yPosition + 20 + (index * 5));
      });
    } else {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 116, 139);
      pdf.text("No nutritional claims available", rightX + 8, yPosition + 22);
    }

    yPosition += 50;
  }

  // Storage Conditions - exact match to live preview
  if (formData.storageConditions) {
    drawSection("Storage Conditions", () => {
      yPosition += 8;
      
      // Icon simulation
      pdf.setFillColor(59, 130, 246); // blue-500
      pdf.circle(margin + 15, yPosition + 8, 3, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      const storageLines = pdf.splitTextToSize(formData.storageConditions, pageWidth - 2 * margin - 40);
      storageLines.forEach((line: string, index: number) => {
        if (index > 0) checkPageBreak(6);
        pdf.text(line, margin + 25, yPosition + 6 + (index * 6));
      });
      yPosition += storageLines.length * 6 + 8;
    });
  }

  // Allergy Advice - exact red styling from live preview
  const allergyText = formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";
  drawInfoBox("Allergy Advice", allergyText, [248, 113, 113], [254, 242, 242], [153, 27, 27]);

  // Preparation - exact match to live preview
  if (formData.preparation) {
    drawSection("Preparation Instructions", () => {
      yPosition += 8;
      
      // Icon simulation
      pdf.setFillColor(147, 51, 234); // purple-500
      pdf.circle(margin + 15, yPosition + 8, 3, 'F');
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      const prepLines = pdf.splitTextToSize(formData.preparation, pageWidth - 2 * margin - 40);
      prepLines.forEach((line: string, index: number) => {
        if (index > 0) checkPageBreak(6);
        pdf.text(line, margin + 25, yPosition + 6 + (index * 6));
      });
      yPosition += prepLines.length * 6 + 8;
    });
  }

  // Footer - exact match to live preview
  checkPageBreak(25);
  pdf.setFillColor(241, 245, 249); // from-slate-100
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 4, 4, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 4, 4);
  
  // Date icon simulation
  pdf.setFillColor(100, 116, 139);
  pdf.circle(margin + 15, yPosition + 9, 2, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Valid from: ${new Date().toLocaleDateString('en-GB')}`, margin + 25, yPosition + 12);
  
  if (formData.preparedBy || formData.jobTitle) {
    // Person icon simulation
    pdf.setFillColor(100, 116, 139);
    pdf.circle(pageWidth / 2 + 15, yPosition + 9, 2, 'F');
    
    const preparedByText = formData.preparedBy && formData.jobTitle 
      ? `${formData.preparedBy}, ${formData.jobTitle}`
      : formData.preparedBy || formData.jobTitle || "";
    pdf.text(`Prepared by: ${preparedByText}`, pageWidth / 2 + 25, yPosition + 12);
  }

  yPosition += 25;

  // Disclaimer - exact match to live preview
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(100, 116, 139);
  const disclaimerText = "The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.";
  const disclaimerLines = pdf.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
  disclaimerLines.forEach((line: string, index: number) => {
    pdf.text(line, margin, yPosition + (index * 5));
  });

  // Save PDF
  pdf.save(`${formData.productName || 'Product-Information'}.pdf`);
}
