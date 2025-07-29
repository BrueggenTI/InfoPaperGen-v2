import jsPDF from "jspdf";
import { ProductInfo } from "@shared/schema";

export async function generatePDF(formData: ProductInfo) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  const servingSize = parseFloat(formData.servingSize?.replace(/[^\d.]/g, '') || '40');

  const calculatePerServing = (per100g: number) => {
    return (per100g * servingSize / 100).toFixed(1);
  };

  const formatIngredients = () => {
    if (!formData.ingredients || formData.ingredients.length === 0) {
      return "No ingredients specified";
    }
    
    return formData.ingredients
      .map(ingredient => {
        const percentage = ingredient.percentage ? ` ${ingredient.percentage}%` : '';
        return `${ingredient.name}${percentage}`;
      })
      .join(', ');
  };

  // Title
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Product Information Paper", margin, yPosition);
  yPosition += 15;

  // Product Details Table
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  const addRow = (label: string, value: string, bold: boolean = false) => {
    if (bold) pdf.setFont("helvetica", "bold");
    pdf.text(label, margin, yPosition);
    pdf.setFont("helvetica", "normal");
    
    const splitValue = pdf.splitTextToSize(value, pageWidth - margin * 2 - 60);
    pdf.text(splitValue, margin + 60, yPosition);
    yPosition += Math.max(6, splitValue.length * 5);
  };

  addRow("Product name:", formData.productName || "", true);
  addRow("Ingredients:", formatIngredients());
  
  yPosition += 5;
  pdf.setFontSize(8);
  pdf.text("* percentage in ingredient", margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(9);
  const legalText = "The quality of all raw materials used in the manufacture and the finished product meets the current applicable legal requirements relating to these products. Admissible levels of mycotoxins, heavy metal contamination, pesticides and other - in accordance with applicable legislation.";
  const splitLegalText = pdf.splitTextToSize(legalText, pageWidth - margin * 2);
  pdf.text(splitLegalText, margin, yPosition);
  yPosition += splitLegalText.length * 4 + 10;

  // Nutritional Information
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Average nutritional value:", margin, yPosition);
  pdf.setFont("helvetica", "normal");
  yPosition += 8;

  const addNutrientRow = (nutrient: string, per100g: string, perServing: string) => {
    pdf.text(nutrient, margin + 10, yPosition);
    pdf.text(per100g, margin + 80, yPosition);
    pdf.text(perServing, margin + 120, yPosition);
    yPosition += 6;
  };

  pdf.text("per 100 g of product", margin + 80, yPosition);
  pdf.text(`per ${servingSize} g of product`, margin + 120, yPosition);
  yPosition += 8;

  if (formData.nutrition) {
    addNutrientRow(
      "Energy",
      `${formData.nutrition.energy.kj} kJ / ${formData.nutrition.energy.kcal} kcal`,
      `${calculatePerServing(formData.nutrition.energy.kj)} kJ / ${calculatePerServing(formData.nutrition.energy.kcal)} kcal`
    );
    addNutrientRow("Fat", `${formData.nutrition.fat} g`, `${calculatePerServing(formData.nutrition.fat)} g`);
    addNutrientRow("of which saturates", `${formData.nutrition.saturatedFat} g`, `${calculatePerServing(formData.nutrition.saturatedFat)} g`);
    addNutrientRow("Carbohydrates", `${formData.nutrition.carbohydrates} g`, `${calculatePerServing(formData.nutrition.carbohydrates)} g`);
    addNutrientRow("of which sugars", `${formData.nutrition.sugars} g`, `${calculatePerServing(formData.nutrition.sugars)} g`);
    addNutrientRow("Fibre", `${formData.nutrition.fiber} g`, `${calculatePerServing(formData.nutrition.fiber)} g`);
    addNutrientRow("Protein", `${formData.nutrition.protein} g`, `${calculatePerServing(formData.nutrition.protein)} g`);
    addNutrientRow("Salt", `${formData.nutrition.salt} g`, `${calculatePerServing(formData.nutrition.salt)} g`);
  }

  yPosition += 10;

  // Nutri-score
  if (formData.nutriScore) {
    addRow("Nutri-score:", formData.nutriScore, true);
  }

  // Declarations
  pdf.setFont("helvetica", "bold");
  pdf.text("Possible declarations:", margin, yPosition);
  pdf.setFont("helvetica", "normal");
  yPosition += 6;

  if (formData.declarations) {
    addRow("Source of fibre / High fibre:", formData.declarations.highFiber ? "✓" : "No declaration");
    addRow("Source of protein / High protein:", formData.declarations.highProtein ? "✓" : "No declaration");
    addRow("Content of wholegrain:", formData.declarations.wholegrain ? "✓" : "No declaration");
    addRow("Other:", formData.declarations.other || "No declaration");
  }

  yPosition += 5;

  // Additional Information
  addRow("Preparation:", formData.preparation || "Don't apply", true);
  addRow("Allergy advice:", formData.allergyAdvice || "Product contains allergen ingredients according to ingredient list and will be produced in an environment, where the following allergens are present: cereals containing gluten, milk products, nuts, peanuts, sesame seeds and soya products.", true);
  addRow("Storage conditions:", formData.storageConditions || "12 months in original packaging unit at about 20°C and relative humidity below 60%.", true);

  yPosition += 10;

  // Footer
  const today = new Date().toLocaleDateString('en-GB');
  addRow("Valid from:", today, true);
  if (formData.preparedBy) {
    const preparedByText = formData.jobTitle ? `${formData.preparedBy}\n${formData.jobTitle}` : formData.preparedBy;
    addRow("Prepared by:", preparedByText, true);
  }

  yPosition += 10;

  // Final note
  pdf.setFontSize(8);
  const finalNote = "The purpose of this product information is to describe a sample made in the laboratory. Nutritional values are calculated. Minor variations may occur due to different production conditions during manufacture.";
  const splitFinalNote = pdf.splitTextToSize(finalNote, pageWidth - margin * 2);
  pdf.text(splitFinalNote, margin, yPosition);

  // Save the PDF
  const filename = `${formData.productName || 'Product'}_Information_Paper.pdf`;
  pdf.save(filename);
}
