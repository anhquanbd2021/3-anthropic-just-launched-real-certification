# Cert Blueprint — companion demo

Interactive lab for the article *Anthropic's First Certification Is a Market
Signal Disguised as an Exam*. A vendor certification is a proxy — but the
published **blueprint** is real data: five weighted domains, six production
scenarios, and an out-of-scope list that says which knowledge commoditized.

Zero dependencies — Node 20+ only. The blueprint data and scoring engine are
plain ES modules shared by the browser UI, the CLI, and the test suite.

## Three labs

| Lab | What it proves |
|---|---|
| **Weight map** | Five domains ranked 27% → 15%. The narrow spread means no optional domain; the ranking means orchestration judgment outranks model knowledge. The out-of-scope list renders beside it — the negative space is also data. |
| **Scenario sampler** | Draws 4 of the 6 exam scenarios with a seeded RNG (the way a real sitting does) and shows which domains that draw exercises — a narrow draw can leave the heaviest domain untested. |
| **Self-assessment** | Ten judgment-call questions, two per domain, scored per domain. Then a study budget: baseline hours proportional to official weights, with the weakest domain's share doubled and renormalized. |

## Run it

```text
npm start        # serve the lab on :3000
npm test         # blueprint math + assessment scoring + server
npm run report   # CLI: weight table, seeded draw, scored sample assessment
npm run check    # both
```

`SEED` and `HOURS` env vars parameterize the CLI:
`SEED=42 HOURS=30 npm run report`.

## Examples

- `examples/sample-assessment.json` — a deliberately orchestration-weak answer
  set (scores 7/10); the report shows the heaviest domain getting boosted
  study hours.

## Honest limits

- Weights and scenario names reflect the **public exam guide** — an
  unofficial educational summary, not affiliated with or endorsed by
  Anthropic.
- The 10 questions are judgment-*style* approximations written for this lab,
  not real exam items; a high score is not a pass prediction.
- The exam is currently gated to Claude Partner Network member organizations;
  for most people the blueprint — not the badge — is the usable artifact.
- A blueprint shows what cert-makers decided to test, not what your specific
  role demands. Treat it as one signal among several.

This is an educational demo, not exam-prep software.
