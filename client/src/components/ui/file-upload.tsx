import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileImage } from "lucide-react";

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
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-slate-300 hover:border-primary/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto w-12 h-12 mb-4">
            <Upload className="w-full h-full text-slate-400" />
          </div>
          <p className="text-slate-600 mb-2">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      )}
    </div>
  );
}
