import { writeFileSync } from 'node:fs';

import {
  conferenceListeningItems,
} from '../../travel-english-planner/src/data/conference-listening.js';

const outputPath = new URL('../src/data/tbics15PracticeVocab.ts', import.meta.url);

const coreSections = new Set([
  'TBICS 15-min Core Vocabulary',
  'TBICS 15-min Sentence Patterns',
  'TBICS 15-min Script Sentences',
]);

const completeSections = new Set([
  'TBICS 15-min Complete Vocabulary',
  'TBICS 15-min Complete Sentence Patterns',
  'TBICS 15-min Complete Script Sentences',
]);

function inferPartOfSpeech(item) {
  if (item.type === 'sentence') return 'v.phr.';

  return /^(engage|focus|check|present|conduct|examine|investigate|integrate|outperform|scaffold)$/i.test(item.term)
    ? 'v.'
    : 'n.';
}

function collocations(item) {
  const source = item.practice || item.term;
  return [...new Set(String(source).split(';').map(value => value.trim()).filter(Boolean))].slice(0, 3);
}

function toWordData(items, prefix, tags) {
  return items.map((item, index) => ({
    id: `${prefix}_${String(index + 1).padStart(3, '0')}`,
    word: item.term,
    partOfSpeech: inferPartOfSpeech(item),
    definition: item.translation,
    exampleSentence: item.practice || item.term,
    exampleTranslation: item.translation,
    collocations: collocations(item),
    level: item.type === 'sentence' ? 'B2' : 'B2',
    tags,
    enabled: true,
  }));
}

function ts(value) {
  return JSON.stringify(String(value ?? ''));
}

function emitObject(word) {
  return `  {
    id: ${ts(word.id)},
    word: ${ts(word.word)},
    partOfSpeech: ${ts(word.partOfSpeech)},
    definition: ${ts(word.definition)},
    exampleSentence: ${ts(word.exampleSentence)},
    exampleTranslation: ${ts(word.exampleTranslation)},
    collocations: [${word.collocations.map(ts).join(', ')}],
    level: ${ts(word.level)},
    tags: [${word.tags.map(ts).join(', ')}],
    enabled: true
  }`;
}

function emitArray(name, items) {
  return `export const ${name}: WordData[] = [
${items.map(emitObject).join(',\n')}
];`;
}

const core = toWordData(
  conferenceListeningItems.filter(item => coreSections.has(item.section)),
  'tbics15_core',
  ['tbics-15min', 'practice-core', 'listening-typing-core', 'talper-presentation'],
);

const complete = toWordData(
  conferenceListeningItems.filter(item => completeSections.has(item.section)),
  'tbics15_complete',
  ['tbics-15min', 'practice-complete', 'talper-presentation'],
);

const output = `import type { WordData } from '../types/game';

${emitArray('tbics15CoreVocab', core)}

${emitArray('tbics15CompleteVocab', complete)}
`;

writeFileSync(outputPath, output, 'utf8');

console.log(JSON.stringify({
  core: core.length,
  complete: complete.length,
  total: core.length + complete.length,
}, null, 2));
