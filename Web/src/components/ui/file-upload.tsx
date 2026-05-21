'use client';

import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import { useFileUpload } from '../../hooks/useFileUpload';
import { validateFile } from '../../lib/fileValidation';
import { Button } from './button';
import { Card } from './card';
import { Upload, X, FileImage, AlertCircle } from 'lucide-react';
import type { Id } from '../../lib/convex';

/**
 * Props for the FileUpload component
 */
export interface FileUploadProps {
  /** Callback when a file is successfully uploaded */
  onFileUploaded?: (storageId: Id<'_storage'>, url: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Callback when upload is cancelled */
  onUploadCancel?: () => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Accepted file types (for input element) */
  accept?: string;
  /** Maximum file size in bytes (defaults to 5MB) */
  maxSize?: number;
}

/**
 * File upload component with drag-and-drop functionality.
 * Supports image validation, progress tracking, and accessibility features.
 */
export function FileUpload({
  onFileUploaded,
  onUploadError,
  onUploadCancel,
  disabled = false,
  className = '',
  accept = 'image/*',
  maxSize,
}: FileUploadProps) {
  const { upload, remove, reset, isUploading, progress, error, storageId, url } = useFileUpload();
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /**
   * Validates and processes a file before upload
   */
  const processFile = useCallback(async (file: File) => {
    try {
      // Validate file
      const validation = await validateFile(file);
      if (!validation.isValid) {
        onUploadError?.(validation.error || 'File validation failed');
        return;
      }

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
      }

      // Upload file
      const result = await upload(file);
      onFileUploaded?.(result.storageId, result.url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      onUploadError?.(errorMessage);
    }
  }, [upload, onFileUploaded, onUploadError]);

  /**
   * Handles file selection from input
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input value to allow re-uploading the same file
    event.target.value = '';
  }, [processFile]);

  /**
   * Handles drag over event
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  /**
   * Handles drag leave event
   */
  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * Handles file drop
   */
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = Array.from(event.dataTransfer.files);
    const file = files[0]; // Take first file only

    if (file) {
      processFile(file);
    }
  }, [disabled, isUploading, processFile]);

  /**
   * Handles upload cancellation
   */
  const handleCancel = useCallback(() => {
    if (storageId) {
      remove(storageId);
    }
    reset();
    setPreviewUrl(null);
    onUploadCancel?.();
  }, [storageId, remove, reset, onUploadCancel]);

  /**
   * Cleanup preview URL on unmount
   */
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <Card className={`p-6 ${className}`}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        aria-label="Upload file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.getElementById('file-input')?.click();
          }
        }}
      >
        {/* Upload Area Content */}
        {!isUploading && !storageId && (
          <>
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragOver ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-sm text-muted-foreground">
                or{' '}
                <label
                  htmlFor="file-input"
                  className="text-primary hover:underline cursor-pointer font-medium"
                >
                  browse files
                </label>
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPEG, PNG, WebP images up to {maxSize ? `${(maxSize / (1024 * 1024)).toFixed(1)}MB` : '5MB'}
              </p>
            </div>
            <input
              id="file-input"
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              disabled={disabled}
              className="hidden"
              aria-label="Select file"
            />
          </>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <FileImage className="h-8 w-8 text-primary animate-pulse" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {/* Upload Success */}
        {storageId && url && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <FileImage className="h-8 w-8 text-green-600" />
              <span className="text-sm font-medium text-green-600">Upload successful!</span>
            </div>
            {previewUrl && (
              <div className="flex justify-center">
                <Image
                  src={previewUrl}
                  alt="Uploaded file preview"
                  width={128}
                  height={128}
                  className="max-w-32 max-h-32 object-cover rounded border"
                  unoptimized
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <span className="text-sm font-medium">Upload failed</span>
            </div>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                setPreviewUrl(null);
              }}
              className="w-full"
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
