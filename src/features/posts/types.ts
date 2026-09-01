export interface PostMedia {
  url: string;
  type: 'image' | 'video';
}

export interface CreatePostInput {
  title?: string;
  caption: string;
  media: PostMedia[];
  userId?: string;
}

export interface Post {
  id: string;
  media: PostMedia[];
  title?: string;
  caption: string;
  createdAt: number;
  updatedAt?: number;
  userId?: string;
  // Legacy fields for backward compatibility with existing local data
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  isPinned?: boolean;
  isArchived?: boolean;
}
