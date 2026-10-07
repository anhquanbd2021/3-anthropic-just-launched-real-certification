// Cert Blueprint — shared data + pure functions.
// Domain weights, scenario list, and out-of-scope topics reflect the public
// Claude Certified Architect — Foundations exam guide (March 2026).
// Unofficial educational summary — not affiliated with Anthropic.

export const DOMAINS = [
  {
    id: 'orchestration',
    name: 'Agentic Architecture & Orchestration',
    weight: 27,
    signal: 'The heaviest domain tests judgment calls, not syntax.',
    focus: [
      'When an agent should escalate to a human vs. retry',
      'Coordinator vs. subagent decomposition of a task',
      'Handling stop_reason correctly (end_turn, max_tokens, tool_use)',
      'Autonomy boundaries for irreversible actions',
    ],
  },
  {
    id: 'claude-code',
    name: 'Claude Code Configuration & Workflows',
    weight: 20,
    signal: 'Configuring the coding agent for a real repo and team.',
    focus: [
      'Project vs. user-level instructions (CLAUDE.md hierarchy)',
      'Permission modes and allowed-tools for CI vs. interactive use',
      'Repo conventions captured once, not re-prompted every session',
    ],
  },
  {
    id: 'prompting',
    name: 'Prompt Engineering & Structured Output',
    weight: 20,
    signal: 'Output you can machine-check, not prose you admire.',
    focus: [
      'Schemas and tool-use for structured extraction',
      'Enumerating allowed labels instead of free text',
      'Validation + retry loops for malformed output',
    ],
  },
  {
    id: 'tools',
    name: 'Tool Design & MCP Integration',
    weight: 18,
    signal: 'Tools are contracts — ambiguous results break agents.',
    focus: [
      'Tool result schemas with unambiguous success/error shape',
      'Right-sized tool granularity (a few clear tools, not one mega-tool)',
      'MCP server boundaries: what belongs in a tool vs. a prompt',
    ],
  },
  {
    id: 'context',
    name: 'Context Management & Reliability',
    weight: 15,
    signal: 'The scar-tissue domain: agents degrade as context fills.',
    focus: [
      'Compaction/summarization for long-running agents',
      'What belongs in context vs. a tool call vs. memory',
      'Retry caps and loop detection before runaway burn',
    ],
  },
];

export const SCENARIOS = [
  {
    id: 'support-agent',
    name: 'Customer Support Resolution Agent',
    summary: 'Autonomy boundaries, tool design, graceful degradation for a customer-facing agent.',
    domains: ['orchestration', 'tools', 'context'],
  },
  {
    id: 'code-generation',
    name: 'Code Generation with Claude Code',
    summary: 'Workflow configuration and repo-level context for generating production code.',
    domains: ['claude-code', 'context'],
  },
  {
    id: 'multi-agent-research',
    name: 'Multi-Agent Research System',
    summary: 'Coordinator patterns, parallel subagents, and result synthesis.',
    domains: ['orchestration', 'tools', 'context'],
  },
  {
    id: 'dev-productivity',
    name: 'Developer Productivity Agent',
    summary: 'Tool integration and workflow fit for an internal engineering assistant.',
    domains: ['tools', 'claude-code', 'orchestration'],
  },
  {
    id: 'claude-code-ci',
    name: 'Claude Code for CI',
    summary: 'An agent whose output gates a pipeline — wrongness propagates at machine speed.',
    domains: ['claude-code', 'prompting'],
  },
  {
    id: 'data-extraction',
    name: 'Structured Data Extraction',
    summary: 'Output schemas and validation — the workhorse where structure beats eloquence.',
    domains: ['prompting', 'context'],
  },
];

export const OUT_OF_SCOPE = [
  'Fine-tuning and model training',
  'Tokenization internals',
  'RLHF and alignment internals',
  'Embeddings and vector databases',
  'Model-parameter trivia (counts, sizes)',
  'Billing, quotas, and pricing mechanics',
  'Vision and computer-use internals',
];

export const EXAM = {
  questions: 60,
  minutes: 120,
  scenariosDrawn: 4,
  scenariosTotal: 6,
  passingScaledScore: 720,
  scaleMin: 100,
  scaleMax: 1000,
  validityMonths: 12,
};

const domainIds = new Set(DOMAINS.map(d => d.id));

export function totalWeight(domains = DOMAINS) {
  return domains.reduce((sum, d) => sum + d.weight, 0);
}

// Deterministic RNG (same mulberry32 used across sibling demos).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Draw `count` of the 6 scenarios, like a real exam sitting (4 of 6).
export function drawScenarios(rng = Math.random, count = EXAM.scenariosDrawn) {
  if (count < 1 || count > SCENARIOS.length) {
    throw new RangeError(`count must be 1..${SCENARIOS.length}`);
  }
  const pool = [...SCENARIOS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// Which domains does a drawn set of scenarios exercise?
export function drawCoverage(draw) {
  const covered = new Set();
  for (const s of draw) {
    for (const id of s.domains) covered.add(id);
  }
  return DOMAINS.map(d => ({ domain: d, covered: covered.has(d.id) }));
}

// Allocate study hours proportionally to domain weights.
// Returns hours rounded to 1 decimal; last domain absorbs rounding error
// so the total always equals `hours` exactly.
export function studyBudget(hours, domains = DOMAINS) {
  if (!(hours > 0)) throw new RangeError('hours must be positive');
  const total = totalWeight(domains);
  let allocated = 0;
  return domains.map((d, i) => {
    const last = i === domains.length - 1;
    const h = last
      ? Math.round((hours - allocated) * 10) / 10
      : Math.round((hours * d.weight / total) * 10) / 10;
    allocated += h;
    return { domain: d, hours: h };
  });
}

// Score a self-assessment: answers is { questionId: chosenIndex }.
// Returns per-domain tallies plus the weakest domain (lowest correct ratio;
// ties broken by higher exam weight — your weakest *important* domain first).
export function scoreAssessment(questions, answers) {
  const tally = new Map(DOMAINS.map(d => [d.id, { domain: d, correct: 0, total: 0 }]));
  for (const q of questions) {
    const row = tally.get(q.domain);
    if (!row) throw new Error(`unknown domain '${q.domain}' on question '${q.id}'`);
    row.total += 1;
    if (answers[q.id] === q.answer) row.correct += 1;
  }
  const rows = [...tally.values()];
  const unanswered = questions.filter(q => answers[q.id] === undefined).length;
  const weakest = rows.reduce((min, r) => {
    const ratio = r.total ? r.correct / r.total : 1;
    const minRatio = min.total ? min.correct / min.total : 1;
    if (ratio !== minRatio) return ratio < minRatio ? r : min;
    return r.domain.weight > min.domain.weight ? r : min;
  });
  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0);
  return {
    perDomain: rows,
    weakest: weakest.domain,
    correct: totalCorrect,
    total: questions.length,
    unanswered,
  };
}

// Suggest where the next study hours should go, given an assessment result:
// baseline proportional to weights, then double the weakest domain's share
// and renormalize.
export function weakestWeightedBudget(hours, result) {
  const boosted = DOMAINS.map(d => ({
    ...d,
    weight: d.id === result.weakest.id ? d.weight * 2 : d.weight,
  }));
  return studyBudget(hours, boosted);
}

export function validateBlueprint() {
  const problems = [];
  if (totalWeight() !== 100) problems.push(`weights sum to ${totalWeight()}, expected 100`);
  for (const s of SCENARIOS) {
    for (const id of s.domains) {
      if (!domainIds.has(id)) problems.push(`scenario '${s.id}' references unknown domain '${id}'`);
    }
  }
  if (SCENARIOS.length !== EXAM.scenariosTotal) {
    problems.push(`${SCENARIOS.length} scenarios listed, exam draws from ${EXAM.scenariosTotal}`);
  }
  return problems;
}
