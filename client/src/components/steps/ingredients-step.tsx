import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload, Camera } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Ingredient {
  name: string;
  percentage?: number;
  origin?: string;
}

interface IngredientsStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

export default function IngredientsStep({
  formData,
  onUpdate,
  onNext,
  onPrev,
  isLoading = false,
}: IngredientsStepProps) {
  const [finalProductIngredients, setFinalProductIngredients] = useState<Ingredient[]>(
    formData.ingredients || [{ name: "", percentage: undefined, origin: "" }]
  );
  const [baseProductIngredients, setBaseProductIngredients] = useState<Ingredient[]>(
    formData.baseProductIngredients || [{ name: "", percentage: undefined, origin: "" }]
  );
  
  // Text versions for manual editing after AI extraction
  const [finalRecipeText, setFinalRecipeText] = useState<string>("");
  const [baseRecipeText, setBaseRecipeText] = useState<string>("");
  
  // Upload refs
  const finalRecipeInputRef = useRef<HTMLInputElement>(null);
  const baseRecipeInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Calculate percentage from base product to whole product
  const calculateWholeProductPercentage = (basePercentage: number, baseProductPercentage: number) => {
    return +(basePercentage * (baseProductPercentage / 100)).toFixed(1);
  };

  // Extract base product percentage from final ingredients
  const getBaseProductPercentage = () => {
    const baseProductItem = finalProductIngredients.find(ing => 
      ing.name.toLowerCase().includes('granola') || ing.name.toLowerCase().includes('base')
    );
    return baseProductItem?.percentage || 90.7; // Default from example
  };

  // AI extraction mutation
  const extractIngredientsMutation = useMutation({
    mutationFn: async ({ image, isBaseProduct }: { image: string, isBaseProduct: boolean }) => {
      const res = await apiRequest("POST", "/api/extract-ingredients", {
        image,
        isBaseProduct,
      });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      if (variables.isBaseProduct) {
        setBaseProductIngredients(data.ingredients || []);
        onUpdate({ baseProductIngredients: data.ingredients || [] });
        // Update text representation
        const text = data.ingredients.map((ing: Ingredient) => 
          `${ing.name}${ing.percentage ? ` ${ing.percentage}%` : ''}`
        ).join(', ');
        setBaseRecipeText(text);
      } else {
        setFinalProductIngredients(data.ingredients || []);
        onUpdate({ ingredients: data.ingredients || [] });
        // Update text representation  
        const text = data.ingredients.map((ing: Ingredient) => 
          `${ing.name}${ing.percentage ? ` ${ing.percentage}%` : ''}`
        ).join(', ');
        setFinalRecipeText(text);
      }
      toast({
        title: "Erfolgreich extrahiert",
        description: `${variables.isBaseProduct ? 'Base Recipe' : 'Final Recipe'} Zutaten wurden erfolgreich extrahiert.`,
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Fehler beim Extrahieren der Zutaten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, isBaseProduct: boolean) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Bitte wählen Sie eine Datei unter 10MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1];
      extractIngredientsMutation.mutate({ 
        image: base64Data, 
        isBaseProduct 
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFinalRecipeTextChange = (text: string) => {
    setFinalRecipeText(text);
    // Parse text back to ingredients array
    const ingredients = text.split(',').map(item => {
      const trimmed = item.trim();
      const percentageMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
      const name = trimmed.replace(/\s*\d+(?:\.\d+)?%\s*/, '').trim();
      return {
        name,
        percentage: percentageMatch ? parseFloat(percentageMatch[1]) : undefined,
        origin: ""
      };
    }).filter(ing => ing.name);
    
    setFinalProductIngredients(ingredients);
    onUpdate({ ingredients });
  };

  const handleBaseRecipeTextChange = (text: string) => {
    setBaseRecipeText(text);
    // Parse text back to ingredients array
    const ingredients = text.split(',').map(item => {
      const trimmed = item.trim();
      const percentageMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
      const name = trimmed.replace(/\s*\d+(?:\.\d+)?%\s*/, '').trim();
      return {
        name,
        percentage: percentageMatch ? parseFloat(percentageMatch[1]) : undefined,
        origin: ""
      };
    }).filter(ing => ing.name);
    
    setBaseProductIngredients(ingredients);
    onUpdate({ baseProductIngredients: ingredients });
  };

  const formatCombinedIngredients = () => {
    const baseProductPercentage = getBaseProductPercentage();
    const baseFormatted = baseProductIngredients
      .filter(ing => ing.name.trim())
      .map(ing => {
        const percentage = ing.percentage ? ` ${ing.percentage}%*` : '';
        return `${ing.name}${percentage}`;
      })
      .join(', ');

    const finalFormatted = finalProductIngredients
      .filter(ing => ing.name.trim())
      .map(ing => {
        const percentage = ing.percentage ? ` ${ing.percentage}%` : '';
        if (ing.name.toLowerCase().includes('granola') || ing.name.toLowerCase().includes('base')) {
          return `${ing.name}${percentage} [${baseFormatted}]`;
        }
        return `${ing.name}${percentage}`;
      })
      .join(', ');

    return finalFormatted;
  };

  const generateIngredientsTable = (): Array<{name: string, percentage: number, origin: string}> => {
    const baseProductPercentage = getBaseProductPercentage();
    const tableIngredients: Array<{name: string, percentage: number, origin: string}> = [];

    // Add final product ingredients (excluding base product)
    finalProductIngredients
      .filter(ing => ing.name.trim() && !ing.name.toLowerCase().includes('granola') && !ing.name.toLowerCase().includes('base'))
      .forEach(ing => {
        tableIngredients.push({
          name: ing.name,
          percentage: ing.percentage || 0,
          origin: ing.origin || ""
        });
      });

    // Add base product ingredients with recalculated percentages
    baseProductIngredients
      .filter(ing => ing.name.trim())
      .forEach(ing => {
        const wholeProductPercentage = ing.percentage 
          ? calculateWholeProductPercentage(ing.percentage, baseProductPercentage)
          : 0;
        tableIngredients.push({
          name: ing.name,
          percentage: wholeProductPercentage,
          origin: ing.origin || ""
        });
      });

    return tableIngredients;
  };

  const handleNext = () => {
    onUpdate({
      ingredients: finalProductIngredients,
      baseProductIngredients: baseProductIngredients,
    });
    onNext();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Zutaten</h2>
        <p className="text-slate-600">
          Laden Sie Bilder von Ihrem Final Recipe und Base Recipe hoch, um die Zutaten automatisch zu extrahieren.
        </p>
      </div>

      {/* Final Recipe Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Final Recipe Upload</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <input
              ref={finalRecipeInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, false)}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-2">
              Klicken Sie hier, um ein Bild des Final Recipe hochzuladen
            </p>
            <Button
              variant="outline"
              onClick={() => finalRecipeInputRef.current?.click()}
              disabled={extractIngredientsMutation.isPending}
            >
              {extractIngredientsMutation.isPending ? "Extrahiere..." : "Final Recipe hochladen"}
            </Button>
          </div>

          {finalRecipeText && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Extrahierte Final Recipe Zutaten (bearbeitbar):</label>
              <Textarea
                value={finalRecipeText}
                onChange={(e) => handleFinalRecipeTextChange(e.target.value)}
                placeholder="Granola 90,7%, Coconut chips 5%, pineapple chips 4,3%"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Base Recipe Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="w-5 h-5" />
            <span>Base Recipe Upload</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <input
              ref={baseRecipeInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, true)}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-2">
              Klicken Sie hier, um ein Bild des Base Recipe hochzuladen
            </p>
            <Button
              variant="outline"
              onClick={() => baseRecipeInputRef.current?.click()}
              disabled={extractIngredientsMutation.isPending}
            >
              {extractIngredientsMutation.isPending ? "Extrahiere..." : "Base Recipe hochladen"}
            </Button>
          </div>

          {baseRecipeText && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Extrahierte Base Recipe Zutaten (bearbeitbar):</label>
              <Textarea
                value={baseRecipeText}
                onChange={(e) => handleBaseRecipeTextChange(e.target.value)}
                placeholder="whole grain oat flakes 23,0%*, high-fiber oat bran 20,0%*, corn fiber 17,5%*..."
                rows={4}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined Ingredients Preview */}
      {(finalProductIngredients.some(ing => ing.name.trim()) || baseProductIngredients.some(ing => ing.name.trim())) && (
        <Card>
          <CardHeader>
            <CardTitle>Kombinierte Zutaten Vorschau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-700">
                <strong>Ingredients:</strong> {formatCombinedIngredients()}
              </p>
              <p className="text-xs text-slate-500 mt-2">* percentage in ingredient</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredients Table */}
      {(finalProductIngredients.some(ing => ing.name.trim()) || baseProductIngredients.some(ing => ing.name.trim())) && (
        <Card>
          <CardHeader>
            <CardTitle>Zutaten Tabelle</CardTitle>
            <p className="text-sm text-slate-600">
              Base Product Prozentanteile werden automatisch auf das Gesamtprodukt umgerechnet.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 text-left">Ingredients</th>
                    <th className="border border-slate-300 p-2 text-left">Percentage content per whole product</th>
                    <th className="border border-slate-300 p-2 text-left">Country of Origin</th>
                  </tr>
                </thead>
                <tbody>
                  {generateIngredientsTable().map((ingredient, index) => (
                    <tr key={index}>
                      <td className="border border-slate-300 p-2">{ingredient.name}</td>
                      <td className="border border-slate-300 p-2">{ingredient.percentage}%</td>
                      <td className="border border-slate-300 p-2">
                        <Input
                          value={ingredient.origin}
                          onChange={(e) => {
                            // Update origin in the appropriate ingredients array
                            // This is a simplified version - you might want to implement proper origin tracking
                          }}
                          placeholder="Land eingeben"
                          className="border-0 p-0 h-auto"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isLoading}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <Button onClick={handleNext} disabled={isLoading}>
          Weiter
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}