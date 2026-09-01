/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StoryMediaType = 'image' | 'video';

export interface CreateStoryInput {
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption?: string;
  durationMs: number;
}

export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption: string;
  createdAt: number; // Unix timestamp in milliseconds
  expiresAt: number; // Unix timestamp in milliseconds
  isPinned?: boolean;
  isArchived?: boolean;
  userId?: string;
  authorId?: string;
  viewerCount?: number;
}

export interface ExpirationOption {
  readonly label: string;
  readonly durationMs: number;
}

export const ONE_HOUR_MS = 1 * 60 * 60 * 1000;
export const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
export const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const NO_EXPIRY_MS = Number.MAX_SAFE_INTEGER;

export const DEFAULT_EXPIRATION_OPTIONS: readonly ExpirationOption[] = [
  { label: '1 Hour', durationMs: ONE_HOUR_MS },
  { label: '6 Hours', durationMs: SIX_HOURS_MS },
  { label: '12 Hours', durationMs: TWELVE_HOURS_MS },
  { label: '24 Hours (1 Day)', durationMs: TWENTY_FOUR_HOURS_MS },
  { label: '48 Hours (2 Days)', durationMs: FORTY_EIGHT_HOURS_MS },
  { label: '7 Days', durationMs: SEVEN_DAYS_MS },
  { label: 'No Expiry', durationMs: NO_EXPIRY_MS },
] as const;

/**
 * Calculates whether a given story has passed its expiration window.
 */
export function isStoryExpired(story: Pick<Story, 'expiresAt'>, currentTime: number = Date.now()): boolean {
  if (!story || typeof story.expiresAt !== 'number') return false;
  if (story.expiresAt === NO_EXPIRY_MS) return false;
  return story.expiresAt <= currentTime;
}

/**
 * Helper to compute an absolute expiration timestamp given a duration in milliseconds.
 */
export function calculateStoryExpiresAt(durationMs: number, fromTime: number = Date.now()): number {
  if (durationMs === NO_EXPIRY_MS) {
    return NO_EXPIRY_MS;
  }
  return fromTime + Math.max(0, durationMs);
}
