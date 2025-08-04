import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";
import { calculateNutriScore, getNutriScoreImage } from "./nutri-score";
import { calculateClaims } from "./claims-calculator";
import brueggenLogo from "@assets/brueggen-logo.png";

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
    yPosition += 25; // Space after header
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin - 10) {
      addNewPageWithHeader();
      return true;
    }
    return false;
  };

  // Draw header on each page
  const drawHeader = () => {
    // Draw header background
    pdf.setFillColor(248, 250, 252); // bg-slate-50
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 20, 'F');
    pdf.setDrawColor(203, 213, 225); // border-slate-200
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 20);

    // Add logo (simplified as text for now since image loading is complex in jsPDF)
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85); // text-slate-800
    pdf.text("Brüggen", margin + 5, yPosition + 7);

    // Centered title and product number
    const centerX = pageWidth / 2;
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Product Information", centerX, yPosition + 8, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(formData.productNumber || "Recipe Number", centerX, yPosition + 14, { align: 'center' });

    // Page number
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Page ${currentPage}`, pageWidth - margin - 15, yPosition + 10);

    yPosition += 20;
  };

  // Draw section header
  const drawSectionHeader = (title: string) => {
    checkPageBreak(15);
    
    // Draw border
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12);
    
    // Top border line
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, yPosition + 12, pageWidth - margin, yPosition + 12);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text(title, margin + 5, yPosition + 8);
    
    yPosition += 12;
    return yPosition;
  };

  // Draw bordered table
  const drawTable = (headers: string[], rows: string[][], columnWidths: number[]) => {
    const rowHeight = 6;
    const tableHeight = (headers.length > 0 ? rowHeight : 0) + (rows.length * rowHeight);
    
    checkPageBreak(tableHeight + 10);
    
    const startY = yPosition;
    const startX = margin;
    
    // Draw header if provided
    if (headers.length > 0) {
      pdf.setFillColor(248, 250, 252);
      let currentX = startX;
      
      headers.forEach((header, i) => {
        pdf.rect(currentX, startY, columnWidths[i], rowHeight, 'FD');
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(51, 65, 85);
        pdf.text(header, currentX + 2, startY + 4);
        currentX += columnWidths[i];
      });
      
      yPosition += rowHeight;
    }
    
    // Draw rows
    rows.forEach((row, rowIndex) => {
      let currentX = startX;
      row.forEach((cell, i) => {
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(currentX, yPosition, columnWidths[i], rowHeight);
        
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(71, 85, 105);
        
        // Handle text wrapping for long content
        const maxWidth = columnWidths[i] - 4;
        const lines = pdf.splitTextToSize(cell, maxWidth);
        pdf.text(lines[0] || cell, currentX + 2, yPosition + 4);
        
        currentX += columnWidths[i];
      });
      yPosition += rowHeight;
    });
  };

  // Start PDF generation
  drawHeader();
  yPosition += 10;

  // Product Name Section
  checkPageBreak(15);
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 116, 139);
  pdf.text("PRODUCT NAME", pageWidth / 2, yPosition + 4, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(51, 65, 85);
  pdf.text(formData.productName || "Product name will appear here...", pageWidth / 2, yPosition + 9, { align: 'center' });
  
  yPosition += 20;

  // Ingredients Section
  if (formData.ingredients?.length || formData.baseProductIngredients?.length) {
    drawSectionHeader("Ingredients");
    
    checkPageBreak(20);
    
    // Format ingredients text
    let ingredientsText = "";
    if (formData.ingredients?.length) {
      const finalProductIngredients = formData.ingredients
        .filter(ing => ing.name.trim())
        .map(ing => {
          let text = ing.name;
          if (ing.percentage) text += ` (${ing.percentage}%)`;
          return text;
        });
      ingredientsText = finalProductIngredients.join(", ");
    }
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    
    const maxWidth = pageWidth - 2 * margin - 10;
    const lines = pdf.splitTextToSize(ingredientsText, maxWidth);
    
    lines.forEach((line: string, index: number) => {
      if (index > 0) checkPageBreak(5);
      pdf.text(line, margin + 5, yPosition + 4 + (index * 5));
    });
    
    yPosition += Math.max(lines.length * 5, 10) + 5;
    
    // Quality assurance text
    checkPageBreak(15);
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(96, 165, 250);
    const qaHeight = 12;
    pdf.rect(margin, yPosition, 3, qaHeight, 'F');
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, qaHeight, 'D');
    
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 64, 175);
    const qaText = "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.";
    const qaLines = pdf.splitTextToSize(qaText, pageWidth - 2 * margin - 20);
    qaLines.forEach((line: string, index: number) => {
      pdf.text(line, margin + 8, yPosition + 4 + (index * 3));
    });
    
    yPosition += Math.max(qaLines.length * 3 + 2, qaHeight) + 10;
  }

  // Detailed Ingredients Table
  if ((formData.ingredients?.some(ing => ing.name.trim()) || formData.baseProductIngredients?.some(ing => ing.name.trim()))) {
    drawSectionHeader("Detailed Ingredients Breakdown");
    
    // Generate table data
    const tableIngredients: Array<{name: string; percentage: number; origin: string; isFinalProduct: boolean}> = [];
    
    formData.ingredients?.forEach(ing => {
      if (!ing.name.trim()) return;
      
      if (ing.baseProducts?.length) {
        ing.baseProducts.forEach(baseProduct => {
          const baseIngredients = formData.baseProductIngredients?.filter(baseIng => 
            baseIng.baseProductName === baseProduct.name
          ) || [];
          
          baseIngredients.forEach(baseIng => {
            if (!baseIng.name.trim()) return;
            const wholeProductPercentage = ((baseIng.percentage || 0) * (baseProduct.percentage || 0)) / 100;
            tableIngredients.push({
              name: baseIng.name,
              percentage: wholeProductPercentage,
              origin: baseIng.origin || "",
              isFinalProduct: false
            });
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

    if (tableIngredients.length > 0) {
      const headers = ["Ingredients", "Percentage content per whole product", "Country of Origin"];
      const rows = tableIngredients.map(ing => [
        ing.name,
        `${ing.percentage}%`,
        ing.origin || "-"
      ]);
      
      const columnWidths = [70, 70, 40];
      drawTable(headers, rows, columnWidths);
      yPosition += 10;
    }
  }

  // Nutritional Table
  if (formData.nutrition) {
    drawSectionHeader("Average Nutritional Value");
    
    const headers = ["Nutrient", `per 100 g of product`, `per ${servingSize} g of product`];
    const rows = [
      ["Energy", `${formData.nutrition.energy?.kj || 0} kJ / ${formData.nutrition.energy?.kcal || 0} kcal`, `${calculatePerServing(formData.nutrition.energy?.kj || 0)} kJ / ${calculatePerServing(formData.nutrition.energy?.kcal || 0)} kcal`],
      ["Fat", `${formData.nutrition.fat || 0} g`, `${calculatePerServing(formData.nutrition.fat || 0)} g`],
      ["  of which saturates", `${formData.nutrition.saturatedFat || 0} g`, `${calculatePerServing(formData.nutrition.saturatedFat || 0)} g`],
      ["Carbohydrates", `${formData.nutrition.carbohydrates || 0} g`, `${calculatePerServing(formData.nutrition.carbohydrates || 0)} g`],
      ["  of which sugars", `${formData.nutrition.sugars || 0} g`, `${calculatePerServing(formData.nutrition.sugars || 0)} g`],
      ["Fibre", `${formData.nutrition.fiber || 0} g`, `${calculatePerServing(formData.nutrition.fiber || 0)} g`],
      ["Protein", `${formData.nutrition.protein || 0} g`, `${calculatePerServing(formData.nutrition.protein || 0)} g`],
      ["Salt", `${formData.nutrition.salt || 0} g`, `${calculatePerServing(formData.nutrition.salt || 0)} g`]
    ];

    const columnWidths = [60, 60, 60];
    drawTable(headers, rows, columnWidths);
    yPosition += 10;

    // Nutri-Score and Claims side by side
    checkPageBreak(40);
    
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

    // Nutri-Score section (left side)
    const leftWidth = (pageWidth - 2 * margin) / 2 - 5;
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(margin, yPosition, leftWidth, 30);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text("Nutri-Score Rating", margin + 5, yPosition + 8);
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Grade: ${nutriScore.nutriGrade} • Score: ${nutriScore.finalScore}`, margin + 5, yPosition + 20);

    // Claims section (right side)  
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

    const rightX = margin + leftWidth + 10;
    pdf.rect(rightX, yPosition, leftWidth, 30);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Possible Declarations", rightX + 5, yPosition + 8);
    
    if (claimsToShow.length > 0) {
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      claimsToShow.slice(0, 3).forEach((claim, index) => {
        pdf.text(`${claim.label}: ${claim.claim}`, rightX + 5, yPosition + 15 + (index * 4));
      });
    }

    yPosition += 40;
  }

  // Storage Conditions
  if (formData.storageConditions) {
    drawSectionHeader("Storage Conditions");
    
    checkPageBreak(15);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    const storageLines = pdf.splitTextToSize(formData.storageConditions, pageWidth - 2 * margin - 10);
    storageLines.forEach((line: string, index: number) => {
      if (index > 0) checkPageBreak(5);
      pdf.text(line, margin + 5, yPosition + 4 + (index * 5));
    });
    yPosition += storageLines.length * 5 + 10;
  }

  // Allergy Advice
  checkPageBreak(20);
  pdf.setFillColor(254, 242, 242);
  pdf.setDrawColor(248, 113, 113);
  const allergyHeight = 20;
  pdf.rect(margin, yPosition, 3, allergyHeight, 'F');
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, allergyHeight);
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(153, 27, 27);
  pdf.text("Allergy Advice", margin + 8, yPosition + 8);
  
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  const allergyText = formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";
  const allergyLines = pdf.splitTextToSize(allergyText, pageWidth - 2 * margin - 20);
  allergyLines.forEach((line: string, index: number) => {
    pdf.text(line, margin + 8, yPosition + 14 + (index * 3));
  });
  
  yPosition += Math.max(allergyLines.length * 3 + 8, allergyHeight) + 10;

  // Preparation
  if (formData.preparation) {
    drawSectionHeader("Preparation Instructions");
    
    checkPageBreak(15);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105);
    const prepLines = pdf.splitTextToSize(formData.preparation, pageWidth - 2 * margin - 10);
    prepLines.forEach((line: string, index: number) => {
      if (index > 0) checkPageBreak(5);
      pdf.text(line, margin + 5, yPosition + 4 + (index * 5));
    });
    yPosition += prepLines.length * 5 + 10;
  }

  // Footer
  checkPageBreak(15);
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Valid from: ${new Date().toLocaleDateString('en-GB')}`, margin + 5, yPosition + 8);
  
  if (formData.preparedBy || formData.jobTitle) {
    const preparedByText = formData.preparedBy && formData.jobTitle 
      ? `${formData.preparedBy}, ${formData.jobTitle}`
      : formData.preparedBy || formData.jobTitle || "";
    pdf.text(`Prepared by: ${preparedByText}`, pageWidth / 2, yPosition + 8);
  }

  // Save PDF
  pdf.save(`${formData.productName || 'Product-Information'}.pdf`);
}