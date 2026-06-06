import type { WordData } from '../types/game';

function normalizedTags(word: WordData): string[] {
  return (word.tags || []).map(tag => tag.toLowerCase().trim());
}

export function getDefaultPriorityLevel(word: WordData): number {
  const tags = normalizedTags(word);

  if (tags.includes('practice-core')) return 5;
  if (tags.includes('practice-complete')) return 4;
  if (tags.includes('practice-old')) return 3;
  if (tags.includes('practice-daily')) return 2;

  if (tags.some(tag => ['japan-trip', 'conference', 'talper-presentation', 'listening-typing-core'].includes(tag))) {
    return 3;
  }

  return 1;
}

export function getPracticeTier(word: WordData): 'core' | 'complete' | 'old' | 'daily' | 'basic' {
  const tags = normalizedTags(word);

  if (tags.includes('practice-core')) return 'core';
  if (tags.includes('practice-complete')) return 'complete';
  if (tags.includes('practice-old')) return 'old';
  if (tags.includes('practice-daily')) return 'daily';

  return 'basic';
}

export function getPracticeTierLabel(word: WordData): string {
  switch (getPracticeTier(word)) {
    case 'core':
      return '核心';
    case 'complete':
      return '全部';
    case 'old':
      return '舊單字';
    case 'daily':
      return '日常';
    case 'basic':
      return '基礎';
  }
}
