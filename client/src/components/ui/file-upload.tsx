import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileImage, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  selectedFile?: File | null;
  title: string;
  description: string;
  className?: string;
  disabled?: boolean;
}

export default function FileUpload({
  onFileSelect,
  onFileRemove,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg'] },
  maxSize = 10 * 1024 * 1024, // 10MB
  selectedFile,
  title,
  description,
  className = "",
  disabled = false,
}: FileUploadProps) {
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  });

  const handlePasteFromClipboard = async () => {
    if (disabled) return;
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "pasted-image.png", { type: imageType });
          if (file.size > maxSize) {
            toast({
              title: "Image too large",
              description: `The pasted image is larger than the maximum size of ${(maxSize / 1024 / 1024).toFixed(0)}MB.`,
              variant: "destructive",
            });
            return;
          }
          onFileSelect(file);
          return;
        }
      }
      toast({ title: "No image found", description: "No image was found in your clipboard." });
    } catch (error) {
      console.error("Failed to read from clipboard:", error);
      toast({ title: "Paste failed", description: "Could not read image from clipboard. You may need to grant permission in your browser.", variant: "destructive" });
    }
  };

  return (
    <div className={className}>
      {selectedFile ? (
        <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileImage className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {onFileRemove && (
              <button
                onClick={onFileRemove}
                disabled={disabled}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-slate-300 hover:border-primary/40'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="mx-auto w-12 h-12 mb-4 text-slate-400">
              <Upload className="w-full h-full" />
            </div>
            <p className="font-medium text-slate-600 mb-1">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handlePasteFromClipboard}
            disabled={disabled}
          >
            <ClipboardPaste className="w-4 h-4 mr-2" />
            Paste from clipboard
          </Button>
        </div>
      )}
    </div>
  );
}
