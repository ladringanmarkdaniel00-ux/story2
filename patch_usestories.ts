import fs from 'fs';

const path = 'src/features/stories/hooks/useStories.ts';
let code = fs.readFileSync(path, 'utf8');

const oldUseState = `  const [stories, setStories] = useState<ReadonlyArray<Story>>(() => {
    try {
      const cached = getFromLocal<Story[]>('local_stories') || [];
      const now = Date.now();
      return sortStories(cached.filter((s) => !s.expiresAt || s.expiresAt > now));
    } catch {
      return [];
    }
  });`;

const newUseState = `  const [stories, setStories] = useState<ReadonlyArray<Story>>(() => {
    try {
      const cached = getFromLocal<Story[]>('local_stories') || [];
      const now = Date.now();
      return sortStories(cached.map((s) => {
        if (s.expiresAt && s.expiresAt <= now && !s.isArchived) {
          return { ...s, isArchived: true };
        }
        return s;
      }));
    } catch {
      return [];
    }
  });`;

code = code.replace(oldUseState, newUseState);
fs.writeFileSync(path, code);
