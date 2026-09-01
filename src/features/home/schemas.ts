/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

// ============================================================================
// 1. PROTOCOL WHITELIST & URL VALIDATION
// ============================================================================

const SAFE_PROTOCOLS = new Set(['https:', 'http:', 'blob:', 'data:']);

/**
 * Validates dynamic media URLs to eliminate javascript: and unsafe URI XSS vectors.
 */
export function isValidMediaUrl(urlStr: unknown): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

// ============================================================================
// 2. ZOD RUNTIME SCHEMAS & TYPE CONTRACTS
// ============================================================================

export const StoryPayloadSchema = z.object({
  id: z.string().optional(),
  caption: z.string().trim().max(1000, 'Caption exceeds limit').optional(),
  mediaUrl: z.string().refine(isValidMediaUrl, { message: 'Invalid or unsafe media URL protocol' }),
  mediaType: z.enum(['image', 'video']).optional().default('image'),
  isPinned: z.boolean().optional().default(false),
  durationMs: z.number().positive().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export const PostPayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().max(100, 'Title exceeds limit').optional(),
  caption: z.string().trim().max(2000, 'Caption exceeds limit').optional(),
  media: z.array(z.object({
    url: z.string().refine(isValidMediaUrl, { message: 'Invalid media URL protocol' }),
    type: z.enum(['image', 'video'])
  })).optional().default([]),
  isPinned: z.boolean().optional().default(false),
  userId: z.string().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type StoryPayload = Readonly<z.infer<typeof StoryPayloadSchema>>;
export type PostPayload = Readonly<z.infer<typeof PostPayloadSchema>>;

// ============================================================================
// 3. PURE RUNTIME TYPE GUARDS
// ============================================================================

export function isStoryPayload(value: unknown): value is StoryPayload {
  return StoryPayloadSchema.safeParse(value).success;
}

export function isPostPayload(value: unknown): value is PostPayload {
  return PostPayloadSchema.safeParse(value).success;
}

export default {
  isValidMediaUrl,
  StoryPayloadSchema,
  PostPayloadSchema,
  isStoryPayload,
  isPostPayload,
};
