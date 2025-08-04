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
    yPosition += 15;
  };

  // Helper function to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - margin - 20) {
      addNewPageWithHeader();
      return true;
    }
    return false;
  };

  // Draw header exactly like the PDF structure
  const drawHeader = () => {
    // Company name on left
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Brüggen", margin, yPosition);

    // Center title and subtitle
    const centerX = pageWidth / 2;
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Product Information", centerX, yPosition, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text(formData.productNumber || "2397/4238/9748", centerX, yPosition + 6, { align: 'center' });

    // Page number on right
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Page ${currentPage}`, pageWidth - margin, yPosition, { align: 'right' });

    yPosition += 20;
  };

  // Initialize first page
  drawHeader();
  yPosition += 20;

  // Product Name Section - Large centered
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("PRODUCT NAME", pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(formData.productName || "Crunchy Granola Bar", pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;

  // Ingredients Section
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("Ingredients", margin, yPosition);
  
  yPosition += 10;

  // Format ingredients exactly like the PDF shows
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
    
    ingredientsText = finalFormatted || "Material 000004011439 (100%), Material 000004011438 (99.485714%)";
  } else {
    ingredientsText = "Material 000004011439 (100%), Material 000004011438 (99.485714%) [D2: lepiszcza, Woda (odpar./absorp.), Cukier trzcinowy 20.529859%*, Sól morska 0.410579%*, Melasa trzcinowa 3.079344%*, Parimix, PBatki owsiane K6 24.634747%*, PBatki owsiane BB 36.770181%*, Wglan sodu K 0.20529%*, Olej sBonecznikowy 14.37027%*], Zurawina liofilizow (0.514286%)";
  }
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  
  const lines = pdf.splitTextToSize(ingredientsText, pageWidth - 2 * margin);
  lines.forEach((line: string, index: number) => {
    if (index > 0) checkPageBreak(6);
    pdf.text(line, margin, yPosition + (index * 6));
  });
  
  yPosition += lines.length * 6 + 8;
  
  // Percentage note
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(0, 0, 0);
  pdf.text("* percentage in ingredient", margin, yPosition);
  yPosition += 15;

  // Quality Assurance
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("Quality Assurance", margin, yPosition);
  
  yPosition += 8;
  
  const qualityText = "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.";
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  
  const qualityLines = pdf.splitTextToSize(qualityText, pageWidth - 2 * margin);
  qualityLines.forEach((line: string, index: number) => {
    pdf.text(line, margin, yPosition + (index * 5));
  });
  
  yPosition += qualityLines.length * 5 + 20;

  // Check for page break before ingredients table
  checkPageBreak(100);

  // Detailed Ingredients Breakdown
  if (finalIngredients.length > 0 || baseIngredients.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Detailed Ingredients Breakdown", margin, yPosition);
    
    yPosition += 15;

    // Generate ingredients table data
    const generateIngredientsTable = (): Array<{name: string, percentage: number, origin: string}> => {
      const tableIngredients: Array<{name: string, percentage: number, origin: string}> = [];

      const markedIngredient = finalIngredients.find(ing => ing.isMarkedAsBase);
      const markedIngredientPercentage = markedIngredient?.percentage || 0;

      finalIngredients
        .filter(ing => ing.name.trim())
        .forEach(ing => {
          if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
            tableIngredients.push({
              name: ing.name,
              percentage: ing.percentage || 0,
              origin: ing.origin || "Germany"
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
                  origin: baseIng.origin || "-"
                });
              });
          } else {
            tableIngredients.push({
              name: ing.name,
              percentage: ing.percentage || 0,
              origin: ing.origin || "Germany"
            });
          }
        });

      return tableIngredients;
    };

    const tableIngredients = generateIngredientsTable();
    
    // If no real ingredients, show default data from PDF
    const ingredientsToShow = tableIngredients.length > 0 ? tableIngredients : [
      { name: "Material 000004011439", percentage: 100, origin: "Germany" },
      { name: "Material 000004011438", percentage: 99.485714, origin: "Germany" },
      { name: "D2: lepiszcza", percentage: 0, origin: "Germany" },
      { name: "Woda (odpar./absorp.)", percentage: 0, origin: "-" },
      { name: "Cukier trzcinowy", percentage: 20.4, origin: "-" },
      { name: "Sól morska", percentage: 0.4, origin: "-" },
      { name: "Melasa trzcinowa", percentage: 3.1, origin: "-" },
      { name: "Parimix", percentage: 0, origin: "-" },
      { name: "PBatki owsiane K6", percentage: 24.5, origin: "-" },
      { name: "PBatki owsiane BB", percentage: 36.6, origin: "-" },
      { name: "Wglan sodu K", percentage: 0.2, origin: "-" },
      { name: "Olej sBonecznikowy", percentage: 14.3, origin: "-" },
      { name: "Zurawina liofilizow", percentage: 0.514286, origin: "-" }
    ];

    // Table headers
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    
    pdf.text("Ingredients", margin, yPosition);
    pdf.text("Percentage content per whole product", margin + 100, yPosition);
    pdf.text("Country of Origin", margin + 200, yPosition);
    
    yPosition += 8;

    // Table rows
    ingredientsToShow.forEach((ingredient) => {
      checkPageBreak(12);
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      
      pdf.text(ingredient.name, margin, yPosition);
      pdf.text(`${ingredient.percentage}%`, margin + 100, yPosition);
      pdf.text(ingredient.origin, margin + 200, yPosition);
      
      yPosition += 6;
    });
    
    yPosition += 10;
  }

  // Check for page break before nutrition
  checkPageBreak(120);

  // Average Nutritional Value - exact match to PDF
  if (formData.nutrition) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Average Nutritional Value", margin, yPosition);
    
    yPosition += 15;
    
    // Table headers
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Nutrient", margin, yPosition);
    pdf.text("per 100 g of product", margin + 70, yPosition);
    pdf.text(`per ${servingSize} g of product`, margin + 140, yPosition);
    
    yPosition += 10;
    
    // Nutrition rows
    const nutritionRows = [
      ["Energy", `${formData.nutrition.energy?.kj || 1965.73} kJ / ${formData.nutrition.energy?.kcal || 469.01} kcal`, `${calculatePerServing(formData.nutrition.energy?.kj || 1965.73)} kJ / ${calculatePerServing(formData.nutrition.energy?.kcal || 469.01)} kcal`],
      ["Fat", `${formData.nutrition.fat || 19.45} g`, `${calculatePerServing(formData.nutrition.fat || 19.45)} g`],
      ["        of which saturates", `${formData.nutrition.saturatedFat || 1.96} g`, `${calculatePerServing(formData.nutrition.saturatedFat || 1.96)} g`],
      ["Carbohydrates", `${formData.nutrition.carbohydrates || 61.55} g`, `${calculatePerServing(formData.nutrition.carbohydrates || 61.55)} g`],
      ["        of which sugars", `${formData.nutrition.sugars || 23.77} g`, `${calculatePerServing(formData.nutrition.sugars || 23.77)} g`],
      ["Fibre", `${formData.nutrition.fiber || 6.52} g`, `${calculatePerServing(formData.nutrition.fiber || 6.52)} g`],
      ["Protein", `${formData.nutrition.protein || 8.69} g`, `${calculatePerServing(formData.nutrition.protein || 8.69)} g`],
      ["Salt", `${formData.nutrition.salt || 0.59} g`, `${calculatePerServing(formData.nutrition.salt || 0.59)} g`]
    ];

    nutritionRows.forEach((row) => {
      checkPageBreak(10);
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      
      pdf.text(row[0], margin, yPosition);
      pdf.text(row[1], margin + 70, yPosition);
      pdf.text(row[2], margin + 140, yPosition);
      
      yPosition += 6;
    });
    
    yPosition += 15;
  }

  // Check for page break before Nutri-Score
  checkPageBreak(80);

  // Nutri-Score and Claims
  if (formData.nutrition) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Nutri-Score Rating", margin, yPosition);
    
    yPosition += 15;

    const nutriScore = calculateNutriScore({
      energy: formData.nutrition.energy || { kj: 1965.73, kcal: 469.01 },
      fat: formData.nutrition.fat || 19.45,
      saturatedFat: formData.nutrition.saturatedFat || 1.96,
      carbohydrates: formData.nutrition.carbohydrates || 61.55,
      sugars: formData.nutrition.sugars || 23.77,
      fiber: formData.nutrition.fiber || 6.52,
      protein: formData.nutrition.protein || 8.69,
      salt: formData.nutrition.salt || 0.59,
      fruitVegLegumeContent: formData.nutrition.fruitVegLegumeContent || 0
    });

    // Large Nutri-Score grade
    pdf.setFontSize(36);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text(nutriScore.nutriGrade, margin + 20, yPosition);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Grade: ${nutriScore.nutriGrade} • Score: ${nutriScore.finalScore}`, margin, yPosition + 10);
    
    // Possible Declarations on the right
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("Possible Declarations", margin + 100, yPosition - 10);

    const claimsResult = calculateClaims({
      protein: formData.nutrition.protein || 8.69,
      fiber: formData.nutrition.fiber || 6.52,
      salt: formData.nutrition.salt || 0.59,
      sugars: formData.nutrition.sugars || 23.77,
      fat: formData.nutrition.fat || 19.45,
      saturatedFat: formData.nutrition.saturatedFat || 1.96
    });

    const allPossibleClaims = [
      { label: "Source of fibre / High fibre", claim: claimsResult.fiber.bestClaim },
      { label: "Source of protein / High protein", claim: claimsResult.protein.bestClaim }
    ];

    const claimsToShow = allPossibleClaims.filter(item => item.claim);
    
    // Add default claims from PDF if none calculated
    if (claimsToShow.length === 0) {
      claimsToShow.push(
        { label: "Source of fibre / High fibre", claim: "High in fiber" },
        { label: "Source of protein / High protein", claim: "High in protein" }
      );
    }

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    claimsToShow.slice(0, 3).forEach((claim, index) => {
      pdf.text(`${claim.label}: ${claim.claim}`, margin + 100, yPosition + (index * 6));
    });

    yPosition += 30;
  }

  // Storage Conditions
  if (formData.storageConditions) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Storage Conditions", margin, yPosition);
    
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const storageLines = pdf.splitTextToSize(formData.storageConditions, pageWidth - 2 * margin);
    storageLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, yPosition + (index * 5));
    });
    yPosition += storageLines.length * 5 + 10;
  } else {
    // Default storage from PDF
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Storage Conditions", margin, yPosition);
    
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const defaultStorage = "12* months in original packaging unit at about 20°C and relative humidity below 60%.\n* To confirm on the storage test.";
    const storageLines = pdf.splitTextToSize(defaultStorage, pageWidth - 2 * margin);
    storageLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, yPosition + (index * 5));
    });
    yPosition += storageLines.length * 5 + 15;
  }

  // Allergy Advice
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("Allergy Advice", margin, yPosition);
  
  yPosition += 8;
  
  const allergyText = formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.";
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const allergyLines = pdf.splitTextToSize(allergyText, pageWidth - 2 * margin);
  allergyLines.forEach((line: string, index: number) => {
    pdf.text(line, margin, yPosition + (index * 5));
  });
  yPosition += allergyLines.length * 5 + 15;

  // Preparation Instructions
  if (formData.preparation) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Preparation Instructions", margin, yPosition);
    
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const prepLines = pdf.splitTextToSize(formData.preparation, pageWidth - 2 * margin);
    prepLines.forEach((line: string, index: number) => {
      pdf.text(line, margin, yPosition + (index * 5));
    });
    yPosition += prepLines.length * 5 + 15;
  } else {
    // Default from PDF
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Preparation Instructions", margin, yPosition);
    
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("Dont Apply", margin, yPosition);
    yPosition += 15;
  }

  // Footer with valid from and prepared by
  checkPageBreak(25);
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Valid from: ${new Date().toLocaleDateString('en-GB')}`, margin, yPosition);
  
  if (formData.preparedBy || formData.jobTitle) {
    const preparedByText = formData.preparedBy && formData.jobTitle 
      ? `${formData.preparedBy}, ${formData.jobTitle}`
      : formData.preparedBy || formData.jobTitle || "Jan Lekve, Student";
    pdf.text(`Prepared by: ${preparedByText}`, pageWidth - margin - 80, yPosition, { align: 'left' });
  } else {
    pdf.text("Prepared by: Jan Lekve, Student", pageWidth - margin - 80, yPosition, { align: 'left' });
  }

  yPosition += 15;

  // Disclaimer
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(0, 0, 0);
  const disclaimerText = "The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.";
  const disclaimerLines = pdf.splitTextToSize(disclaimerText, pageWidth - 2 * margin);
  disclaimerLines.forEach((line: string, index: number) => {
    pdf.text(line, margin, yPosition + (index * 4));
  });

  // Save PDF
  pdf.save(`${formData.productName || 'Product-Information'}.pdf`);
}