/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Centralized RBAC Authorization & Permission Verification Module
 */

import { type UserRole } from '../../types/user';
import { logger } from './logger';

// ============================================================================
// 1. IMMUTABLE PERMISSION CONTRACTS
// ============================================================================

export type AppPermission =
  | 'post:create'
  | 'post:edit'
  | 'post:delete'
  | 'post:pin'
  | 'post:archive'
  | 'story:create'
  | 'story:edit'
  | 'story:delete'
  | 'story:pin'
  | 'story:archive'
  | 'product:create'
  | 'product:edit'
  | 'product:delete'
  | 'hero:create'
  | 'hero:edit'
  | 'hero:delete'
  | 'hero:pin'
  | 'archive:view'
  | 'archive:restore'
  | 'archive:delete';

const ROLE_PERMISSIONS: Readonly<Record<UserRole, ReadonlyArray<AppPermission>>> = Object.freeze({
  admin: [
    'post:create',
    'post:edit',
    'post:delete',
    'post:pin',
    'post:archive',
    'story:create',
    'story:edit',
    'story:delete',
    'story:pin',
    'story:archive',
    'product:create',
    'product:edit',
    'product:delete',
    'hero:create',
    'hero:edit',
    'hero:delete',
    'hero:pin',
    'archive:view',
    'archive:restore',
    'archive:delete',
  ],
  client: [],
  customer: [],
  guest: [],
});

// ============================================================================
// 2. AUTHORIZATION & RBAC UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks whether a given role has the requested permission.
 */
export function hasPermission(role: UserRole | undefined, permission: AppPermission): boolean {
  if (!role || !permission) return false;

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[RBAC] Unrecognized user role encountered during permission check:', { role });
    }
    return false;
  }

  return permissions.includes(permission);
}

/**
 * Checks whether an entity belongs to the user or if the user holds admin privileges.
 */
export function isResourceOwnerOrAdmin(
  authorId: string | undefined,
  currentUserId: string | undefined,
  role: UserRole | undefined
): boolean {
  if (role === 'admin') return true;
  return Boolean(authorId && currentUserId && authorId === currentUserId);
}

export default {
  hasPermission,
  isResourceOwnerOrAdmin,
};