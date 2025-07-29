import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/ui/file-upload";
import { ProductInfo } from "@shared/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
}

export default function ImageUploadStep({
  formData,
  onUpdate,
  onNext,
  onPrev,
  isLoading = false,
}: ImageUploadStepProps) {
  const [productImage, setProductImage] = useState<File | null>(null);
  const [ingredientImage, setIngredientImage] = useState<File | null>(null);
  const [nutritionImage, setNutritionImage] = useState<File | null>(null);

  const { toast } = useToast();

  // Extract ingredients mutation
  const extractIngredientsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      const response = await fetch("/api/extract/ingredients", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to extract ingredients");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      onUpdate({ ingredients: data.ingredients });
      toast({
        title: "Success",
        description: "Ingredients extracted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to extract ingredients. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Extract nutrition mutation
  const extractNutritionMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      const response = await fetch("/api/extract/nutrition", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to extract nutrition");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      onUpdate({ nutrition: data });
      toast({
        title: "Success",
        description: "Nutrition information extracted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to extract nutrition information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleIngredientImageSelect = (file: File) => {
    setIngredientImage(file);
    extractIngredientsMutation.mutate(file);
  };

  const handleNutritionImageSelect = (file: File) => {
    setNutritionImage(file);
    extractNutritionMutation.mutate(file);
  };

  const canProceed = productImage && ingredientImage && nutritionImage;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Product Images</h2>
        <p className="text-slate-600">Upload product images and ingredient lists for AI analysis.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Product Photo</label>
          <FileUpload
            onFileSelect={setProductImage}
            onFileRemove={() => setProductImage(null)}
            selectedFile={productImage}
            title="Drag and drop your product photo here, or click to browse"
            description="PNG, JPG up to 10MB"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Ingredient List Photo{" "}
            <span className="text-xs text-slate-500">(AI will extract ingredients)</span>
          </label>
          <FileUpload
            onFileSelect={handleIngredientImageSelect}
            onFileRemove={() => setIngredientImage(null)}
            selectedFile={ingredientImage}
            title="Upload ingredient list or package back photo"
            description="AI will extract ingredients and percentages"
            disabled={isLoading || extractIngredientsMutation.isPending}
          />
          {extractIngredientsMutation.isPending && (
            <p className="text-sm text-blue-600 mt-2">Extracting ingredients...</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Nutrition Facts Photo{" "}
            <span className="text-xs text-slate-500">(AI will extract nutritional values)</span>
          </label>
          <FileUpload
            onFileSelect={handleNutritionImageSelect}
            onFileRemove={() => setNutritionImage(null)}
            selectedFile={nutritionImage}
            title="Upload nutrition facts label"
            description="AI will extract nutritional information"
            disabled={isLoading || extractNutritionMutation.isPending}
          />
          {extractNutritionMutation.isPending && (
            <p className="text-sm text-blue-600 mt-2">Extracting nutrition information...</p>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={onPrev}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        
        <Button 
          onClick={onNext}
          disabled={isLoading || !canProceed}
          className="flex items-center space-x-2"
        >
          <span>Continue to Ingredients</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
