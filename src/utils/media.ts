import { Story } from '../features/stories';
import { Post } from '../features/posts';

export function preloadFeedMedia(stories: Story[], posts: Post[]) {
  // Preload active and upcoming media items into browser cache for instant rendering
  stories.slice(0, 5).forEach((s) => {
    if (s.mediaType === 'image' && s.mediaUrl) {
      const img = new Image();
      img.src = s.mediaUrl;
    }
  });

  posts.slice(0, 5).forEach((p) => {
    const mediaList = p.media || (p.mediaUrl ? [{ url: p.mediaUrl, type: p.mediaType || 'image' }] : []);
    mediaList.forEach((m) => {
      if (m.type === 'image' && m.url) {
        const img = new Image();
        img.src = m.url;
      }
    });
  });
}
