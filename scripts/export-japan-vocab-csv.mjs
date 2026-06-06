import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sourcePaths = [
  {
    path: resolve(projectRoot, 'src/data/tbics15PracticeVocab.ts'),
    tierTag: '',
  },
  {
    path: resolve(projectRoot, 'src/data/conferenceExpansionVocab.ts'),
    tierTag: 'practice-old',
  },
  {
    path: resolve(projectRoot, 'src/data/japanPresentationVocab.ts'),
    tierTag: 'practice-daily',
  },
];
const outputPath = resolve(projectRoot, 'data/japan-presentation-vocabulary.csv');

const blocks = sourcePaths.flatMap(source => {
  const fileSource = readFileSync(source.path, 'utf8');
  return [...fileSource.matchAll(/\{\s*id:\s*['"]([^'"]+)['"],[\s\S]*?enabled:\s*true\s*\}/g)].map(match => ({
    block: match[0],
    tierTag: source.tierTag,
  }));
});

function readString(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*['"]([^'"]*)['"]`));
  return match ? match[1] : '';
}

function readArray(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  if (!match) return '';

  return [...match[1].matchAll(/['"]([^'"]*)['"]/g)].map(item => item[1]).join(', ');
}

function appendTierTag(tags, tierTag) {
  if (!tierTag) return tags;

  const values = tags
    ? tags.split(',').map(value => value.trim()).filter(Boolean)
    : [];

  if (!values.includes(tierTag)) {
    values.push(tierTag);
  }

  return values.join(', ');
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

const rows = [
  [
    'id',
    'word',
    'part_of_speech',
    'definition',
    'example_sentence',
    'example_translation',
    'collocations',
    'level',
    'tags',
    'image_url',
    'enabled',
  ],
];

for (const { block, tierTag } of blocks) {
  const tags = appendTierTag(readArray(block, 'tags'), tierTag);

  rows.push([
    readString(block, 'id'),
    readString(block, 'word'),
    readString(block, 'partOfSpeech'),
    readString(block, 'definition'),
    readString(block, 'exampleSentence'),
    readString(block, 'exampleTranslation'),
    readArray(block, 'collocations'),
    readString(block, 'level'),
    tags,
    '',
    'TRUE',
  ]);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${rows.map(row => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');

console.log(`Exported ${blocks.length} rows to ${outputPath}`);

