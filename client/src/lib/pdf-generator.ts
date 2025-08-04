
import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore } from "./nutri-score";
import { calculateClaims } from "./claims-calculator";

export async function generatePDF(formData: ProductInfo) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
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
    yPosition += 30; // Space after header
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin - 10) {
      addNewPageWithHeader();
      return true;
    }
    return false;
  };

  // Draw modern header matching live preview
  const drawHeader = () => {
    // Header background with gradient effect (simulated with light gray)
    pdf.setFillColor(248, 250, 252); // bg-slate-50
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 3, 3, 'F');
    pdf.setDrawColor(203, 213, 225); // border-slate-200
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 3, 3);

    // Logo area (left)
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85); // text-slate-800
    pdf.text("Brüggen", margin + 8, yPosition + 10);

    // Centered title
    const centerX = pageWidth / 2;
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text("Product Information", centerX, yPosition + 12, { align: 'center' });
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text(formData.productNumber || "Recipe Number", centerX, yPosition + 18, { align: 'center' });

    // Page number (right)
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(pageWidth - margin - 25, yPosition + 5, 20, 8, 2, 2, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(pageWidth - margin - 25, yPosition + 5, 20, 8, 2, 2);
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Page ${currentPage}`, pageWidth - margin - 15, yPosition + 10, { align: 'center' });

    yPosition += 25;
  };

  // Draw section with rounded border like live preview
  const drawSection = (title: string, content: () => void, bgColor = [255, 255, 255]) => {
    const startY = yPosition;
    
    // Section header
    pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 12, 2, 2, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 12, 2, 2);
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text(title, margin + 8, yPosition + 8);
    
    yPosition += 12;
    
    // Section content area
    const contentStartY = yPosition;
    content();
    
    // Draw border around entire section
    const sectionHeight = yPosition - startY;
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin, startY, pageWidth - 2 * margin, sectionHeight, 2, 2);
    
    yPosition += 5; // Space after section
  };

  // Draw info box (like allergy advice)
  const drawInfoBox = (title: string, content: string, borderColor = [248, 113, 113], bgColor = [254, 242, 242]) => {
    checkPageBreak(25);
    
    const lines = pdf.splitTextToSize(content, pageWidth - 2 * margin - 16);
    const boxHeight = Math.max(20, lines.length * 4 + 12);
    
    // Background
    pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, boxHeight, 2, 2, 'F');
    
    // Left border accent
    pdf.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.rect(margin, yPosition, 4, boxHeight, 'F');
    
    // Border
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, boxHeight, 2, 2);
    
    // Title
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(153, 27, 27);
    pdf.text(title, margin + 12, yPosition + 8);
    
    // Content
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(153, 27, 27);
    
    lines.forEach((line: string, index: number) => {
      pdf.text(line, margin + 12, yPosition + 14 + (index * 4));
    });
    
    yPosition += boxHeight + 8;
  };

  // Start PDF generation
  drawHeader();
  yPosition += 8;

  // Product Name Section (matching live preview style)
  checkPageBreak(20);
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 2, 2, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 2, 2);
  
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 116, 139);
  pdf.text("PRODUCT NAME", pageWidth / 2, yPosition + 6, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(217, 119, 6); // amber-600 color simulation
  pdf.text(formData.productName || "Product name will appear here...", pageWidth / 2, yPosition + 13, { align: 'center' });
  
  yPosition += 25;

  // Ingredients Section
  if (formData.ingredients?.length || formData.baseProductIngredients?.length) {
    drawSection("Ingredients", () => {
      yPosition += 5;
      
      // Format ingredients text (matching live preview logic)
      const finalIngredients = formData.ingredients || [];
      const baseIngredients = formData.baseProductIngredients || [];
      
      let ingredientsText = "";
      if (finalIngredients.length > 0 || baseIngredients.length > 0) {
        const finalFormatted = finalIngredients
          .filter(ingredient => ingredient.name.trim() !== "")
          .map(ingredient => {
            const percentage = ingredient.percentage ? ` (${ingredient.percentage}%)` : '';
            let ingredientText = `${ingredient.name}${percentage}`;
            
            // Check if this ingredient is marked as base recipe
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
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      
      const maxWidth = pageWidth - 2 * margin - 16;
      const lines = pdf.splitTextToSize(ingredientsText, maxWidth);
      
      lines.forEach((line: string, index: number) => {
        if (index > 0) checkPageBreak(5);
        pdf.text(line, margin + 8, yPosition + 4 + (index * 5));
      });
      
      yPosition += Math.max(lines.length * 5, 10) + 5;
      
      // Percentage note
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 116, 139);
      pdf.text("* percentage in ingredient", margin + 8, yPosition);
      yPosition += 8;
    });

    // Quality assurance info box
    drawInfoBox("Quality Assurance", 
      "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.",
      [96, 165, 250], [239, 246, 255]);
  }

  // Detailed Ingredients Table (if ingredients exist)
  if ((formData.ingredients?.some(ing => ing.name.trim()) || formData.baseProductIngredients?.some(ing => ing.name.trim()))) {
    // Generate table data (matching live preview logic)
    const generateIngredientsTable = (): Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> => {
      const finalIngredients = formData.ingredients || [];
      const baseIngredients = formData.baseProductIngredients || [];
      const tableIngredients: Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> = [];

      // Get marked ingredient percentage
      const markedIngredient = finalIngredients.find(ing => ing.isMarkedAsBase);
      const markedIngredientPercentage = markedIngredient?.percentage || 0;

      // Add final product ingredients
      finalIngredients
        .filter(ing => ing.name.trim())
        .forEach(ing => {
          if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
            // First add the marked ingredient itself
            tableIngredients.push({
              name: ing.name,
              percentage: ing.percentage || 0,
              origin: ing.origin || "",
              isFinalProduct: true
            });
            
            // Then add base product ingredients with recalculated percentages
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
            // Add regular final product ingredient
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
        yPosition += 5;
        
        // Table header
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 8, 'F');
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 8);
        
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(71, 85, 105);
        
        const col1Width = 80;
        const col2Width = 60;
        const col3Width = 40;
        
        pdf.text("Ingredients", margin + 8, yPosition + 5);
        pdf.text("Percentage content per whole product", margin + 8 + col1Width, yPosition + 5);
        pdf.text("Country of Origin", margin + 8 + col1Width + col2Width, yPosition + 5);
        
        yPosition += 8;
        
        // Table rows
        tableIngredients.forEach((ingredient, index) => {
          checkPageBreak(6);
          
          if (index % 2 === 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 6, 'F');
          }
          
          pdf.setDrawColor(203, 213, 225);
          pdf.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 6);
          
          pdf.setFontSize(7);
          pdf.setFont("helvetica", ingredient.isFinalProduct ? "bold" : "normal");
          pdf.setTextColor(ingredient.isFinalProduct ? 51 : 100, ingredient.isFinalProduct ? 65 : 116, ingredient.isFinalProduct ? 85 : 139);
          
          pdf.text(ingredient.name, margin + 8, yPosition + 4);
          pdf.text(`${ingredient.percentage}%`, margin + 8 + col1Width, yPosition + 4);
          pdf.text(ingredient.origin || "-", margin + 8 + col1Width + col2Width, yPosition + 4);
          
          yPosition += 6;
        });
        
        yPosition += 5;
      });
    }
  }

  // Page break for nutrition section
  if (formData.nutrition) {
    if (yPosition > pageHeight / 2) {
      addNewPageWithHeader();
    }
  }

  // Nutritional Table
  if (formData.nutrition) {
    drawSection("Average Nutritional Value", () => {
      yPosition += 5;
      
      // Table header
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 8, 'F');
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 8);
      
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(71, 85, 105);
      
      const colWidth = (pageWidth - 2 * margin - 10) / 3;
      
      pdf.text("Nutrient", margin + 8, yPosition + 5);
      pdf.text("per 100 g of product", margin + 8 + colWidth, yPosition + 5, { align: 'center' });
      pdf.text(`per ${servingSize} g of product`, margin + 8 + 2 * colWidth, yPosition + 5, { align: 'center' });
      
      yPosition += 8;
      
      // Nutrition rows
      const nutritionRows = [
        ["Energy", `${formData.nutrition.energy?.kj || 0} kJ / ${formData.nutrition.energy?.kcal || 0} kcal`, `${calculatePerServing(formData.nutrition.energy?.kj || 0)} kJ / ${calculatePerServing(formData.nutrition.energy?.kcal || 0)} kcal`],
        ["Fat", `${formData.nutrition.fat || 0} g`, `${calculatePerServing(formData.nutrition.fat || 0)} g`],
        ["  of which saturates", `${formData.nutrition.saturatedFat || 0} g`, `${calculatePerServing(formData.nutrition.saturatedFat || 0)} g`],
        ["Carbohydrates", `${formData.nutrition.carbohydrates || 0} g`, `${calculatePerServing(formData.nutrition.carbohydrates || 0)} g`],
        ["  of which sugars", `${formData.nutrition.sugars || 0} g`, `${calculatePerServing(formData.nutrition.sugars || 0)} g`],
        ["Fibre", `${formData.nutrition.fiber || 0} g`, `${calculatePerServing(formData.nutrition.fiber || 0)} g`],
        ["Protein", `${formData.nutrition.protein || 0} g`, `${calculatePerServing(formData.nutrition.protein || 0)} g`],
        ["Salt", `${formData.nutrition.salt || 0} g`, `${calculatePerServing(formData.nutrition.salt || 0)} g`]
      ];

      nutritionRows.forEach((row, index) => {
        checkPageBreak(6);
        
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 6, 'F');
        }
        
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(margin + 5, yPosition, pageWidth - 2 * margin - 10, 6);
        
        pdf.setFontSize(7);
        pdf.setFont("helvetica", row[0].startsWith("  ") ? "normal" : "bold");
        pdf.setTextColor(row[0].startsWith("  ") ? 100 : 51, row[0].startsWith("  ") ? 116 : 65, row[0].startsWith("  ") ? 139 : 85);
        
        pdf.text(row[0], margin + 8, yPosition + 4);
        pdf.text(row[1], margin + 8 + colWidth, yPosition + 4, { align: 'center' });
        pdf.text(row[2], margin + 8 + 2 * colWidth, yPosition + 4, { align: 'center' });
        
        yPosition += 6;
      });
      
      yPosition += 5;
    });

    // Nutri-Score and Claims side by side
    checkPageBreak(45);
    
    const leftWidth = (pageWidth - 2 * margin - 10) / 2;
    
    // Nutri-Score section
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, yPosition, leftWidth, 35, 2, 2, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(margin, yPosition, leftWidth, 35, 2, 2);
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text("Nutri-Score Rating", margin + 5, yPosition + 8);
    
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
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Grade: ${nutriScore.nutriGrade} • Score: ${nutriScore.finalScore}`, margin + 5, yPosition + 20);

    // Claims section
    const rightX = margin + leftWidth + 10;
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(rightX, yPosition, leftWidth, 35, 2, 2, 'F');
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(rightX, yPosition, leftWidth, 35, 2, 2);
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text("Possible Declarations", rightX + 5, yPosition + 8);
    
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
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      claimsToShow.slice(0, 4).forEach((claim, index) => {
        pdf.text(`${claim.label}: ${claim.claim}`, rightX + 5, yPosition + 15 + (index * 4));
      });
    } else {
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 116, 139);
      pdf.text("No nutritional claims available", rightX + 5, yPosition + 18);
    }

    yPosition += 45;
  }

  // Storage Conditions
  if (formData.storageConditions) {
    drawSection("Storage Conditions", () => {
      yPosition += 5;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      const storageLines = pdf.splitTextToSize(formData.storageConditions, pageWidth - 2 * margin - 16);
      storageLines.forEach((line: string, index: number) => {
        if (index > 0) checkPageBreak(5);
        pdf.text(line, margin + 8, yPosition + 4 + (index * 5));
      });
      yPosition += storageLines.length * 5 + 5;
    });
  }

  // Allergy Advice
  const allergyText = formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";
  drawInfoBox("Allergy Advice", allergyText);

  // Preparation
  if (formData.preparation) {
    drawSection("Preparation Instructions", () => {
      yPosition += 5;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      const prepLines = pdf.splitTextToSize(formData.preparation, pageWidth - 2 * margin - 16);
      prepLines.forEach((line: string, index: number) => {
        if (index > 0) checkPageBreak(5);
        pdf.text(line, margin + 8, yPosition + 4 + (index * 5));
      });
      yPosition += prepLines.length * 5 + 5;
    });
  }

  // Footer
  checkPageBreak(20);
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 15, 2, 2, 'F');
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 15, 2, 2);
  
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Valid from: ${new Date().toLocaleDateString('en-GB')}`, margin + 8, yPosition + 8);
  
  if (formData.preparedBy || formData.jobTitle) {
    const preparedByText = formData.preparedBy && formData.jobTitle 
      ? `${formData.preparedBy}, ${formData.jobTitle}`
      : formData.preparedBy || formData.jobTitle || "";
    pdf.text(`Prepared by: ${preparedByText}`, pageWidth / 2, yPosition + 8);
  }

  yPosition += 20;

  // Disclaimer
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(100, 116, 139);
  const disclaimerText = "The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.";
  const disclaimerLines = pdf.splitTextToSize(disclaimerText, pageWidth - 2 * margin - 10);
  disclaimerLines.forEach((line: string, index: number) => {
    pdf.text(line, margin + 5, yPosition + (index * 4));
  });

  // Save PDF
  pdf.save(`${formData.productName || 'Product-Information'}.pdf`);
}
