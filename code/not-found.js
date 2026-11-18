// Notebook: Not found (2026-11-18). Prints every number on the page.
//
// Nothing here is simulated. The page's numbers are counts from two records:
//   1. The notes for the next night in EDITORIAL.md, 2026-11-12 to 2026-11-17: each time a
//      fetch tool's model-written summary called something missing (or gave a number) and
//      the exact text said otherwise. Each entry below carries a phrase copied from those
//      notes, and the script stops if the phrase isn't in the note of that date, so the
//      counts can't drift from the notes.
//   2. Tonight's test (2026-11-18): three fresh helpers asked the same plain question about
//      one guide, and two live cases met while reading and checking sources. The character counts are
//      the ones the fetch tool printed, relayed word for word by the helpers.
// Run: node code/not-found.js

'use strict';
const fs = require('fs');
const path = require('path');

const notes = fs.readFileSync(path.join(__dirname, '..', 'EDITORIAL.md'), 'utf8').split('\n');
// The phrase must sit in a note that starts with "- (date)", so a later note quoting it can't stand in.
function inNotes(date, phrase) {
  const ok = notes.some(line => line.startsWith('- (' + date + ')') && line.includes(phrase));
  if (!ok) throw new Error('Not in the ' + date + ' notes of EDITORIAL.md: ' + phrase);
  return phrase;
}

// ---------- 1. The record, as written in the notes
// Each reading: one fetch of one document, on one night, whose summary called these items
// missing. In every case the exact text, read later, had them.
const missing = [
  { night: '2026-11-12', doc: 'AHRQ n-of-1 guide (AAFP copy)',
    items: ['citation block', '"chronic, stable" sentence', 'washout text'],
    note: inNotes('2026-11-12', 'the citation block, the "chronic, stable" sentence and the washout text weren\'t there, and all three were') },
  { night: '2026-11-12', doc: 'FDA enrichment guidance (PDF)',
    items: ['section III'],
    note: inNotes('2026-11-12', 'a summary of the FDA PDF likewise said its section III was missing') },
  { night: '2026-11-15', doc: 'AHRQ n-of-1 guide (AAFP copy)',
    items: ['citation', 'unsuitable-conditions sentence'],
    note: inNotes('2026-11-15', 'the tool\'s summary again said the citation was "not found" and the unsuitable-conditions sentence "not seen", and both were there') },
  { night: '2026-11-16', doc: 'Andreadis 2021 (Springer PDF)',
    items: ['abstract', 'results'],
    note: inNotes('2026-11-16', 'the Springer PDF\'s summary said the abstract and results were missing') },
  { night: '2026-11-16', doc: 'JWGFVR verification page',
    items: ['reliability section'],
    note: inNotes('2026-11-16', 'the JWGFVR summary said the reliability section was "not present"') },
  { night: '2026-11-17', doc: 'Senn 2016 (PMC)',
    items: ['abstract', 'licence'],
    note: inNotes('2026-11-17', 'Its first fetch\'s summary said the abstract and the licence were missing; the verbatim re-fetch had both') },
];

// A summary that gave wrong numbers rather than a "missing".
const wrongNumber = [
  { night: '2026-11-14', doc: 'Gigerenzer et al. (course PDF)',
    said: ['150 gynecologists', 'a 25% question'], exact: ['160', '1%'],
    note: inNotes('2026-11-14', 'said "150 gynecologists" and a 25% question; the verbatim text says 160 and 1%') },
];

// Where the exact text stopped, as recorded on earlier nights (characters).
const exactStops = [
  { doc: 'JWGFVR verification page (second reader, 2026-11-16)', chars: 39946,
    note: inNotes('2026-11-16', 'each of its three fetches stopped at 39,946 characters') },
  { doc: 'Senn 2016 (PMC, 2026-11-17)', chars: 39943,
    note: inNotes('2026-11-17', '81,069 characters, read at offsets 0 and 39,943') },
  { doc: 'AHRQ guide (2026-11-15)', chars: 39890,
    note: inNotes('2026-11-15', 'read verbatim at offsets 0 and 39890') },
];

// ---------- 2. Tonight (2026-11-18)
// Three fresh helpers, same question, same document, nothing said about long pages:
// "Does the guide say which kinds of conditions or diseases n-of-1 trials are best suited to?"
// The tool's note, relayed word for word by all three: "331010 characters, truncated to the
// first 39890, then a model-extracted summary of the rest; the final 191120 characters were
// not read." and "...a model-extracted summary, for your request, of the remaining 291120
// characters (its final 191120 characters were not read at all)."
const test = {
  doc: 'AHRQ n-of-1 guide (AAFP copy)',
  found: [true, true, true], // each quoted the "chronic, stable, or slowly progressive" sentence
  total: 331010, exact: 39890, remaining: 291120, unread: 191120,
};

// Two live cases tonight, each caught because the helper had the exact text above the summary.
// (a) Reading a source for the page (Liu et al. 2024, ACL Anthology PDF): the tool's summary of
//     the part after the exact text said summarization was "Not mentioned anywhere in the text";
//     the exact text of the introduction lists "search and summarization" among the uses of
//     language models. A second reader confirmed the words in the exact text.
// (b) A second reader checking the page's quote from the AHRQ guide: the summary it got said the
//     exact phrase "does not appear in the text"; the exact text (first 39,890 characters) had it.
const live = [
  { night: '2026-11-18', doc: 'Liu et al. 2024 (ACL Anthology PDF)',
    items: ['summarization mentioned in the introduction'],
    total: 58136, exact: 39943, summarized: 18193 },
  { night: '2026-11-18', doc: 'AHRQ n-of-1 guide (AAFP copy), second reader',
    items: ['"applicable to chronic, stable, or slowly progressive conditions"'],
    total: 331010, exact: 39890, summarized: 100000 },
];
// Not counted: a summary that said a fetch "isn't truncated" when it was (a claim about the
// reading, not about the page), and one that said no sentence says longer inputs make the
// effect worse (a judgment about wording; see EDITORIAL.md, 2026-11-18).

// ---------- Counts
const pct = (a, b) => (100 * a / b);
const r = x => Math.round(x);

console.log('== The record, 2026-11-12 to 2026-11-17 (from EDITORIAL.md) ==');
const nights = [...new Set(missing.map(m => m.night))];
const docs = [...new Set(missing.map(m => m.doc))];
const items = missing.reduce((s, m) => s + m.items.length, 0);
console.log('Readings whose summary called something missing:', missing.length);
console.log('Distinct documents:', docs.length, '(the AHRQ guide twice)');
console.log('Nights:', nights.length, nights.join(', '));
console.log('Things called missing:', items, '; there when the exact text was read:', items, 'of', items);
console.log('Wrong-number summaries:', wrongNumber.length, 'on', wrongNumber.map(w => w.night).join(', '),
  '(' + wrongNumber[0].said.join(', ') + ' for ' + wrongNumber[0].exact.join(' and ') + ')');
console.log('Abstracts called missing:', missing.filter(m => m.items.includes('abstract')).length);
console.log('Readings where a summary said "not found" and was right: never recorded (unknown)');
console.log('Readings where a summary was wrong and nobody checked: unknown by definition');

console.log('\n== Where the exact text stopped (characters) ==');
const stops = exactStops.map(s => s.chars).concat([test.exact], live.map(c => c.exact));
console.log('Recorded stops:', stops.join(', '), '; min', Math.min(...stops), 'max', Math.max(...stops),
  '-> "about 40,000 characters"');

console.log('\n== Tonight: three fresh helpers, one question, the AHRQ guide ==');
const nFound = test.found.filter(Boolean).length;
console.log('Found the sentence:', nFound, 'of', test.found.length);
if (test.total - test.exact !== test.remaining) throw new Error('split does not add up');
const summarized = test.remaining - test.unread;
console.log('Total characters:', test.total);
console.log('Exact text:', test.exact, '=', pct(test.exact, test.total).toFixed(2) + '% ->', r(pct(test.exact, test.total)), 'in 100');
console.log('Model summary of the next:', summarized, '=', pct(summarized, test.total).toFixed(2) + '% ->', r(pct(summarized, test.total)), 'in 100');
console.log('Not read at all:', test.unread, '=', pct(test.unread, test.total).toFixed(2) + '% ->', r(pct(test.unread, test.total)), 'in 100');
console.log('Seen by the tool in any form:', test.exact + summarized, '=', pct(test.exact + summarized, test.total).toFixed(2) + '%');
console.log('Check: the three parts add to', test.exact + summarized + test.unread);

console.log('\n== Tonight: live cases ==');
for (const c of live) {
  console.log(c.doc + ': total', c.total, '; exact', c.exact, '(' + pct(c.exact, c.total).toFixed(1) + '%)',
    '; summarized', c.summarized, '; called missing:', c.items.join(', '));
}
if (live[0].total - live[0].exact !== live[0].summarized) throw new Error('Liu split does not add up');
if (live[1].total - live[1].exact - live[1].summarized !== test.unread) throw new Error('AHRQ split does not add up');
const liveItems = live.reduce((s, c) => s + c.items.length, 0);
console.log('Called missing tonight, and there:', liveItems, 'in', live.length, 'readings');

console.log('\n== All told, through tonight ==');
const allNights = new Set(nights.concat(live.map(c => c.night)));
console.log('Things called missing that were there:', items + liveItems,
  'in', missing.length + live.length, 'readings, on', allNights.size, 'nights');

console.log('\n== Quoted from Altman & Bland 1995, not computed ==');
console.log('Fibrinolytic overview: 5 of 24 trials significant on their own; together, a 22% reduction in mortality');

// ---------- The figure: one bar for the 331,010-character guide (x from 16 to 384)
console.log('\n== Figure geometry (viewBox 400 wide; bar from x=16 to x=384) ==');
const W = 368, x0 = 16;
const wExact = W * test.exact / test.total;
const wSumm = W * summarized / test.total;
const wUnread = W * test.unread / test.total;
console.log('exact   x=' + x0.toFixed(2) + ' w=' + wExact.toFixed(2));
console.log('summary x=' + (x0 + wExact).toFixed(2) + ' w=' + wSumm.toFixed(2));
console.log('unread  x=' + (x0 + wExact + wSumm).toFixed(2) + ' w=' + wUnread.toFixed(2));
