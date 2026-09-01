import fs from 'fs';

const path = 'src/features/stories/hooks/useStories.ts';
let code = fs.readFileSync(path, 'utf8');

const oldMemo = `  // Memoize active (unarchived) stories
  const activeStories = useMemo(() => {
    return stories.filter((s) => !s.isArchived);
  }, [stories]);`;

const newMemo = `  // Memoize active (unarchived and unexpired) stories
  const activeStories = useMemo(() => {
    const now = Date.now();
    return stories.filter((s) => !s.isArchived && (!s.expiresAt || s.expiresAt > now));
  }, [stories]);`;

code = code.replace(oldMemo, newMemo);
fs.writeFileSync(path, code);
