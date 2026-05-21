import { v } from 'convex/values';
import { internalQuery, internalMutation } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';

export const getByStorageId = internalQuery({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query('fileMetadata')
      .withIndex('by_storage_id', q => q.eq('storageId', args.storageId))
      .first();

    return metadata;
  },
});

export const create = internalMutation({
  args: {
    storageId: v.id('_storage'),
    ownerId: v.id('users'),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const existing = await ctx.db
      .query('fileMetadata')
      .withIndex('by_storage_id', q => q.eq('storageId', args.storageId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert('fileMetadata', {
      storageId: args.storageId,
      ownerId: args.ownerId,
      fileName: args.fileName,
      mimeType: args.mimeType,
      size: args.size,
      createdAt: now,
    });
  },
});

export const deleteByStorageId = internalMutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query('fileMetadata')
      .withIndex('by_storage_id', q => q.eq('storageId', args.storageId))
      .first();

    if (metadata) {
      await ctx.db.delete(metadata._id);
    }
  },
});

export const getAll = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('fileMetadata').paginate(args.paginationOpts);
  },
});
