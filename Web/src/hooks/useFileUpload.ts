'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { uploadFile, getFileUrl, deleteFile } from '../lib/fileStorage';
import { validateFile } from '../lib/fileValidation';
import type { Id } from '../lib/convex';

export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  storageId: Id<'_storage'> | null;
  url: string | null;
}

export interface FileUploadResult {
  storageId: Id<'_storage'>;
  url: string;
}

export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    storageId: null,
    url: null,
  });

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inflightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      inflightRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    inflightRef.current = false;
    if (isMountedRef.current) {
      setState({
        isUploading: false,
        progress: 0,
        error: null,
        storageId: null,
        url: null,
      });
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    inflightRef.current = false;
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: 'Upload cancelled',
      }));
    }
  }, []);

  const upload = useCallback(async (file: File): Promise<FileUploadResult> => {
    if (inflightRef.current) {
      throw new Error('An upload is already in progress');
    }

    inflightRef.current = true;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isUploading: true,
          progress: 0,
          error: null,
        }));
      }

      const validation = await validateFile(file);
      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }
      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
      }

      if (isMountedRef.current) {
        setState(prev => ({ ...prev, progress: 10 }));
      }

      const storageId = await uploadFile(file, signal);

      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }

      if (isMountedRef.current) {
        setState(prev => ({ ...prev, progress: 80 }));
      }

      const url = await getFileUrl(storageId, signal);

      if (signal.aborted) {
        throw new Error('Upload cancelled');
      }

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isUploading: false,
          progress: 100,
          storageId,
          url,
        }));
      }

      return { storageId, url };
    } catch (error) {
      if (!isMountedRef.current || signal.aborted) {
        throw new Error('Upload cancelled');
      }
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isUploading: false,
          progress: 0,
          error: errorMessage,
        }));
      }
      throw error;
    } finally {
      inflightRef.current = false;
      abortControllerRef.current = null;
    }
  }, []);

  const remove = useCallback(async (storageId: Id<'_storage'>): Promise<void> => {
    try {
      await deleteFile(storageId);
      if (isMountedRef.current) {
        setState(prev => {
          if (prev.storageId === storageId) {
            return {
              isUploading: false,
              progress: 0,
              error: null,
              storageId: null,
              url: null,
            };
          }
          return prev;
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, error: errorMessage }));
      }
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, error: null }));
    }
  }, []);

  return {
    ...state,
    upload,
    remove,
    reset,
    clearError,
    cancel,
  };
}
