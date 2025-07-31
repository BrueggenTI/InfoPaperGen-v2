import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductInfo } from "@shared/schema";
import { ChevronRight, Upload, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  productNumber: z.string().min(1, "Product number is required"),
  productName: z.string().min(1, "Product name is required"),
  preparedBy: z.string().optional(),
  jobTitle: z.string().optional(),
});

interface ProductDetailsStepProps {
  formData: ProductInfo;
  onUpdate: (data: Partial<ProductInfo>) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export default function ProductDetailsStep({
  formData,
  onUpdate,
  onNext,
  isLoading = false,
}: ProductDetailsStepProps) {
  const { toast } = useToast();
  const productImageInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productNumber: formData.productNumber || "",
      productName: formData.productName || "",
      preparedBy: formData.preparedBy || "",
      jobTitle: formData.jobTitle || "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onUpdate(values);
    onNext();
  };

  const handleFieldChange = (field: string, value: string) => {
    onUpdate({ [field]: value });
  };

  const handleProductImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onUpdate({ productImage: base64 });
      toast({
        title: "Image uploaded",
        description: "Product image uploaded successfully.",
      });
    };
    reader.readAsDataURL(file);
  };

  const removeProductImage = () => {
    onUpdate({ productImage: undefined });
    if (productImageInputRef.current) {
      productImageInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-primary mb-2">Product Details</h2>
        <p className="text-muted-foreground">Enter the basic information about your product.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="productNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., PRD-2024-001"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("productNumber", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Crunchy Granola Mix"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("productName", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="preparedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prepared By</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Full Name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("preparedBy", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Position"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange("jobTitle", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Product Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Produktbild</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  ref={productImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-2">
                  Klicken Sie hier, um ein Produktbild hochzuladen
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => productImageInputRef.current?.click()}
                  disabled={isLoading}
                >
                  Produktbild hochladen
                </Button>
              </div>

              {formData.productImage && (
                <div className="relative">
                  <img
                    src={formData.productImage}
                    alt="Product"
                    className="w-full max-w-md mx-auto rounded-lg shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeProductImage}
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end mt-8">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <span>Continue to Ingredients</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
