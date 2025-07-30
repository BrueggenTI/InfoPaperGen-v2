import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload, Camera, Tag } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Ingredient {
  name: string;
  percentage?: number;
  origin?: string;
  isMarkedAsBase?: boolean;
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
    formData.ingredients || [{ name: "", percentage: undefined, origin: "", isMarkedAsBase: false }]
  );
  const [baseProductIngredients, setBaseProductIngredients] = useState<Ingredient[]>(
    formData.baseProductIngredients || [{ name: "", percentage: undefined, origin: "", isMarkedAsBase: false }]
  );
  
  // Text versions for manual editing after AI extraction
  const [finalRecipeText, setFinalRecipeText] = useState<string>("");
  const [baseRecipeText, setBaseRecipeText] = useState<string>("");
  
  // Track which final ingredient is marked as base recipe
  const [markedIngredient, setMarkedIngredient] = useState<string | null>(null);
  
  // Upload refs
  const finalRecipeInputRef = useRef<HTMLInputElement>(null);
  const baseRecipeInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Calculate percentage from base product to whole product using the new formula
  const calculateWholeProductPercentage = (basePercentage: number, markedIngredientPercentage: number) => {
    // Formula: (basePercentage / 100) * 100 * (markedIngredientPercentage / 100)
    // Simplified: basePercentage * markedIngredientPercentage / 100
    return +((basePercentage * markedIngredientPercentage) / 100).toFixed(1);
  };

  // Extract base product percentage from marked ingredient
  const getMarkedIngredientPercentage = () => {
    const markedIngredient = finalProductIngredients.find(ing => ing.isMarkedAsBase);
    return markedIngredient?.percentage || 0;
  };

  // AI extraction mutations - separate for each type
  const extractFinalIngredientsMutation = useMutation({
    mutationFn: async ({ image }: { image: string }) => {
      const res = await apiRequest("POST", "/api/extract-ingredients", {
        image,
        isBaseProduct: false,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      const ingredientsWithMarking = (data.ingredients || []).map((ing: any) => ({
        ...ing,
        isMarkedAsBase: false
      }));
      setFinalProductIngredients(ingredientsWithMarking);
      onUpdate({ ingredients: ingredientsWithMarking });
      // Update text representation with percentages in parentheses
      const text = ingredientsWithMarking.map((ing: Ingredient) => 
        `${ing.name}${ing.percentage ? ` (${ing.percentage}%)` : ''}`
      ).join(', ');
      setFinalRecipeText(text);
      toast({
        title: "Final Recipe erfolgreich extrahiert",
        description: "Final Recipe Zutaten wurden erfolgreich extrahiert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Fehler beim Extrahieren der Final Recipe Zutaten.",
        variant: "destructive",
      });
    },
  });

  const extractBaseIngredientsMutation = useMutation({
    mutationFn: async ({ image }: { image: string }) => {
      const res = await apiRequest("POST", "/api/extract-ingredients", {
        image,
        isBaseProduct: true,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      const ingredientsWithMarking = (data.ingredients || []).map((ing: any) => ({
        ...ing,
        isMarkedAsBase: false
      }));
      setBaseProductIngredients(ingredientsWithMarking);
      onUpdate({ baseProductIngredients: ingredientsWithMarking });
      // Update text representation with percentages in parentheses
      const text = ingredientsWithMarking.map((ing: Ingredient) => 
        `${ing.name}${ing.percentage ? ` (${ing.percentage}%)` : ''}`
      ).join(', ');
      setBaseRecipeText(text);
      toast({
        title: "Base Recipe erfolgreich extrahiert",
        description: "Base Recipe Zutaten wurden erfolgreich extrahiert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Fehler beim Extrahieren der Base Recipe Zutaten.",
        variant: "destructive",
      });
    },
  });

  const handleFinalImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      extractFinalIngredientsMutation.mutate({ image: base64Data });
    };
    reader.readAsDataURL(file);
  };

  const handleBaseImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      extractBaseIngredientsMutation.mutate({ image: base64Data });
    };
    reader.readAsDataURL(file);
  };

  const handleFinalRecipeTextChange = (text: string) => {
    setFinalRecipeText(text);
    // Parse text back to ingredients array - handle percentages in parentheses
    const ingredients = text.split(',').map(item => {
      const trimmed = item.trim();
      // Match percentages in parentheses like (90.7%) or without parentheses
      const percentageMatch = trimmed.match(/\((\d+(?:\.\d+)?)\s*%\)/) || trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
      const name = trimmed.replace(/\s*\(?\d+(?:\.\d+)?%\)?\s*/, '').trim();
      return {
        name,
        percentage: percentageMatch ? parseFloat(percentageMatch[1]) : undefined,
        origin: "",
        isMarkedAsBase: false
      };
    }).filter(ing => ing.name);
    
    setFinalProductIngredients(ingredients);
    onUpdate({ ingredients });
  };

  const handleBaseRecipeTextChange = (text: string) => {
    setBaseRecipeText(text);
    // Parse text back to ingredients array - handle percentages in parentheses
    const ingredients = text.split(',').map(item => {
      const trimmed = item.trim();
      // Match percentages in parentheses like (23.0%) or without parentheses
      const percentageMatch = trimmed.match(/\((\d+(?:\.\d+)?)\s*%\)/) || trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
      const name = trimmed.replace(/\s*\(?\d+(?:\.\d+)?%\)?\s*/, '').trim();
      return {
        name,
        percentage: percentageMatch ? parseFloat(percentageMatch[1]) : undefined,
        origin: "",
        isMarkedAsBase: false
      };
    }).filter(ing => ing.name);
    
    setBaseProductIngredients(ingredients);
    onUpdate({ baseProductIngredients: ingredients });
  };

  const formatCombinedIngredients = () => {
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
        const percentage = ing.percentage ? ` **(${ing.percentage}%)**` : '';
        const ingredientText = `**${ing.name}${percentage}**`;
        
        // Check if this ingredient is marked as base recipe
        if (ing.isMarkedAsBase && baseFormatted) {
          return `${ingredientText} [${baseFormatted}]`;
        }
        
        return ingredientText;
      })
      .join(', ');

    return finalFormatted;
  };

  const generateIngredientsTable = (): Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> => {
    const markedIngredientPercentage = getMarkedIngredientPercentage();
    const tableIngredients: Array<{name: string, percentage: number, origin: string, isFinalProduct: boolean}> = [];

    // Add final product ingredients in the same order as they appear
    finalProductIngredients
      .filter(ing => ing.name.trim())
      .forEach(ing => {
        if (ing.isMarkedAsBase && markedIngredientPercentage > 0) {
          // Add base product ingredients with recalculated percentages
          baseProductIngredients
            .filter(baseIng => baseIng.name.trim())
            .forEach(baseIng => {
              const wholeProductPercentage = baseIng.percentage 
                ? calculateWholeProductPercentage(baseIng.percentage, markedIngredientPercentage)
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

  // Function to mark/unmark an ingredient as base recipe
  const toggleIngredientAsBase = (ingredientName: string) => {
    const updatedIngredients = finalProductIngredients.map(ing => {
      if (ing.name === ingredientName) {
        const isMarked = !ing.isMarkedAsBase;
        // Update marked ingredient tracker
        setMarkedIngredient(isMarked ? ingredientName : null);
        return { ...ing, isMarkedAsBase: isMarked };
      }
      // Remove mark from other ingredients (only one can be marked)
      return { ...ing, isMarkedAsBase: false };
    });
    
    setFinalProductIngredients(updatedIngredients);
    onUpdate({ ingredients: updatedIngredients });
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
              onChange={handleFinalImageUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-2">
              Klicken Sie hier, um ein Bild des Final Recipe hochzuladen
            </p>
            <Button
              variant="outline"
              onClick={() => finalRecipeInputRef.current?.click()}
              disabled={extractFinalIngredientsMutation.isPending}
            >
              {extractFinalIngredientsMutation.isPending ? "Extrahiere..." : "Final Recipe hochladen"}
            </Button>
          </div>

          {finalRecipeText && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Extrahierte Final Recipe Zutaten (bearbeitbar):</label>
                <Textarea
                  value={finalRecipeText}
                  onChange={(e) => handleFinalRecipeTextChange(e.target.value)}
                  placeholder="Granola (90,7%), Coconut chips (5%), pineapple chips (4,3%)"
                  rows={3}
                />
              </div>
              
              {/* Ingredient marking section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Zutat als Base Recipe markieren:</label>
                <div className="grid grid-cols-1 gap-2">
                  {finalProductIngredients
                    .filter(ing => ing.name.trim())
                    .map((ingredient, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="flex-1">
                          {ingredient.name} {ingredient.percentage ? `(${ingredient.percentage}%)` : ''}
                        </span>
                        <Button
                          variant={ingredient.isMarkedAsBase ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleIngredientAsBase(ingredient.name)}
                          className="ml-2"
                        >
                          <Tag className="w-4 h-4 mr-1" />
                          {ingredient.isMarkedAsBase ? "Markiert" : "Markieren"}
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
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
              onChange={handleBaseImageUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-2">
              Klicken Sie hier, um ein Bild des Base Recipe hochzuladen
            </p>
            <Button
              variant="outline"
              onClick={() => baseRecipeInputRef.current?.click()}
              disabled={extractBaseIngredientsMutation.isPending}
            >
              {extractBaseIngredientsMutation.isPending ? "Extrahiere..." : "Base Recipe hochladen"}
            </Button>
          </div>

          {baseRecipeText && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Extrahierte Base Recipe Zutaten (bearbeitbar):</label>
              <Textarea
                value={baseRecipeText}
                onChange={(e) => handleBaseRecipeTextChange(e.target.value)}
                placeholder="whole grain oat flakes (23,0%), high-fiber oat bran (20,0%), corn fiber (17,5%)"
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
            <p className="text-sm text-slate-600 mb-2">
              Final Recipe Zutaten (fett) mit Base Recipe (in eckigen Klammern):
            </p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div 
                className="text-sm text-slate-700"
                dangerouslySetInnerHTML={{
                  __html: `<strong>Ingredients:</strong> ${(formatCombinedIngredients() || "Noch keine Zutaten extrahiert...")
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}`
                }}
              />
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
              Base Product Zutaten werden basierend auf der markierten Final Recipe Zutat umgerechnet.
            </p>
            {getMarkedIngredientPercentage() > 0 && (
              <p className="text-xs text-slate-500">
                Formel: Base Zutat % × {getMarkedIngredientPercentage()}% ÷ 100
                (Beispiel: 20% × {getMarkedIngredientPercentage()}% ÷ 100 = {((20 * getMarkedIngredientPercentage()) / 100).toFixed(1)}%)
              </p>
            )}
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
                      <td className="border border-slate-300 p-2">
                        {ingredient.isFinalProduct ? (
                          <strong>{ingredient.name}</strong>
                        ) : (
                          ingredient.name
                        )}
                      </td>
                      <td className="border border-slate-300 p-2">{ingredient.percentage}%</td>
                      <td className="border border-slate-300 p-2">
                        <Input
                          value={ingredient.origin}
                          onChange={(e) => {
                            const newOrigin = e.target.value;
                            // Update origin in final product ingredients
                            if (ingredient.isFinalProduct) {
                              const updatedFinalIngredients = finalProductIngredients.map(ing => 
                                ing.name === ingredient.name ? { ...ing, origin: newOrigin } : ing
                              );
                              setFinalProductIngredients(updatedFinalIngredients);
                              onUpdate({ ingredients: updatedFinalIngredients });
                            } else {
                              // Update origin in base product ingredients
                              const updatedBaseIngredients = baseProductIngredients.map(ing => 
                                ing.name === ingredient.name ? { ...ing, origin: newOrigin } : ing
                              );
                              setBaseProductIngredients(updatedBaseIngredients);
                              onUpdate({ baseProductIngredients: updatedBaseIngredients });
                            }
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