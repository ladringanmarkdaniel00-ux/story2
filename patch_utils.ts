import fs from 'fs';

const path = 'src/features/stories/utils.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace fetchStories
const oldFetch = `export async function fetchStories(signal?: AbortSignal): Promise<ReadonlyArray<Story>> {
  if (signal?.aborted) {
    const error = new Error('Fetch stories aborted');
    error.name = 'AbortError';
    throw error;
  }

  const rawList = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const list = rawList.filter(isStory).filter((s) => isValidMediaUrl(s.mediaUrl));
  const now = Date.now();
  const valid = sortStories(list.filter((s) => !s.expiresAt || s.expiresAt > now));

  // Prune expired or invalid stories in background storage
  if (valid.length !== rawList.length) {
    await saveToStorage(STORIES_KEY, valid);
  }

  return valid;
}`;

const newFetch = `export async function fetchStories(signal?: AbortSignal): Promise<ReadonlyArray<Story>> {
  if (signal?.aborted) {
    const error = new Error('Fetch stories aborted');
    error.name = 'AbortError';
    throw error;
  }

  const rawList = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const list = rawList.filter(isStory).filter((s) => isValidMediaUrl(s.mediaUrl));
  const now = Date.now();
  
  let needsSave = false;
  const processed = list.map(s => {
    if (s.expiresAt && s.expiresAt <= now && !s.isArchived) {
      needsSave = true;
      return { ...s, isArchived: true };
    }
    return s;
  });

  const valid = sortStories(processed);

  // Prune invalid stories or update auto-archived ones in background storage
  if (needsSave || valid.length !== rawList.length) {
    await saveToStorage(STORIES_KEY, valid);
  }

  return valid;
}`;

code = code.replace(oldFetch, newFetch);

// Replace createStory
const oldCreate = `export async function createStory(story: Story): Promise<void> {
  if (!isStory(story) || !isValidMediaUrl(story.mediaUrl)) {
    throw new Error('Invalid story payload or media protocol');
  }

  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const now = Date.now();
  const valid = current.filter((s) => s.id !== story.id && (!s.expiresAt || s.expiresAt > now));
  const updated = sortStories([story, ...valid]);
  await saveToStorage(STORIES_KEY, updated);
}`;

const newCreate = `export async function createStory(story: Story): Promise<void> {
  if (!isStory(story) || !isValidMediaUrl(story.mediaUrl)) {
    throw new Error('Invalid story payload or media protocol');
  }

  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const now = Date.now();
  const processed = current.map(s => {
    if (s.expiresAt && s.expiresAt <= now && !s.isArchived) {
      return { ...s, isArchived: true };
    }
    return s;
  });
  const valid = processed.filter((s) => s.id !== story.id);
  const updated = sortStories([story, ...valid]);
  await saveToStorage(STORIES_KEY, updated);
}`;

code = code.replace(oldCreate, newCreate);

// Replace updateStory
const oldUpdate = `export async function updateStory(story: Story): Promise<void> {
  if (!isStory(story) || !isValidMediaUrl(story.mediaUrl)) {
    throw new Error('Invalid story payload or media protocol');
  }

  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const now = Date.now();
  const valid = current.filter((s) => s.id !== story.id && (!s.expiresAt || s.expiresAt > now));
  const updated = sortStories([story, ...valid]);
  await saveToStorage(STORIES_KEY, updated);
}`;

const newUpdate = `export async function updateStory(story: Story): Promise<void> {
  if (!isStory(story) || !isValidMediaUrl(story.mediaUrl)) {
    throw new Error('Invalid story payload or media protocol');
  }

  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const now = Date.now();
  const processed = current.map(s => {
    if (s.expiresAt && s.expiresAt <= now && !s.isArchived) {
      return { ...s, isArchived: true };
    }
    return s;
  });
  const valid = processed.filter((s) => s.id !== story.id);
  const updated = sortStories([story, ...valid]);
  await saveToStorage(STORIES_KEY, updated);
}`;

code = code.replace(oldUpdate, newUpdate);

// Replace deleteStory
const oldDelete = `export async function deleteStory(id: string): Promise<void> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid story ID');
  }

  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const now = Date.now();
  const valid = current.filter((s) => s.id !== id && (!s.expiresAt || s.expiresAt > now));
  const updated = sortStories(valid);
  await saveToStorage(STORIES_KEY, updated);
}`;

const newDelete = `export async function deleteStory(id: string): Promise<void> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid story ID');
  }

  const current = (await getFromStorage<Story[]>(STORIES_KEY)) || [];
  const now = Date.now();
  const processed = current.map(s => {
    if (s.expiresAt && s.expiresAt <= now && !s.isArchived) {
      return { ...s, isArchived: true };
    }
    return s;
  });
  const valid = processed.filter((s) => s.id !== id);
  const updated = sortStories(valid);
  await saveToStorage(STORIES_KEY, updated);
}`;

code = code.replace(oldDelete, newDelete);

fs.writeFileSync(path, code);
