import convex, { api } from '@/lib/convex';

/**
 * File storage service for handling file uploads and management using Convex's file storage.
 * Provides a clean interface for uploading, retrieving, and deleting files.
 */

/**
 * Uploads a file to Convex file storage and returns the storage ID.
 * @param file - The File object to upload
 * @returns Promise<string> - The storage ID of the uploaded file
 * @throws Error if upload fails
 */
export async function uploadFile(file: File, signal?: AbortSignal): Promise<string> {
  try {
    if (!convex) {
      throw new Error('Convex client not initialized. Check your environment variables.');
    }
    const uploadUrl = await convex.action(api.fileStorage.generateUploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
      signal,
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.storageId;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file. Please try again.');
  }
}

/**
 * Gets the public URL for a stored file.
 * @param storageId - The storage ID of the file
 * @returns Promise<string> - The public URL string
 * @throws Error if URL retrieval fails
 */
export async function getFileUrl(storageId: string, _signal?: AbortSignal): Promise<string> {
  try {
    if (!convex) {
      throw new Error('Convex client not initialized. Check your environment variables.');
    }
    const url = await convex.action(api.fileStorage.getUrl, { storageId });
    if (!url) {
      throw new Error('File not found');
    }
    return url;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    console.error('Error getting file URL:', error);
    throw new Error('Failed to get file URL.');
  }
}

/**
 * Deletes a stored file from Convex storage.
 * @param storageId - The storage ID of the file to delete
 * @throws Error if deletion fails
 */
export async function deleteFile(storageId: string): Promise<void> {
  try {
    if (!convex) {
      throw new Error('Convex client not initialized. Check your environment variables.');
    }
    await convex.action(api.fileStorage.deleteFile, { storageId });
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file.');
  }
}