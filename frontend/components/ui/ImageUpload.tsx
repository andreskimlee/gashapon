"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/utils/helpers";

interface UploadSignature {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  type: "game" | "prize";
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  type,
  className,
  disabled,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadSignature = async (): Promise<UploadSignature> => {
    const response = await fetch(`/api/admin/upload-signature?type=${type}`);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to get upload signature");
    }
    return response.json();
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const signature = await getUploadSignature();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.apiKey);
    formData.append("timestamp", signature.timestamp.toString());
    formData.append("signature", signature.signature);
    formData.append("folder", signature.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Upload failed");
    }

    const data = await response.json();
    // Return the secure URL with auto-format and auto-quality transformations
    return data.secure_url.replace(
      "/upload/",
      "/upload/f_auto,q_auto/"
    );
  };

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be less than 10MB");
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const url = await uploadToCloudinary(file);
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange, type]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (disabled || uploading) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, uploading, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !uploading) {
        setDragOver(true);
      }
    },
    [disabled, uploading]
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setError(null);
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all cursor-pointer",
          "flex flex-col items-center justify-center min-h-[120px] p-4",
          dragOver
            ? "border-pastel-coral bg-pastel-coral/10"
            : "border-pastel-pink/50 hover:border-pastel-coral/50",
          disabled && "opacity-50 cursor-not-allowed",
          uploading && "cursor-wait"
        )}
      >
        {value ? (
          // Preview uploaded image
          <div className="relative w-full">
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-32 object-contain rounded-lg"
            />
            {!disabled && !uploading && (
              <button
                onClick={handleRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : uploading ? (
          // Loading state
          <div className="flex flex-col items-center gap-2 text-pastel-textLight">
            <Loader2 className="w-8 h-8 animate-spin text-pastel-coral" />
            <span className="text-sm">Uploading...</span>
          </div>
        ) : (
          // Empty state / drop zone
          <div className="flex flex-col items-center gap-2 text-pastel-textLight">
            {dragOver ? (
              <ImageIcon className="w-8 h-8 text-pastel-coral" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
            <span className="text-sm text-center">
              {dragOver ? (
                "Drop image here"
              ) : (
                <>
                  Click or drag image
                  <br />
                  <span className="text-xs opacity-70">PNG, JPG up to 10MB</span>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
