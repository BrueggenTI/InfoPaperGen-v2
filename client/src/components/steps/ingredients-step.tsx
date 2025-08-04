import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload, Camera, Tag, Languages, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Ingredient {
  name: string;
  originalName?: string;
  translatedName?: string;
  percentage?: number;
  origin?: string;
  isMarkedAsBase?: boolean;
  language?: 'original' | 'english';
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
    formData.ingredients || [{ name: "", percentage: undefined, origin: "", isMarkedAsBase: false, language: 'original' }]
  );
  const [baseProductIngredients, setBaseProductIngredients] = useState<Ingredient[]>(
    formData.baseProductIngredients || [{ name: "", percentage: undefined, origin: "", language: 'original' }]
  );
  
  // Text versions for manual editing after AI extraction
  const [finalRecipeText, setFinalRecipeText] = useState<string>("");
  const [baseRecipeText, setBaseRecipeText] = useState<string>("");
  
  // Track which final ingredient is marked as base recipe
  const [markedIngredient, setMarkedIngredient] = useState<string | null>(null);
  
  // Upload refs
  const finalRecipeInputRef = useRef<HTMLInputElement>(null);
  const baseRecipeInputRef = useRef<HTMLInputElement>(null);
  
  // Track uploaded files
  const [finalRecipeFile, setFinalRecipeFile] = useState<File | null>(null);
  const [baseRecipeFile, setBaseRecipeFile] = useState<File | null>(null);
  
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
        originalName: ing.name,
        isMarkedAsBase: false,
        language: 'original' as const
      }));
      setFinalProductIngredients(ingredientsWithMarking);
      onUpdate({ ingredients: ingredientsWithMarking });
      // Update text representation with percentages in parentheses
      const text = ingredientsWithMarking.map((ing: Ingredient) => 
        `${ing.name}${ing.percentage ? ` (${ing.percentage}%)` : ''}`
      ).join(', ');
      setFinalRecipeText(text);
      toast({
        title: "Final Recipe extracted successfully",
        description: "Final Recipe ingredients have been successfully extracted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error extracting Final Recipe ingredients.",
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
        originalName: ing.name,
        language: 'original' as const
      }));
      setBaseProductIngredients(ingredientsWithMarking);
      onUpdate({ baseProductIngredients: ingredientsWithMarking });
      // Update text representation with percentages in parentheses
      const text = ingredientsWithMarking.map((ing: Ingredient) => 
        `${ing.name}${ing.percentage ? ` (${ing.percentage}%)` : ''}`
      ).join(', ');
      setBaseRecipeText(text);
      toast({
        title: "Base Recipe extracted successfully",
        description: "Base Recipe ingredients have been successfully extracted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error extracting Base Recipe ingredients.",
        variant: "destructive",
      });
    },
  });

  // Translation mutations
  const translateFinalIngredientsMutation = useMutation({
    mutationFn: async ({ targetLanguage, sourceLanguage }: { targetLanguage: string; sourceLanguage?: string }) => {
      const res = await apiRequest("POST", "/api/translate-ingredients", {
        ingredients: finalProductIngredients.filter(ing => ing.name.trim()),
        targetLanguage,
        sourceLanguage
      });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      const translatedIngredients = finalProductIngredients.map(ing => {
        const translation = data.translatedIngredients?.find((t: any) => t.originalName === ing.name);
        if (translation && variables.targetLanguage === 'English') {
          return {
            ...ing,
            name: translation.translatedName,
            originalName: ing.originalName || ing.name,
            translatedName: translation.translatedName,
            language: 'english' as const,
            isMarkedAsBase: ing.isMarkedAsBase ?? false
          };
        } else if (variables.targetLanguage === 'original' && ing.originalName) {
          return {
            ...ing,
            name: ing.originalName,
            language: 'original' as const,
            isMarkedAsBase: ing.isMarkedAsBase ?? false
          };
        }
        return {
          ...ing,
          language: ing.language ?? 'original' as const,
          isMarkedAsBase: ing.isMarkedAsBase ?? false
        };
      });
      
      setFinalProductIngredients(translatedIngredients);
      onUpdate({ ingredients: translatedIngredients });
      
      // Update text representation
      const text = translatedIngredients.map((ing: Ingredient) => 
        `${ing.name}${ing.percentage ? ` (${ing.percentage}%)` : ''}`
      ).join(', ');
      setFinalRecipeText(text);
      
      toast({
        title: "Translation completed",
        description: `Final recipe ingredients have been translated to ${variables.targetLanguage === 'English' ? 'English' : 'original language'}.`,
      });
    },
    onError: () => {
      toast({
        title: "Translation failed",
        description: "Error translating final recipe ingredients.",
        variant: "destructive",
      });
    },
  });

  const translateBaseIngredientsMutation = useMutation({
    mutationFn: async ({ targetLanguage, sourceLanguage }: { targetLanguage: string; sourceLanguage?: string }) => {
      const res = await apiRequest("POST", "/api/translate-ingredients", {
        ingredients: baseProductIngredients.filter(ing => ing.name.trim()),
        targetLanguage,
        sourceLanguage
      });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      const translatedIngredients = baseProductIngredients.map(ing => {
        const translation = data.translatedIngredients?.find((t: any) => t.originalName === ing.name);
        if (translation && variables.targetLanguage === 'English') {
          return {
            ...ing,
            name: translation.translatedName,
            originalName: ing.originalName || ing.name,
            translatedName: translation.translatedName,
            language: 'english' as const
          };
        } else if (variables.targetLanguage === 'original' && ing.originalName) {
          return {
            ...ing,
            name: ing.originalName,
            language: 'original' as const
          };
        }
        return {
          ...ing,
          language: ing.language ?? 'original' as const
        };
      });
      
      setBaseProductIngredients(translatedIngredients);
      onUpdate({ baseProductIngredients: translatedIngredients });
      
      // Update text representation
      const text = translatedIngredients.map((ing: Ingredient) => 
        `${ing.name}${ing.percentage ? ` (${ing.percentage}%)` : ''}`
      ).join(', ');
      setBaseRecipeText(text);
      
      toast({
        title: "Translation completed",
        description: `Base recipe ingredients have been translated to ${variables.targetLanguage === 'English' ? 'English' : 'original language'}.`,
      });
    },
    onError: () => {
      toast({
        title: "Translation failed",
        description: "Error translating base recipe ingredients.",
        variant: "destructive",
      });
    },
  });

  const handleFinalImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file under 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFinalRecipeFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1];
      extractFinalIngredientsMutation.mutate({ image: base64Data });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFinalImage = () => {
    setFinalRecipeFile(null);
    setFinalRecipeText("");
    setFinalProductIngredients([{ name: "", percentage: undefined, origin: "", isMarkedAsBase: false, language: 'original' }]);
    onUpdate({ ingredients: [] });
    if (finalRecipeInputRef.current) {
      finalRecipeInputRef.current.value = "";
    }
    toast({
      title: "Image removed",
      description: "Final recipe image and extracted ingredients have been cleared.",
    });
  };

  const handleBaseImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file under 10MB.",
        variant: "destructive",
      });
      return;
    }

    setBaseRecipeFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1];
      extractBaseIngredientsMutation.mutate({ image: base64Data });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBaseImage = () => {
    setBaseRecipeFile(null);
    setBaseRecipeText("");
    setBaseProductIngredients([{ name: "", percentage: undefined, origin: "", language: 'original' }]);
    onUpdate({ baseProductIngredients: [] });
    if (baseRecipeInputRef.current) {
      baseRecipeInputRef.current.value = "";
    }
    toast({
      title: "Image removed",
      description: "Base recipe image and extracted ingredients have been cleared.",
    });
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
        originalName: name,
        percentage: percentageMatch ? parseFloat(percentageMatch[1]) : undefined,
        origin: "",
        isMarkedAsBase: false,
        language: 'original' as const
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
        originalName: name,
        percentage: percentageMatch ? parseFloat(percentageMatch[1]) : undefined,
        origin: "",
        language: 'original' as const
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
          // First add the marked ingredient itself
          tableIngredients.push({
            name: ing.name,
            percentage: ing.percentage || 0,
            origin: ing.origin || "",
            isFinalProduct: true
          });
          
          // Then add base product ingredients with recalculated percentages
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
        return { 
          ...ing, 
          isMarkedAsBase: isMarked,
          language: ing.language ?? 'original' as const
        };
      }
      // Remove mark from other ingredients (only one can be marked)
      return { 
        ...ing, 
        isMarkedAsBase: false,
        language: ing.language ?? 'original' as const
      };
    });
    
    setFinalProductIngredients(updatedIngredients);
    onUpdate({ ingredients: updatedIngredients });
  };

  const handleNext = () => {
    // Ensure all ingredients have the required properties set
    const processedIngredients = finalProductIngredients.map(ing => ({
      ...ing,
      isMarkedAsBase: ing.isMarkedAsBase ?? false,
      language: ing.language ?? 'original' as const
    }));
    
    const processedBaseIngredients = baseProductIngredients.map(ing => ({
      ...ing,
      language: ing.language ?? 'original' as const
    }));
    
    onUpdate({
      ingredients: processedIngredients,
      baseProductIngredients: processedBaseIngredients,
    });
    onNext();
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingredients</h2>
        <p className="text-slate-600">
          Upload images of your Final Recipe and Base Recipe to automatically extract ingredients.
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
          {!finalRecipeFile ? (
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
                Click here to upload an image of the Final Recipe
              </p>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  finalRecipeInputRef.current?.click();
                }}
                disabled={extractFinalIngredientsMutation.isPending}
                data-testid="button-upload-final-recipe"
              >
                {extractFinalIngredientsMutation.isPending ? "Extracting..." : "Upload Final Recipe"}
              </Button>
            </div>
          ) : (
            <div className="border-2 border-slate-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-slate-700">Uploaded: {finalRecipeFile.name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFinalImage}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid="button-remove-final-recipe"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    finalRecipeInputRef.current?.click();
                  }}
                  disabled={extractFinalIngredientsMutation.isPending}
                  data-testid="button-replace-final-recipe"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload New Image
                </Button>
              </div>
              <input
                ref={finalRecipeInputRef}
                type="file"
                accept="image/*"
                onChange={handleFinalImageUpload}
                className="hidden"
              />
            </div>
          )}

          {finalRecipeText && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Extracted Final Recipe Ingredients (editable):</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => translateFinalIngredientsMutation.mutate({ 
                        targetLanguage: 'English',
                        sourceLanguage: 'German'
                      })}
                      disabled={translateFinalIngredientsMutation.isPending || !finalProductIngredients.some(ing => ing.name.trim())}
                      data-testid="button-translate-final-english"
                    >
                      <Languages className="w-4 h-4 mr-1" />
                      {translateFinalIngredientsMutation.isPending ? "Translating..." : "Translate to English"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => translateFinalIngredientsMutation.mutate({ 
                        targetLanguage: 'original'
                      })}
                      disabled={translateFinalIngredientsMutation.isPending || !finalProductIngredients.some(ing => ing.originalName)}
                      data-testid="button-translate-final-original"
                    >
                      <Languages className="w-4 h-4 mr-1" />
                      Back to Original
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={finalRecipeText}
                  onChange={(e) => handleFinalRecipeTextChange(e.target.value)}
                  placeholder="Granola (90,7%), Coconut chips (5%), pineapple chips (4,3%)"
                  rows={3}
                  data-testid="textarea-final-recipe"
                />
              </div>
              
              {/* Ingredient marking section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mark ingredient as Base Recipe:</label>
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
                          {ingredient.isMarkedAsBase ? "Marked" : "Mark"}
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
          {!baseRecipeFile ? (
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
                Click here to upload an image of the Base Recipe
              </p>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  baseRecipeInputRef.current?.click();
                }}
                disabled={extractBaseIngredientsMutation.isPending}
                data-testid="button-upload-base-recipe"
              >
                {extractBaseIngredientsMutation.isPending ? "Extracting..." : "Upload Base Recipe"}
              </Button>
            </div>
          ) : (
            <div className="border-2 border-slate-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-slate-700">Uploaded: {baseRecipeFile.name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveBaseImage}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid="button-remove-base-recipe"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    baseRecipeInputRef.current?.click();
                  }}
                  disabled={extractBaseIngredientsMutation.isPending}
                  data-testid="button-replace-base-recipe"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload New Image
                </Button>
              </div>
              <input
                ref={baseRecipeInputRef}
                type="file"
                accept="image/*"
                onChange={handleBaseImageUpload}
                className="hidden"
              />
            </div>
          )}

          {baseRecipeText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Extracted Base Recipe Ingredients (editable):</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => translateBaseIngredientsMutation.mutate({ 
                      targetLanguage: 'English',
                      sourceLanguage: 'German'
                    })}
                    disabled={translateBaseIngredientsMutation.isPending || !baseProductIngredients.some(ing => ing.name.trim())}
                    data-testid="button-translate-base-english"
                  >
                    <Languages className="w-4 h-4 mr-1" />
                    {translateBaseIngredientsMutation.isPending ? "Translating..." : "Translate to English"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => translateBaseIngredientsMutation.mutate({ 
                      targetLanguage: 'original'
                    })}
                    disabled={translateBaseIngredientsMutation.isPending || !baseProductIngredients.some(ing => ing.originalName)}
                    data-testid="button-translate-base-original"
                  >
                    <Languages className="w-4 h-4 mr-1" />
                    Back to Original
                  </Button>
                </div>
              </div>
              <Textarea
                value={baseRecipeText}
                onChange={(e) => handleBaseRecipeTextChange(e.target.value)}
                placeholder="whole grain oat flakes (23,0%), high-fiber oat bran (20,0%), corn fiber (17,5%)"
                rows={4}
                data-testid="textarea-base-recipe"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined Ingredients Preview */}
      {(finalProductIngredients.some(ing => ing.name.trim()) || baseProductIngredients.some(ing => ing.name.trim())) && (
        <Card>
          <CardHeader>
            <CardTitle>Combined Ingredients Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-2">
              Final Recipe ingredients (bold) with Base Recipe (in square brackets):
            </p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div 
                className="text-sm text-slate-700"
                dangerouslySetInnerHTML={{
                  __html: `<strong>Ingredients:</strong> ${(formatCombinedIngredients() || "No ingredients extracted yet...")
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
            <CardTitle>Ingredients Table</CardTitle>
            <p className="text-sm text-slate-600">
              Base Product ingredients are calculated based on the marked Final Recipe ingredient.
            </p>
            {getMarkedIngredientPercentage() > 0 && (
              <p className="text-xs text-slate-500">
                Formula: Base ingredient % × {getMarkedIngredientPercentage()}% ÷ 100
                (Example: 20% × {getMarkedIngredientPercentage()}% ÷ 100 = {((20 * getMarkedIngredientPercentage()) / 100).toFixed(1)}%)
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
                              // Ensure all ingredients have the required properties set
                              const processedIngredients = updatedFinalIngredients.map(ing => ({
                                ...ing,
                                isMarkedAsBase: ing.isMarkedAsBase ?? false,
                                language: ing.language ?? 'original' as const
                              }));
                              onUpdate({ ingredients: processedIngredients });
                            } else {
                              // Update origin in base product ingredients
                              const updatedBaseIngredients = baseProductIngredients.map(ing => 
                                ing.name === ingredient.name ? { ...ing, origin: newOrigin } : ing
                              );
                              setBaseProductIngredients(updatedBaseIngredients);
                              // Ensure all base ingredients have the required properties set
                              const processedBaseIngredients = updatedBaseIngredients.map(ing => ({
                                ...ing,
                                language: ing.language ?? 'original' as const
                              }));
                              onUpdate({ baseProductIngredients: processedBaseIngredients });
                            }
                          }}
                          placeholder="Enter country"
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
        <Button 
          variant="outline" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPrev();
          }} 
          disabled={isLoading}
          data-testid="button-previous-ingredients"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNext();
          }} 
          disabled={isLoading}
          data-testid="button-next-ingredients"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}