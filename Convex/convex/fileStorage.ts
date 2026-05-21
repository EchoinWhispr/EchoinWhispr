import { action, internalAction, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

/**
 * File storage functions for handling file uploads and management.
 * Provides secure access to Convex's file storage system.
 * All operations require authentication; delete requires authorization.
 */

/**
 * Generates an upload URL for file storage.
 * Only authenticated users can upload files.
 * @returns The upload URL string
 */
export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const uploadUrl = await ctx.storage.generateUploadUrl();
    return uploadUrl;
  },
});

/**
 * Gets the URL for a stored file.
 * Only authenticated users can access file URLs.
 * @param storageId - The storage ID of the file
 * @returns The URL string
 */
export const getUrl = action({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    try {
      const url = await ctx.storage.getUrl(args.storageId);
      return url;
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw new Error('Failed to get file URL');
    }
  },
});

/**
 * Deletes a stored file from Convex storage.
 * Users can only delete files they own.
 * @param storageId - The storage ID of the file to delete
 */
export const deleteFile = action({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error('User not found');
    }

    const fileMetadata = await ctx.runQuery(internal.fileMetadata.getByStorageId, {
      storageId: args.storageId,
    });

    if (!fileMetadata) {
      throw new Error('File not found');
    }

    if (fileMetadata.ownerId !== user._id) {
      throw new Error('Not authorized to delete this file');
    }

    try {
      await ctx.storage.delete(args.storageId);
      await ctx.runMutation(internal.fileMetadata.deleteByStorageId, {
        storageId: args.storageId,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  },
});

/**
 * Records file metadata after a successful upload.
 * Must be called by the client after uploading to track ownership.
 * @param storageId - The storage ID returned from upload
 * @param fileName - Optional original file name
 * @param mimeType - Optional MIME type
 * @param size - Optional file size in bytes
 */
export const recordUpload = action({
  args: {
    storageId: v.id('_storage'),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new Error('User not found');
    }

    await ctx.runMutation(internal.fileMetadata.create, {
      storageId: args.storageId,
      ownerId: user._id,
      fileName: args.fileName,
      mimeType: args.mimeType,
      size: args.size,
    });
  },
});

/**
 * Clean up orphaned file metadata where the storage entry is missing.
 * Run periodically via cron.
 */
export const cleanupOrphanedFiles = internalAction({
  args: {},
  handler: async (ctx) => {
    const metadataRecords = await ctx.runQuery(internal.fileMetadata.getAll, {});

    let deletedCount = 0;
    for (const record of metadataRecords) {
      try {
        const url = await ctx.storage.getUrl(record.storageId);
        if (!url) {
          await ctx.runMutation(internal.fileMetadata.deleteByStorageId, {
            storageId: record.storageId,
          });
          deletedCount++;
        }
      } catch {
        await ctx.runMutation(internal.fileMetadata.deleteByStorageId, {
          storageId: record.storageId,
        });
        deletedCount++;
      }
    }

    return { deleted: deletedCount };
  },
});
