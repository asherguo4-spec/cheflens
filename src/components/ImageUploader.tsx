import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Camera } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImageUploaderProps {
  onImageReady: (base64: string, mimeType: string) => void;
  onClear: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageReady, onClear }) => {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreview(result);
        
        // Extract base64 and mime type
        const match = result.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          onImageReady(match[2], match[1]);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onImageReady]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onClear();
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div 
          {...getRootProps()} 
          className={cn(
            "flex flex-col items-center justify-center w-full h-full min-h-[140px] border-2 border-dashed rounded-2xl cursor-pointer transition-colors duration-200 ease-in-out bg-black/20",
            isDragActive 
              ? "border-orange-500 bg-orange-500/10" 
              : "border-white/20 hover:bg-white/5 hover:border-white/40"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6 text-white/40" />
          </div>
          <p className="text-white/40 text-sm">
            {isDragActive ? "把食材放这里..." : "上传食材照片"}
          </p>
          <div className="mt-3 px-6 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-orange-400 transition-colors">
            浏览相册
          </div>
        </div>
      ) : (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden group">
          <img src={preview} alt="Upload preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <button 
              onClick={handleClear}
              className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
