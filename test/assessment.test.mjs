import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DOMAINS, scoreAssessment, weakestWeightedBudget } from '../public/blueprint.mjs';
import { QUESTIONS } from '../public/questions.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('assessment has exactly 10 questions, 2 per domain', () => {
  assert.equal(QUESTIONS.length, 10);
  for (const d of DOMAINS) {
    assert.equal(QUESTIONS.filter(q => q.domain === d.id).length, 2, d.id);
  }
  for (const q of QUESTIONS) {
    assert.equal(q.options.length, 4, q.id);
    assert.ok(q.answer >= 0 && q.answer < 4, q.id);
    assert.ok(q.why.length > 20, `${q.id} needs a rationale`);
  }
});

test('a perfect answer key scores 10/10 with no weakest-domain regret', () => {
  const answers = Object.fromEntries(QUESTIONS.map(q => [q.id, q.answer]));
  const r = scoreAssessment(QUESTIONS, answers);
  assert.equal(r.correct, 10);
  assert.equal(r.unanswered, 0);
  for (const row of r.perDomain) assert.equal(row.correct, 2);
});

test('an all-wrong key scores 0/10; weakest tie-break picks highest weight', () => {
  const answers = Object.fromEntries(QUESTIONS.map(q => [q.id, (q.answer + 1) % 4]));
  const r = scoreAssessment(QUESTIONS, answers);
  assert.equal(r.correct, 0);
  assert.equal(r.weakest.id, 'orchestration', 'ties resolve toward the heavier-weighted domain');
});

test('missing answers are counted as unanswered, not wrong', () => {
  const r = scoreAssessment(QUESTIONS, { 'q-orch-1': 1 });
  assert.equal(r.unanswered, 9);
  assert.equal(r.correct, 1);
});

test('sample fixture scores 7/10 with orchestration weakest', async () => {
  const sample = JSON.parse(await readFile(`${root}examples/sample-assessment.json`, 'utf8'));
  const r = scoreAssessment(QUESTIONS, sample.answers);
  assert.equal(r.correct, 7);
  assert.equal(r.weakest.id, 'orchestration');
  // and the weakness-adjusted budget shifts hours toward orchestration
  const adjusted = weakestWeightedBudget(60, r);
  const orch = adjusted.find(b => b.domain.id === 'orchestration');
  assert.ok(orch.hours > 16.2, `orchestration boosted past its 27% share: ${orch.hours}h`);
});

test('unknown domain in a question throws rather than mis-scores', () => {
  const bad = [{ id: 'x', domain: 'nope', options: ['a'], answer: 0 }];
  assert.throws(() => scoreAssessment(bad, {}), /unknown domain/);
});
