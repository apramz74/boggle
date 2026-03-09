#!/usr/bin/env node
/**
 * Generates a gzip+base64 compressed list of common English words
 * that exist in our game dictionary.
 *
 * Usage: node scripts/generate-common-words.js
 * Output: common-words.js (paste/import alongside dictionary.js)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

async function main() {
  // Step 1: Decompress our game dictionary to get VALID_WORDS
  const dictPath = path.join(__dirname, '..', 'dictionary.js');
  const dictContent = fs.readFileSync(dictPath, 'utf8');
  const match = dictContent.match(/const DICT_GZ_B64\s*=\s*'([^']+)'/);
  if (!match) throw new Error('Could not find DICT_GZ_B64 in dictionary.js');

  const dictBinary = Buffer.from(match[1], 'base64');
  const dictDecompressed = zlib.gunzipSync(dictBinary).toString('utf8');
  const validWords = new Set(dictDecompressed.split(','));
  console.log(`Dictionary has ${validWords.size} words`);

  // Step 2: Download a public word frequency list
  // Using the 10,000 most common English words list from MIT
  const url = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt';
  console.log(`Fetching frequency list from ${url}...`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  const text = await response.text();

  const freqWords = text.trim().split('\n').map(w => w.trim().toLowerCase()).filter(Boolean);
  console.log(`Frequency list has ${freqWords.length} words`);

  // Step 3: Filter to words in our dictionary, keeping frequency order
  // Words earlier in the list are more common
  const commonWords = [];
  for (const word of freqWords) {
    if (validWords.has(word) && word.length >= 3) {
      commonWords.push(word);
    }
  }
  console.log(`${commonWords.length} common words found in dictionary`);

  // Step 4: Take top ~6000 words (or all if fewer)
  const targetCount = 6000;
  const selected = commonWords.slice(0, targetCount);
  console.log(`Selected ${selected.length} words`);

  // Step 5: Gzip compress + base64 encode
  const csv = selected.join(',');
  const compressed = zlib.gzipSync(Buffer.from(csv, 'utf8'));
  const base64 = compressed.toString('base64');
  console.log(`Compressed size: ${base64.length} chars base64 (~${Math.round(base64.length / 1024)}KB)`);

  // Step 6: Write output file
  const outputPath = path.join(__dirname, '..', 'common-words.js');
  const output = `const COMMON_WORDS_GZ_B64 = '${base64}';\n`;
  fs.writeFileSync(outputPath, output);
  console.log(`Written to ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
