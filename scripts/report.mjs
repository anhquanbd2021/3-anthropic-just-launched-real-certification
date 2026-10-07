// CLI report: the blueprint as data — weight table, a seeded scenario draw,
// and the sample assessment scored per domain.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DOMAINS, SCENARIOS, OUT_OF_SCOPE, EXAM,
  totalWeight, mulberry32, drawScenarios, drawCoverage,
  studyBudget, scoreAssessment, weakestWeightedBudget, validateBlueprint,
} from '../public/blueprint.mjs';
import { QUESTIONS } from '../public/questions.mjs';

const samplePath = fileURLToPath(new URL('../examples/sample-assessment.json', import.meta.url));
const sample = JSON.parse(readFileSync(samplePath, 'utf8'));
const seed = Number(process.env.SEED ?? 7);
const hours = Number(process.env.HOURS ?? 60);

const problems = validateBlueprint();
if (problems.length) {
  console.error('Blueprint data is invalid:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const bar = w => '#'.repeat(w) + '·'.repeat(Math.max(0, 27 - w));
console.log('CERT BLUEPRINT — Claude Certified Architect (Foundations)');
console.log(`Exam: ${EXAM.questions} MCQ / ${EXAM.minutes} min, ${EXAM.scenariosDrawn}-of-${EXAM.scenariosTotal} scenarios, scaled ${EXAM.scaleMin}-${EXAM.scaleMax}, pass ${EXAM.passingScaledScore}, valid ${EXAM.validityMonths} months`);
console.log('');
console.log('DOMAIN WEIGHTS (the market signal)');
for (const d of DOMAINS) {
  console.log(`  ${String(d.weight).padStart(2)}%  ${bar(d.weight)}  ${d.name}`);
}
console.log(`  Σ weights = ${totalWeight()}%`);
console.log('');
console.log('OUT OF SCOPE (the negative space)');
for (const item of OUT_OF_SCOPE) console.log(`  ✗ ${item}`);
console.log('');

const draw = drawScenarios(mulberry32(seed));
const drawnIds = new Set(draw.map(s => s.id));
console.log(`SCENARIO DRAW (seed=${seed}) — a sitting gets ${EXAM.scenariosDrawn} of ${SCENARIOS.length}`);
for (const s of SCENARIOS) {
  console.log(`  ${drawnIds.has(s.id) ? '▸ drawn   ' : '  sat out '} ${s.name}`);
}
console.log('  Coverage:');
for (const { domain, covered } of drawCoverage(draw)) {
  console.log(`    ${covered ? '✓' : '✗'} ${domain.name} (${domain.weight}%)`);
}
console.log('');

const result = scoreAssessment(QUESTIONS, sample.answers);
console.log(`SAMPLE ASSESSMENT — ${result.correct}/${result.total} correct (${result.unanswered} unanswered)`);
for (const row of result.perDomain) {
  console.log(`  ${row.correct}/${row.total}  ${row.domain.name}`);
}
console.log(`  Weakest domain: ${result.weakest.name} (${result.weakest.weight}% of the exam)`);
console.log('');
console.log(`STUDY BUDGET for ${hours}h — baseline ∝ weights vs. weakness-adjusted`);
const baseline = studyBudget(hours);
const adjusted = weakestWeightedBudget(hours, result);
for (let i = 0; i < DOMAINS.length; i++) {
  console.log(`  ${DOMAINS[i].name.padEnd(44)} ${baseline[i].hours.toFixed(1)}h → ${adjusted[i].hours.toFixed(1)}h`);
}
