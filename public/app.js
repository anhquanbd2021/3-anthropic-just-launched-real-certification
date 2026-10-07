import {
  DOMAINS, SCENARIOS, OUT_OF_SCOPE, EXAM,
  totalWeight, mulberry32, drawScenarios, drawCoverage,
  studyBudget, scoreAssessment, weakestWeightedBudget,
} from '/blueprint.mjs';
import { QUESTIONS } from '/questions.mjs';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ---- Lab 1: weight map + out-of-scope ----

$('#weight-sum').textContent = totalWeight();
const weightList = $('#weight-map');
for (const d of DOMAINS) {
  const li = el('li', 'weight-row');
  const head = el('div', 'weight-head');
  head.append(el('span', 'weight-name', d.name), el('span', 'weight-pct', `${d.weight}%`));
  const track = el('div', 'weight-track');
  const bar = el('div', 'weight-bar');
  bar.style.width = `${(d.weight / 27) * 100}%`;
  track.append(bar);
  li.append(head, track, el('p', 'muted', d.signal));
  weightList.append(li);
}
for (const item of OUT_OF_SCOPE) $('#out-of-scope').append(el('li', null, item));

// ---- Lab 2: scenario sampler ----

function renderDraw() {
  const seed = Number($('#seed').value) || 0;
  const draw = drawScenarios(mulberry32(seed));
  const drawnIds = new Set(draw.map(s => s.id));
  const list = $('#draw-list');
  list.replaceChildren();
  for (const s of draw) {
    const li = el('li', 'result pass');
    const head = el('div', 'result-head');
    head.append(el('span', 'badge pass', 'drawn'), el('strong', null, s.name));
    li.append(head, el('p', null, s.summary));
    list.append(li);
  }
  for (const s of SCENARIOS.filter(s => !drawnIds.has(s.id))) {
    const li = el('li', 'result info');
    const head = el('div', 'result-head');
    head.append(el('span', 'badge info', 'sat out'), el('strong', null, s.name));
    li.append(head);
    list.append(li);
  }
  const coverage = drawCoverage(draw);
  const chips = $('#coverage');
  chips.replaceChildren();
  let missed = 0;
  for (const { domain, covered } of coverage) {
    const chip = el('span', `chip ${covered ? 'covered' : 'missed'}`, `${domain.name.split(' ')[0]} ${domain.weight}%`);
    chip.title = covered ? `${domain.name} is exercised by this draw` : `${domain.name} is NOT exercised by this draw`;
    if (!covered) missed++;
    chips.append(chip);
  }
  $('#coverage-badge').textContent = missed === 0
    ? 'All 5 domains exercised'
    : `${missed} domain${missed > 1 ? 's' : ''} not exercised`;
}
$('#draw').addEventListener('click', renderDraw);
renderDraw();

// ---- Lab 3: self-assessment ----

const quiz = $('#quiz');
for (const [qi, q] of QUESTIONS.entries()) {
  const block = el('fieldset', 'question');
  const legend = el('legend', null, `${qi + 1}. ${q.stem}`);
  block.append(legend);
  for (const [oi, opt] of q.options.entries()) {
    const label = el('label', 'option');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = q.id;
    input.value = String(oi);
    label.append(input, el('span', null, opt));
    block.append(label);
  }
  block.append(el('p', 'why muted', ''));
  quiz.append(block);
}

$('#score').addEventListener('click', () => {
  const answers = {};
  for (const q of QUESTIONS) {
    const picked = document.querySelector(`input[name="${q.id}"]:checked`);
    if (picked) answers[q.id] = Number(picked.value);
  }
  const result = scoreAssessment(QUESTIONS, answers);
  const hours = Number($('#hours').value) || 60;

  for (const q of QUESTIONS) {
    const block = document.querySelector(`input[name="${q.id}"]`).closest('fieldset');
    const answered = answers[q.id] !== undefined;
    const correct = answered && answers[q.id] === q.answer;
    block.classList.toggle('correct', correct);
    block.classList.toggle('wrong', answered && !correct);
    block.querySelector('.why').textContent = !answered
      ? 'Unanswered'
      : correct ? `Correct — ${q.why}` : `Miss — ${q.why}`;
  }

  const verdict = $('#verdict');
  verdict.replaceChildren();
  for (const row of result.perDomain) {
    const li = el('li', `result ${row.correct === row.total ? 'pass' : row.correct === 0 ? 'fail' : 'warn'}`);
    const head = el('div', 'result-head');
    head.append(
      el('span', 'badge', `${row.domain.weight}% weight`),
      el('strong', null, row.domain.name),
      el('span', 'badge ' + (row.correct === row.total ? 'pass' : row.correct === 0 ? 'fail' : 'warn'), `${row.correct}/${row.total}`),
    );
    li.append(head);
    verdict.append(li);
  }
  $('#verdict-badge').textContent = result.unanswered
    ? `${result.correct}/${result.total} — ${result.unanswered} unanswered`
    : `${result.correct}/${result.total} — weakest: ${result.weakest.name.split(' ')[0]}`;

  const table = $('#budget-table');
  table.replaceChildren();
  const headRow = el('tr');
  headRow.append(el('th', null, 'Domain'), el('th', null, 'Weight'), el('th', null, 'Baseline hrs'), el('th', null, 'Weakness-adjusted hrs'));
  table.append(headRow);
  const baseline = studyBudget(hours);
  const adjusted = weakestWeightedBudget(hours, result);
  for (let i = 0; i < DOMAINS.length; i++) {
    const tr = el('tr');
    if (DOMAINS[i].id === result.weakest.id) tr.className = 'weakest-row';
    tr.append(
      el('td', null, DOMAINS[i].name),
      el('td', null, `${DOMAINS[i].weight}%`),
      el('td', null, baseline[i].hours.toFixed(1)),
      el('td', null, adjusted[i].hours.toFixed(1)),
    );
    table.append(tr);
  }
});
