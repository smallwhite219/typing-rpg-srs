import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sourcePaths = [
  resolve(projectRoot, 'src/data/japanPresentationVocab.ts'),
  resolve(projectRoot, 'src/data/conferenceExpansionVocab.ts'),
];
const outputPath = resolve(projectRoot, 'data/japan-presentation-vocabulary.csv');

const source = sourcePaths.map(sourcePath => readFileSync(sourcePath, 'utf8')).join('\n');
const blocks = [...source.matchAll(/\{\s*id:\s*'([^']+)',[\s\S]*?enabled:\s*true\s*\}/g)].map(match => match[0]);

function readString(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*'([^']*)'`));
  return match ? match[1] : '';
}

function readArray(block, key) {
  const match = block.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`));
  if (!match) return '';

  return [...match[1].matchAll(/'([^']*)'/g)].map(item => item[1]).join(', ');
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

for (const block of blocks) {
  rows.push([
    readString(block, 'id'),
    readString(block, 'word'),
    readString(block, 'partOfSpeech'),
    readString(block, 'definition'),
    readString(block, 'exampleSentence'),
    readString(block, 'exampleTranslation'),
    readArray(block, 'collocations'),
    readString(block, 'level'),
    readArray(block, 'tags'),
    '',
    'TRUE',
  ]);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${rows.map(row => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');

console.log(`Exported ${blocks.length} rows to ${outputPath}`);

