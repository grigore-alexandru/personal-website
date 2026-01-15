const DRAFT_KEY_PREFIX = 'blog-draft-';

export function saveDraft<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(`${DRAFT_KEY_PREFIX}${key}`, serialized);
  } catch (error) {
    console.error('Error saving draft to localStorage:', error);
  }
}

export function loadDraft<T>(key: string): T | null {
  try {
    const serialized = localStorage.getItem(`${DRAFT_KEY_PREFIX}${key}`);
    if (serialized === null) {
      return null;
    }
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error('Error loading draft from localStorage:', error);
    return null;
  }
}

export function removeDraft(key: string): void {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${key}`);
  } catch (error) {
    console.error('Error removing draft from localStorage:', error);
  }
}

export function getAllDraftKeys(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        keys.push(key.replace(DRAFT_KEY_PREFIX, ''));
      }
    }
    return keys;
  } catch (error) {
    console.error('Error getting draft keys from localStorage:', error);
    return [];
  }
}
