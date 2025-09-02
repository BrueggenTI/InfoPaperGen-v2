import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight, Upload, Camera, Tag, Languages, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateIngredientsTable, formatCombinedIngredients } from "@/lib/ingredient-utils";

interface Ingredient {
  name: string;
  originalName?: string;
  translatedName?: string;
  percentage?: number | null;
  origin?: string;
  isMarkedAsBase: boolean;
  isWholegrain: boolean;
  language: 'original' | 'english';
}

interface IngredientsStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

export default function IngredientsStep({ formData, onUpdate, onNext, onPrev, isLoading = false }: IngredientsStepProps) {
  const [finalProductIngredients, setFinalProductIngredients] = useState<Ingredient[]>(
    (formData.ingredients || []).map(ing => ({ ...ing, isMarkedAsBase: !!ing.isMarkedAsBase, isWholegrain: !!ing.isWholegrain, language: ing.language || 'original' }))
  );
  const [baseProductIngredients, setBaseProductIngredients] = useState<Ingredient[]>(
    (formData.baseProductIngredients || []).map(ing => ({ ...ing, isMarkedAsBase: false, isWholegrain: !!ing.isWholegrain, language: ing.language || 'original' }))
  );

  const formatIngredientsToString = (ingredients: Ingredient[]) =>
    (ingredients || []).map((ing) => `${ing.name}${ing.percentage ? ` (${ing.percentage.toFixed(1)}%)` : ''}`).join(', ');

  const [finalIngredientsText, setFinalIngredientsText] = useState<string>(() => formatIngredientsToString(formData.ingredients || []));
  const [baseIngredientsText, setBaseIngredientsText] = useState<string>(() => formatIngredientsToString(formData.baseProductIngredients || []));

  const [markedIngredient, setMarkedIngredient] = useState<string | null>(null);
  const finalRecipeInputRef = useRef<HTMLInputElement>(null);
  const baseRecipeInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const newFinalIngredients = (formData.ingredients || []).map(ing => ({ ...ing, isMarkedAsBase: !!ing.isMarkedAsBase, isWholegrain: !!ing.isWholegrain, language: ing.language || 'original' }));
    if (JSON.stringify(newFinalIngredients) !== JSON.stringify(finalProductIngredients)) {
      setFinalProductIngredients(newFinalIngredients);
      setFinalIngredientsText(formatIngredientsToString(newFinalIngredients));
    }

    const newBaseIngredients = (formData.baseProductIngredients || []).map(ing => ({ ...ing, isMarkedAsBase: false, isWholegrain: !!ing.isWholegrain, language: ing.language || 'original' }));
    if (JSON.stringify(newBaseIngredients) !== JSON.stringify(baseProductIngredients)) {
      setBaseProductIngredients(newBaseIngredients);
      setBaseIngredientsText(formatIngredientsToString(newBaseIngredients));
    }
  }, [formData.ingredients, formData.baseProductIngredients]);

  const ensureIngredientDefaults = (ing: Partial<Ingredient>): Ingredient => ({
    name: ing.name || '',
    originalName: ing.originalName,
    translatedName: ing.translatedName,
    percentage: ing.percentage,
    origin: ing.origin,
    isMarkedAsBase: ing.isMarkedAsBase ?? false,
    isWholegrain: ing.isWholegrain ?? false,
    language: ing.language ?? 'original',
  });

  const { mutate: extractFinalIngredientsMutation, isPending: isExtractingFinal } = useMutation({
    mutationFn: async ({ image }: { image: string }) => apiRequest("POST", "/api/extract-ingredients", { image, isBaseProduct: false }).then(res => res.json()),
    onSuccess: (data) => {
        const ingredients = (data.ingredients || []).map((ing: any) => ({ ...ing, originalName: ing.name, isMarkedAsBase: false, isWholegrain: !!ing.isWholegrain, language: 'original' as const }));
        setFinalProductIngredients(ingredients);
        setFinalIngredientsText(formatIngredientsToString(ingredients));
        onUpdate({ ingredients: ingredients.map(ensureIngredientDefaults) });
        toast({ title: "Final Recipe extracted successfully" });
    },
    onError: (error: any) => toast({ title: "Error extracting Final Recipe", description: error.message, variant: "destructive" }),
  });

  const { mutate: extractBaseIngredientsMutation, isPending: isExtractingBase } = useMutation({
    mutationFn: async ({ image }: { image: string }) => apiRequest("POST", "/api/extract-ingredients", { image, isBaseProduct: true }).then(res => res.json()),
    onSuccess: (data) => {
        const ingredients = (data.ingredients || []).map((ing: any) => ({ ...ing, originalName: ing.name, isMarkedAsBase: false, isWholegrain: !!ing.isWholegrain, language: 'original' as const }));
        setBaseProductIngredients(ingredients);
        setBaseIngredientsText(formatIngredientsToString(ingredients));
        onUpdate({ baseProductIngredients: ingredients.map(ensureIngredientDefaults) });
        toast({ title: "Base Recipe extracted successfully" });
    },
    onError: (error: any) => toast({ title: "Error extracting Base Recipe", description: error.message, variant: "destructive" }),
  });

  const { mutate: translateFinalIngredientsMutation, isPending: isTranslatingFinal } = useMutation({
    mutationFn: async (params: { targetLanguage: string; sourceLanguage?: string }) => apiRequest("POST", "/api/translate-ingredients", { ingredients: finalProductIngredients, ...params }).then(res => res.json()),
    onSuccess: (data, variables) => {
        let updatedIngredients;
        if (variables.targetLanguage === 'original') {
            updatedIngredients = finalProductIngredients.map(ing => ({
                ...ing,
                name: ing.originalName || ing.name,
                language: 'original',
            }));
        } else {
            const translated = data.translatedIngredients || [];
            updatedIngredients = finalProductIngredients.map(ing => {
                const match = translated.find((t: any) => t.originalName === ing.name);
                return match ? { ...ing, name: match.translatedName, language: variables.targetLanguage as 'english' } : ing;
            });
        }
        setFinalProductIngredients(updatedIngredients);
        setFinalIngredientsText(formatIngredientsToString(updatedIngredients));
        onUpdate({ ingredients: updatedIngredients.map(ensureIngredientDefaults) });
        toast({ title: `Translated to ${variables.targetLanguage}` });
    },
    onError: () => toast({ title: "Translation failed", variant: "destructive" }),
  });

  const { mutate: translateBaseIngredientsMutation, isPending: isTranslatingBase } = useMutation({
    mutationFn: async (params: { targetLanguage: string; sourceLanguage?: string }) => apiRequest("POST", "/api/translate-ingredients", { ingredients: baseProductIngredients, ...params }).then(res => res.json()),
    onSuccess: (data, variables) => {
        let updatedIngredients;
        if (variables.targetLanguage === 'original') {
            updatedIngredients = baseProductIngredients.map(ing => ({
                ...ing,
                name: ing.originalName || ing.name,
                language: 'original',
            }));
        } else {
            const translated = data.translatedIngredients || [];
            updatedIngredients = baseProductIngredients.map(ing => {
                const match = translated.find((t: any) => t.originalName === ing.name);
                return match ? { ...ing, name: match.translatedName, language: variables.targetLanguage as 'english' } : ing;
            });
        }
        setBaseProductIngredients(updatedIngredients);
        setBaseIngredientsText(formatIngredientsToString(updatedIngredients));
        onUpdate({ baseProductIngredients: updatedIngredients.map(ensureIngredientDefaults) });
        toast({ title: `Translated to ${variables.targetLanguage}` });
    },
    onError: () => toast({ title: "Translation failed", variant: "destructive" }),
  });

  const processImageFile = (file: File | null, uploader: 'final' | 'base') => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select a file under 10MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64Data = dataUrl.split(',')[1];

      if (uploader === 'final') {
        onUpdate({ finalRecipeImageUrl: dataUrl });
        extractFinalIngredientsMutation({ image: base64Data });
      } else {
        onUpdate({ baseRecipeImageUrl: dataUrl });
        extractBaseIngredientsMutation({ image: base64Data });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteFromClipboard = async (uploader: 'final' | 'base') => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "pasted-image.png", { type: imageType });
          processImageFile(file, uploader);
          return;
        }
      }
      toast({ title: "No image found", description: "No image was found in your clipboard." });
    } catch (error) {
      console.error("Failed to read from clipboard:", error);
      toast({ title: "Paste failed", description: "Could not read from clipboard.", variant: "destructive" });
    }
  };

  const handleFinalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => processImageFile(e.target.files?.[0] || null, 'final');
  const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => processImageFile(e.target.files?.[0] || null, 'base');

  const handleRemoveFinalImage = () => {
    setFinalProductIngredients([]);
    setFinalIngredientsText('');
    onUpdate({ ingredients: [], finalRecipeImageUrl: undefined });
    if (finalRecipeInputRef.current) finalRecipeInputRef.current.value = "";
    toast({ title: "Image removed" });
  };

  const handleRemoveBaseImage = () => {
    setBaseProductIngredients([]);
    setBaseIngredientsText('');
    onUpdate({ baseProductIngredients: [], baseRecipeImageUrl: undefined });
    if (baseRecipeInputRef.current) baseRecipeInputRef.current.value = "";
    toast({ title: "Image removed" });
  };

  const handleFinalRecipeTextBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const ingredients = text.split(',').map(item => {
      const trimmed = item.trim();
      const percentageMatch = trimmed.match(/\((\d+(?:\.\d+)?)\s*%\)/) || trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
      const name = trimmed.replace(/\s*\(?\d+(?:\.\d+)?%\)?\s*/, '').trim();
      return {
        name, originalName: name, percentage: percentageMatch ? Math.round(parseFloat(percentageMatch[1]) * 10) / 10 : undefined,
        origin: "", isMarkedAsBase: false, isWholegrain: false, language: 'original' as const
      };
    }).filter(ing => ing.name);
    setFinalProductIngredients(ingredients);
    onUpdate({ ingredients: ingredients.map(ensureIngredientDefaults) });
  };

  const handleBaseRecipeTextBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const ingredients = text.split(',').map(item => {
      const trimmed = item.trim();
      const percentageMatch = trimmed.match(/\((\d+(?:\.\d+)?)\s*%\)/) || trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
      const name = trimmed.replace(/\s*\(?\d+(?:\.\d+)?%\)?\s*/, '').trim();
      return {
        name, originalName: name, percentage: percentageMatch ? Math.round(parseFloat(percentageMatch[1]) * 10) / 10 : undefined,
        origin: "", isMarkedAsBase: false, isWholegrain: false, language: 'original' as const
      };
    }).filter(ing => ing.name);
    setBaseProductIngredients(ingredients);
    onUpdate({ baseProductIngredients: ingredients.map(ensureIngredientDefaults) });
  };

  const toggleIngredientAsBase = (ingredientName: string) => {
    const updatedIngredients = finalProductIngredients.map(ing => ({
      ...ing,
      isMarkedAsBase: ing.name === ingredientName ? !ing.isMarkedAsBase : false,
    }));
    setFinalProductIngredients(updatedIngredients);
    setFinalIngredientsText(formatIngredientsToString(updatedIngredients));
    onUpdate({ ingredients: updatedIngredients.map(ensureIngredientDefaults) });
  };

  const handleNext = () => {
    onUpdate({
      ingredients: finalProductIngredients.map(ensureIngredientDefaults),
      baseProductIngredients: baseProductIngredients.map(ensureIngredientDefaults),
    });
    onNext();
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Ingredients</h2>
        <p className="text-slate-600">Upload images of your Final Recipe and Base Recipe to automatically extract ingredients.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center space-x-2"><Camera className="w-5 h-5" /><span>Final Recipe Upload</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!formData.finalRecipeImageUrl ? (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input ref={finalRecipeInputRef} type="file" accept="image/*" onChange={handleFinalImageUpload} className="hidden" />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-2">Click to upload or paste an image</p>
              <div className="flex justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => finalRecipeInputRef.current?.click()} disabled={isExtractingFinal}>Upload Image</Button>
                <Button type="button" variant="secondary" onClick={() => handlePasteFromClipboard('final')} disabled={isExtractingFinal}>Paste from clipboard</Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-slate-300 rounded-lg p-4">
              <img src={formData.finalRecipeImageUrl} alt="Final Recipe Preview" className="w-full max-w-md mx-auto rounded-lg shadow-sm mb-4" style={{ aspectRatio: '16 / 9', objectFit: 'contain' }} />
              <div className="flex items-center justify-between mb-3"><div className="flex items-center space-x-2"><Camera className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-slate-700">Image uploaded.</span></div><Button variant="outline" size="sm" onClick={handleRemoveFinalImage} className="text-red-600 hover:text-red-700 hover:bg-red-50"><X className="w-4 h-4 mr-1" />Remove</Button></div>
              <div className="flex items-center space-x-2"><Button variant="outline" size="sm" onClick={() => finalRecipeInputRef.current?.click()} disabled={isExtractingFinal}><Upload className="w-4 h-4 mr-1" />Upload New Image</Button></div>
            </div>
          )}
          {(formData.ingredients && formData.ingredients.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Extracted Final Recipe Ingredients (editable):</label>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => translateFinalIngredientsMutation({ targetLanguage: 'English' })} disabled={isTranslatingFinal}><Languages className="w-4 h-4 mr-1" />Translate to English</Button>
                  <Button variant="outline" size="sm" onClick={() => translateFinalIngredientsMutation({ targetLanguage: 'original' })} disabled={isTranslatingFinal}><Languages className="w-4 h-4 mr-1" />Back to Original</Button>
                </div>
              </div>
              <Textarea
                value={finalIngredientsText}
                onChange={(e) => setFinalIngredientsText(e.target.value)}
                onBlur={handleFinalRecipeTextBlur}
                rows={3}
                placeholder="Enter ingredients, separated by commas..."
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Mark ingredient as Base Recipe:</label>
                {finalProductIngredients.filter(ing => ing.name.trim()).map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span>{ingredient.name} {ingredient.percentage ? `(${ingredient.percentage}%)` : ''}</span>
                    <Button variant={ingredient.isMarkedAsBase ? "default" : "outline"} size="sm" onClick={() => toggleIngredientAsBase(ingredient.name)}><Tag className="w-4 h-4 mr-1" />{ingredient.isMarkedAsBase ? "Marked" : "Mark"}</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center space-x-2"><Camera className="w-5 h-5" /><span>Base Recipe Upload</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!formData.baseRecipeImageUrl ? (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input ref={baseRecipeInputRef} type="file" accept="image/*" onChange={handleBaseImageUpload} className="hidden" />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-2">Click to upload or paste an image</p>
              <div className="flex justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => baseRecipeInputRef.current?.click()} disabled={isExtractingBase}>Upload Image</Button>
                <Button type="button" variant="secondary" onClick={() => handlePasteFromClipboard('base')} disabled={isExtractingBase}>Paste from clipboard</Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-slate-300 rounded-lg p-4">
               <img src={formData.baseRecipeImageUrl} alt="Base Recipe Preview" className="w-full max-w-md mx-auto rounded-lg shadow-sm mb-4" style={{ aspectRatio: '16 / 9', objectFit: 'contain' }} />
               <div className="flex items-center justify-between mb-3"><div className="flex items-center space-x-2"><Camera className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-slate-700">Image uploaded.</span></div><Button variant="outline" size="sm" onClick={handleRemoveBaseImage} className="text-red-600 hover:text-red-700 hover:bg-red-50"><X className="w-4 h-4 mr-1" />Remove</Button></div>
               <div className="flex items-center space-x-2"><Button variant="outline" size="sm" onClick={() => baseRecipeInputRef.current?.click()} disabled={isExtractingBase}><Upload className="w-4 h-4 mr-1" />Upload New Image</Button></div>
            </div>
          )}
           {(formData.baseProductIngredients && formData.baseProductIngredients.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Extracted Base Recipe Ingredients (editable):</label>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => translateBaseIngredientsMutation({ targetLanguage: 'English' })} disabled={isTranslatingBase}><Languages className="w-4 h-4 mr-1" />Translate to English</Button>
                  <Button variant="outline" size="sm" onClick={() => translateBaseIngredientsMutation({ targetLanguage: 'original' })} disabled={isTranslatingBase}><Languages className="w-4 h-4 mr-1" />Back to Original</Button>
                </div>
              </div>
              <Textarea
                value={baseIngredientsText}
                onChange={(e) => setBaseIngredientsText(e.target.value)}
                onBlur={handleBaseRecipeTextBlur}
                rows={4}
                placeholder="Enter ingredients, separated by commas..."
              />
            </div>
           )}
        </CardContent>
      </Card>

      {(finalProductIngredients.some(ing => ing.name.trim()) || baseProductIngredients.some(ing => ing.name.trim())) && (
        <Card>
          <CardHeader><CardTitle>Combined Ingredients Preview</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-2">Final Recipe ingredients (bold) with Base Recipe (in square brackets):</p>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: formatCombinedIngredients(formData) }} />
              <p className="text-xs text-slate-500 mt-2">* percentage in ingredient</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(finalProductIngredients.some(ing => ing.name.trim()) || baseProductIngredients.some(ing => ing.name.trim())) && (
        <Card>
          <CardHeader><CardTitle>Ingredients Table</CardTitle><p className="text-sm text-slate-600">Base Product ingredients are calculated based on the marked Final Recipe ingredient.</p></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 text-left">Ingredients</th>
                    <th className="border border-slate-300 p-2 text-left">Percentage content per whole product</th>
                    <th className="border border-slate-300 p-2 text-left">Country of Origin</th>
                    <th className="border border-slate-300 p-2 text-center">Is Wholegrain?</th>
                  </tr>
                </thead>
                <tbody>
                  {generateIngredientsTable(formData).map((ingredient, index) => (
                    <tr key={index}>
                      <td className="border border-slate-300 p-2">{ingredient.isFinalProduct ? <strong>{ingredient.name}</strong> : <span style={{ paddingLeft: '15px' }}>{ingredient.name}</span>}</td>
                      <td className="border border-slate-300 p-2">{ingredient.percentage}%</td>
                      <td className="border border-slate-300 p-2"><Input value={ingredient.origin || ''} onChange={(e) => {
                          const newOrigin = e.target.value;
                          if (ingredient.isFinalProduct) {
                              const updatedFinalIngredients = finalProductIngredients.map(ing => ing.name === ingredient.name ? { ...ing, origin: newOrigin } : ing);
                              setFinalProductIngredients(updatedFinalIngredients);
                              onUpdate({ ingredients: updatedFinalIngredients.map(ensureIngredientDefaults) });
                          } else {
                              const updatedBaseIngredients = baseProductIngredients.map(ing => ing.name === ingredient.name ? { ...ing, origin: newOrigin } : ing);
                              setBaseProductIngredients(updatedBaseIngredients);
                              onUpdate({ baseProductIngredients: updatedBaseIngredients.map(ensureIngredientDefaults) });
                          }
                      }} placeholder="Enter country" className="border-0 p-0 h-auto" /></td>
                      <td className="border border-slate-300 p-2 text-center"><Checkbox checked={ingredient.isWholegrain} onCheckedChange={(checked) => {
                          const isChecked = !!checked;
                          if (ingredient.isFinalProduct) {
                              const updatedFinalIngredients = finalProductIngredients.map(ing => ing.name === ingredient.name ? { ...ing, isWholegrain: isChecked } : ing);
                              setFinalProductIngredients(updatedFinalIngredients);
                              onUpdate({ ingredients: updatedFinalIngredients.map(ensureIngredientDefaults) });
                          } else {
                              const updatedBaseIngredients = baseProductIngredients.map(ing => ing.name === ingredient.name ? { ...ing, isWholegrain: isChecked } : ing);
                              setBaseProductIngredients(updatedBaseIngredients);
                              onUpdate({ baseProductIngredients: updatedBaseIngredients.map(ensureIngredientDefaults) });
                          }
                      }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isLoading}><ChevronLeft className="w-4 h-4 mr-2" />Previous</Button>
        <Button onClick={handleNext} disabled={isLoading}>Next<ChevronRight className="w-4 h-4 ml-2" /></Button>
      </div>
    </div>
  );
}