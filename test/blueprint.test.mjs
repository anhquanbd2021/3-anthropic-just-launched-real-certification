import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOMAINS, SCENARIOS, OUT_OF_SCOPE, EXAM,
  totalWeight, mulberry32, drawScenarios, drawCoverage,
  studyBudget, weakestWeightedBudget, scoreAssessment, validateBlueprint,
} from '../public/blueprint.mjs';

test('blueprint data is internally consistent', () => {
  assert.deepEqual(validateBlueprint(), []);
});

test('the five domain weights sum to exactly 100', () => {
  assert.equal(DOMAINS.length, 5);
  assert.equal(totalWeight(), 100);
  assert.equal(DOMAINS[0].id, 'orchestration');
  assert.equal(DOMAINS[0].weight, 27, 'agentic architecture is the heaviest domain');
});

test('every scenario references only real domains, and there are 6', () => {
  assert.equal(SCENARIOS.length, EXAM.scenariosTotal);
  const ids = new Set(DOMAINS.map(d => d.id));
  for (const s of SCENARIOS) {
    assert.ok(s.domains.length >= 2, `${s.id} exercises multiple domains`);
    for (const id of s.domains) assert.ok(ids.has(id), `${s.id} -> ${id}`);
  }
});

test('drawScenarios returns 4 distinct scenarios, deterministically per seed', () => {
  const a = drawScenarios(mulberry32(42)).map(s => s.id);
  const b = drawScenarios(mulberry32(42)).map(s => s.id);
  assert.deepEqual(a, b);
  assert.equal(a.length, 4);
  assert.equal(new Set(a).size, 4);
  for (const id of a) assert.ok(SCENARIOS.some(s => s.id === id));
});

test('a different seed can produce a different draw', () => {
  const draws = new Set();
  for (let seed = 0; seed < 20; seed++) {
    draws.add(drawScenarios(mulberry32(seed)).map(s => s.id).sort().join(','));
  }
  assert.ok(draws.size > 1, 'draws should vary across seeds');
});

test('drawCoverage reports covered and missed domains', () => {
  const draw = SCENARIOS.filter(s => s.id === 'claude-code-ci' || s.id === 'data-extraction'
    || s.id === 'code-generation' || s.id === 'dev-productivity');
  const coverage = drawCoverage(draw);
  const byId = Object.fromEntries(coverage.map(c => [c.domain.id, c.covered]));
  assert.equal(byId['claude-code'], true);
  assert.equal(byId['prompting'], true);
  // this particular draw still covers everything via dev-productivity's tools
  assert.equal(byId['tools'], true);
  const onlyTwo = drawCoverage(SCENARIOS.slice(4, 6)); // ci + extraction
  const byId2 = Object.fromEntries(onlyTwo.map(c => [c.domain.id, c.covered]));
  assert.equal(byId2['orchestration'], false, 'a narrow draw can miss the heaviest domain');
  assert.equal(byId2['tools'], false);
});

test('drawScenarios rejects impossible counts', () => {
  assert.throws(() => drawScenarios(mulberry32(1), 0), RangeError);
  assert.throws(() => drawScenarios(mulberry32(1), 7), RangeError);
});

test('studyBudget splits hours proportionally and totals exactly', () => {
  const budget = studyBudget(60);
  assert.equal(budget.length, 5);
  const sum = budget.reduce((s, b) => s + b.hours, 0);
  assert.ok(Math.abs(sum - 60) < 1e-9, `sum ${sum}`);
  assert.equal(budget[0].hours, 16.2, '27% of 60h');
  assert.equal(budget.at(-1).hours, 9.0, '15% of 60h');
  for (const b of budget) assert.ok(b.hours > 0);
});

test('weakestWeightedBudget boosts the weakest domain', () => {
  const result = { weakest: DOMAINS.at(-1) }; // pretend context is weakest
  const adjusted = weakestWeightedBudget(100, result);
  const base = studyBudget(100);
  assert.ok(adjusted.at(-1).hours > base.at(-1).hours);
  const sum = adjusted.reduce((s, b) => s + b.hours, 0);
  assert.ok(Math.abs(sum - 100) < 1e-9);
});

test('out-of-scope list is non-empty and excludes model internals', () => {
  assert.ok(OUT_OF_SCOPE.length >= 5);
  assert.ok(OUT_OF_SCOPE.some(x => /parameter/i.test(x)));
});
