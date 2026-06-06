import type { WordData } from '../types/game';

export type PracticeGroup = 'core15' | 'complete15' | 'general' | 'research-method' | 'results-discussion' | 'technical';

function normalizedTags(word: WordData): string[] {
  return (word.tags || []).map(tag => tag.toLowerCase().trim());
}

function normalizedSearchText(word: WordData): string {
  return [
    word.id,
    word.word,
    word.partOfSpeech,
    word.definition,
    word.exampleSentence,
    ...(word.collocations || []),
    ...(word.tags || []),
  ].join(' ').toLowerCase();
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

export function getPracticeGroup(word: WordData): PracticeGroup {
  const tags = normalizedTags(word);

  if (tags.includes('practice-core')) return 'core15';
  if (tags.includes('practice-complete')) return 'complete15';

  const text = normalizedSearchText(word);

  if (/\b(ena|epistemic network|ancova|t-test|covariate|pre-test|post-test|quasi-experimental|participant|control group|experimental group|coding framework|coded|co-occurrence|metacognition|cognition|research question|method|analysis|network node)\b/.test(text)) {
    return 'research-method';
  }

  if (/\b(result|finding|significant|effect size|adjusted mean|outperform|learning gain|high-achieving|low-achieving|discussion|implication|limitation|future|conclusion|contribution|reflection|scaffold productively|teacher role|equitable)\b/.test(text)) {
    return 'results-discussion';
  }

  if (/\b(technical|framework|self-regulated|generative ai|artificial intelligence|learning analytics|cognitive network|pedagogical|regulatory)\b/.test(text)) {
    return 'technical';
  }

  return 'general';
}

export function getPracticeGroupLabel(group: PracticeGroup): string {
  switch (group) {
    case 'core15':
      return 'Core 15-min';
    case 'complete15':
      return 'Complete 15-min';
    case 'general':
      return 'General Vocabulary';
    case 'research-method':
      return 'Research & Method';
    case 'results-discussion':
      return 'Results & Discussion';
    case 'technical':
      return 'Technical Terms';
  }
}
