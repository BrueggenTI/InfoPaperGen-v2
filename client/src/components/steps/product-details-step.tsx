import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProductInfo } from "@shared/schema";
import { ChevronRight } from "lucide-react";

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Product Details</h2>
        <p className="text-slate-600">Enter the basic information about your product.</p>
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

          <div className="flex justify-end mt-8">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <span>Continue to Images</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
