import { describe, it, expect } from 'vitest';
import { hasPermission, isResourceOwnerOrAdmin } from './auth';

describe('RBAC Authorization', () => {
  describe('hasPermission', () => {
    it('returns true if role has the requested permission', () => {
      expect(hasPermission('admin', 'post:create')).toBe(true);
      expect(hasPermission('admin', 'archive:delete')).toBe(true);
    });

    it('returns false if role does not have the permission', () => {
      expect(hasPermission('guest', 'post:create')).toBe(false);
      expect(hasPermission('customer', 'story:edit')).toBe(false);
    });

    it('returns false if role or permission is undefined', () => {
      expect(hasPermission(undefined, 'post:create')).toBe(false);
      expect(hasPermission('admin', undefined as any)).toBe(false);
    });
  });

  describe('isResourceOwnerOrAdmin', () => {
    it('returns true if role is admin regardless of author', () => {
      expect(isResourceOwnerOrAdmin('userA', 'userB', 'admin')).toBe(true);
      expect(isResourceOwnerOrAdmin(undefined, 'userB', 'admin')).toBe(true);
    });

    it('returns true if authorId matches currentUserId', () => {
      expect(isResourceOwnerOrAdmin('userA', 'userA', 'client')).toBe(true);
    });

    it('returns false if authorId does not match currentUserId and role is not admin', () => {
      expect(isResourceOwnerOrAdmin('userA', 'userB', 'client')).toBe(false);
    });

    it('returns false if ids are undefined', () => {
      expect(isResourceOwnerOrAdmin(undefined, 'userB', 'client')).toBe(false);
      expect(isResourceOwnerOrAdmin('userA', undefined, 'client')).toBe(false);
    });
  });
});
