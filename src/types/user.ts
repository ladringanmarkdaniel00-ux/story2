export type UserRole = 'admin' | 'client' | 'customer' | 'guest';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: number;
}
