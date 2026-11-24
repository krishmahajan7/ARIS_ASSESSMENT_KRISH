BAYWORK — WHO THE BAY AREA ENGINEERING MARKET FAILS, AND FIVE WAYS TO HELP THEM
===============================================================================

BayWork is a quarter-by-quarter model of hiring, attrition, layoffs, graduations, retirements and pay across the Bay
Area's engineering workforce. It simulates every engineer and manager individually: about 270,000 people at default
settings.

This version builds on the original simulator without changing its mechanism. I measured who the original market
fails, picked the personas to build for, and added five opt-in features: four policies and a Policy Lab to compare them.
With every new feature off, a run is identical to the original, number for number. A test checks this against an
untouched copy of the original engine on three seeds.

> README.txt is the same document in plain text, generated from this file by node tools/readme-txt.js.

---

1. RUN IT
---------

Open index.html in Chrome. There's no build step, no install and no network access; it works from file://.

See the improvements in under 3 minutes:

1. Press ▶ 3-minute demo at the top of the sidebar. It loads the All uplift preset and runs the Policy Lab's
   Compare: the original model against all four policies, same seed. Read the Who gains / Who loses lines.
2. The sidebar's Presets load one feature at a time (Original, All uplift, Fair-Chance, Warm Handoff,
   Handoff, cap-exempt, Bay Corridors, Retire-to-Mentor). "What to look at" under the presets lists where
   each feature shows up.

The original controls are unchanged:

- Start / Stop: the main button. [Space] also toggles.
- +1 quarter: steps through one quarter at a time.
- Speed: ½× to 8× (quarters per second).
- Map: scroll to zoom, drag to pan, ⤢ to reset.
  - Click an HQ for its org chart and hiring plan.
  - Click a city for its residents.
  - "Find a company" draws its commute shed: lines from where its people live to its HQ.
- Raw data: every engineer, company, city and quarter as sortable, filterable tables with CSV download. Click any
  row for detail, including an employee's career timeline.
- Summary: opens at the end of the run. It explains five findings with the run's own numbers, each with a one-click
  "Try".
- Opening any detail view pauses the run so the numbers hold still.

New in this version:

- Uplift features: a new sidebar group. All features are off by default.
- Policy Lab (top bar): a persona scorecard, Compare (baseline against your policy), stress tests and an
  autopilot.
- Visibility tab on the dashboard: who in the pool is being screened, and who actually gets offers.
- Bay Corridors bar under the map: draw or suggest shuttle corridors.
- New KPI cards: "Re-employed same quarter" and "Mentors active" (or "Grad first-year quits").

Tests and tools (Node 18 or later, no dependencies):

    node test/engine.test.js                 27 tests, about 2–3 minutes
    node tools/baseline.js                   persona metrics for one run (defaults: seed 42, 5 years, 200 companies)
    node tools/baseline.js '{"seed":7}'      any engine setting as JSON
    node tools/compare.js '{}' '{"fairScreening":1}'          reference vs. policy on seeds 42, 7, 123
    node tools/compare.js --small '{}' '{"warmHandoff":1}'    fast scale for tuning: 100 companies, 3 years, seeds 42, 7
    sh tools/final-tables.sh                 regenerates every table in this README (several minutes; output in tools/results/)
    node tools/headless.js                   loads index.html in headless Chrome from file://, clicks through, reports console errors

---

2. THE DIAGNOSIS: WHAT THE ORIGINAL MARKET DOES TO EACH GROUP
-------------------------------------------------------------

Run: node tools/compare.js '{}' '{"hireCapPct":8}' '{"slate":40}' '{"nearbyMiles":60}'. That's 200 companies and
5 years, as the mean of seeds 42, 7 and 123. The seeds agree to within about 1 point. Full output is in
tools/results/diagnosis.txt.

Definition used everywhere: "placed within 4 quarters" (≤4Q) = hired in the quarter the person started looking or in
the 3 quarters after it. Only job searches with 4 full quarters of follow-up count. An earlier figure of 44% for new
grads used a 5-quarter window (the entry quarter plus 4); on this stricter definition the same run gives 39.2%.

| Persona | What happens with the original rules (defaults) | Why, in the code |
|---|---|---|
| Everyone | Unemployment goes from 2.9% to 28.1% in 5 years (8.5, 13.7, 18.7, 23.5 at each year end). | Backfills count toward the 5%-a-quarter hiring cap, while large companies lose about 23% of their people a year. |
| Large companies | Headcount −22.7%. 43.7k reqs are unfilled at the end; most large companies end quarters at the cap. | The cap is the binding constraint: hireCapPct 8 brings unemployment to 9.5%. |
| New grads | Only 39.2% placed ≤4Q, taking 3.1 quarters to be hired. 20k are still looking at the end. | fill() sorts each slate by experience, most experienced first. Grads are on slates but rarely get an offer. With slate 40, grads placed ≤4Q collapse to 3.2%. |
| Job switchers | 60.5% placed ≤4Q. 50.7k are still looking at the end, the biggest group in the pool. | Their ask carries years of 10% raises that a seat growing 2% a year can't meet. |
| Laid off | 67.7% placed ≤4Q, but rehired at 74% of their old pay. | They ask 20% less, which makes them easy to hire and leaves a pay scar. |
| Long-term unemployed | 66% of the final pool has been looking for 4+ quarters. | All of the above. |
| Regions | The city unemployment gap (90th − 10th percentile city) is 21.2 points: North Bay 45%, Tri-Valley 37%, South Bay 20%. | Acceptance halves every 15 miles of commute, most jobs are in the South Bay, and nobody moves. nearbyMiles 60 shrinks the gap to 4.6 points but cuts grads placed ≤4Q to 9.4%, because distant experienced candidates now accept first. |
| Retirees | 27.9k retire and simply leave. | Each retirement opens a backfill that competes for the same cap. |

**What constrains every feature below: under the brief's cap, total hires are fixed at about 220k whatever else
changes.** A feature that changes who is hired helps one group at the expense of another. Only something that keeps
people employed, or that explicitly bypasses the cap (labelled as a policy lever), can lower overall unemployment much.
I report the losing groups for every feature.

---

3. PERSONAS I OPTIMISED FOR, AND WHY
------------------------------------

1. New grads. They're the worst-served group by placement rate, and the cause is mechanical: the offer order, not
   their fit for the seat.
2. Laid-off engineers. Tens of thousands are laid off while tens of thousands of reqs sit open at other companies.
   They're hired back fast, but cheaply and through a lottery.
3. People in far-out regions (North Bay, Tri-Valley), whose unemployment is about twice the South Bay's.
4. Retirees and the companies they leave: the brief lists retirees as a group, but the original gives them no role.
5. Large companies and startups as employers, measured by headcount against plan and by fill time.

Job switchers and experienced (10y+) candidates are tracked as personas too, mostly because they're **the groups
who pay** for some of these features. A policy that only reports its winners isn't honest about a capped market.

---

4. THE FIVE FEATURES
--------------------

All four policies are opt-in settings in the Uplift features sidebar group, plus one third constructor argument for
corridors. Each one changes only who is screened, where people go, or adds an explicit, labelled policy lever. None
changes the acceptance formula P = 75% × (offer ÷ ask)^4 × ½^(miles ÷ 15), the offer rule offer = min(ask, band),
the 5% hiring cap, or any other rule from the brief.

Every table below is at full scale (200 companies, 5 years), as the mean of seeds 42, 7 and 123, with the change for each
seed in brackets. "NET placed ≤4Q" adds the three pool cohorts together. If it stays flat while the group rows move in
opposite directions, the feature only moves jobs between groups.

Feature 1 — Fair-Chance Slates (screening by fit, plus a visibility audit)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Problem. Being screened isn't the bottleneck. At the end of a default run only about 3% of the pool has been left off
every slate for 4 quarters. But 55% of new grads looking for work have had no offer in 4 quarters, against 11–16%
of others. Recruiters work down each slate from the most experienced candidate, and the first acceptance ends the search.

Mechanism.
- Visibility audit (always on, bookkeeping only). Every person records how many slates they land on and how many
  offers reach them. The Visibility tab breaks down "no offer in 4 quarters" and "not on any slate" by status, by time
  looking and by region, with the Gini of offers and of screenings. The city tooltip shows the same counts.
- Fit ranking (fairScreening). Offers go first to the candidate most likely to accept this seat, using pay fit
  (offer ÷ ask)^4 from the unchanged formula. Near-ties go to the cheaper offer, then the closer level, then the
  smaller surplus of experience over what the seat needs. A small boost for time spent looking (fairIdleBoostPct,
  +30% at 8+ idle quarters) softens the cost to switchers and startups.
- Rotation (fairRotation) reserves 20% of each slate for the longest-idle eligible candidates.

Rules touched. Only the order of the slate in fill() (and, with rotation, which candidates are on it). The offer,
the acceptance formula and the cap are unchanged.

How I chose the ranking (2 rounds at 100 companies, 3 years).
- P(accept) including commute: grads +34pt, but the regional gap widens 9 points. Distance gets counted twice:
  closer people are ranked first and accept more often.
- Pay fit only: grads +44pt, the gap narrows 4.6 points, but startups −12pt.
- Pay fit plus idle boost (shipped): grads +38pt, gap −5.2 points, startups −6.7pt.
- Rotation on its own made things worse: NET −6.5k. Long-idle people are already on slates, and they're the least
  likely to accept. It's kept as a toggle, labelled that way.

node tools/compare.js '{}' '{"fairScreening":1}' '{"fairScreening":1,"fairRankDistance":1,"fairIdleBoostPct":0}' '{"fairRotation":1}'

| Metric | Baseline | Fair-Chance (shipped) | Δ vs baseline (seeds 42 / 7 / 123) | Fit incl. commute | Δ vs baseline (seeds 42 / 7 / 123) | Rotation only | Δ vs baseline (seeds 42 / 7 / 123) |
|---|----|----|----|----|----|----|----|
| Unemployment at end | 28.1% | 27.6% | −0.5pt (−0.5pt −0.5pt −0.7pt) | 27.6% | −0.5pt (−0.4pt −0.4pt −0.8pt) | 28.3% | +0.2pt (+0.4pt +0.0pt +0.1pt) |
| NET placed ≤4Q, all cohorts (count) | 155,548 | 147,560 | −7,989 (−8,429 −8,176 −7,361) | 161,061 | +5,513 (+5,014 +5,181 +6,344) | 149,086 | −6,463 (−6,718 −6,011 −6,659) |
| NET placed ≤4Q, all cohorts (share) | 59.5% | 56.3% | −3.2pt (−3.3pt −3.3pt −2.9pt) | 61.4% | +2.0pt (+1.8pt +1.7pt +2.4pt) | 56.9% | −2.5pt (−2.7pt −2.4pt −2.6pt) |
| New grads placed ≤4Q | 39.2% | 76.5% | +37.3pt (+37.8pt +37.1pt +37.1pt) | 77.6% | +38.5pt (+38.2pt +38.3pt +38.9pt) | 35.1% | −4.1pt (−3.9pt −3.8pt −4.5pt) |
| New grads: quarters to hire | 3.06q | 1.64q | −1.42q (−1.44q −1.42q −1.40q) | 1.34q | −1.72q (−1.71q −1.71q −1.73q) | 3.76q | +0.70q (+0.67q +0.67q +0.74q) |
| Laid off placed ≤4Q | 67.7% | 60.8% | −6.9pt (−7.3pt −6.9pt −6.6pt) | 65.2% | −2.6pt (−2.8pt −2.7pt −2.3pt) | 65.5% | −2.2pt (−2.5pt −2.0pt −2.1pt) |
| Laid off: quarters to hire | 1.98q | 2.31q | +0.33q (+0.35q +0.33q +0.31q) | 1.95q | −0.03q (−0.01q −0.03q −0.04q) | 2.11q | +0.13q (+0.14q +0.12q +0.13q) |
| Laid off: rehire pay ratio | 0.741 | 0.750 | +0.008 (+0.008 +0.008 +0.009) | 0.752 | +0.011 (+0.010 +0.011 +0.012) | 0.741 | −0.001 (−0.001 −0.001 −0.000) |
| Experienced 10y+ placed ≤4Q | 61.4% | 33.6% | −27.8pt (−28.1pt −27.9pt −27.4pt) | 42.1% | −19.3pt (−19.7pt −19.6pt −18.8pt) | 59.1% | −2.3pt (−2.6pt −2.1pt −2.2pt) |
| Switchers placed ≤4Q | 60.5% | 50.8% | −9.7pt (−9.8pt −9.8pt −9.4pt) | 57.0% | −3.5pt (−3.6pt −3.8pt −3.1pt) | 58.2% | −2.3pt (−2.4pt −2.3pt −2.3pt) |
| Pool idle 4+ quarters | 66.2% | 62.6% | −3.6pt (−3.7pt −3.3pt −4.0pt) | 68.5% | +2.3pt (+2.2pt +2.8pt +1.9pt) | 65.7% | −0.6pt (−0.5pt −0.5pt −0.7pt) |
| Large-company headcount change | -22.7% | -22.1% | +0.6pt (+0.5pt +0.6pt +0.7pt) | -22.1% | +0.6pt (+0.4pt +0.5pt +0.9pt) | -22.9% | −0.2pt (−0.4pt −0.0pt −0.1pt) |
| Startup headcount change | 31.5% | 26.7% | −4.9pt (−5.8pt −4.7pt −4.1pt) | 25.7% | −5.9pt (−7.7pt −4.7pt −5.2pt) | 31.8% | +0.3pt (+0.3pt −0.1pt +0.7pt) |
| Avg commute | 21.8mi | 22.1mi | +0.3mi (+0.3mi +0.3mi +0.3mi) | 19.5mi | −2.4mi (−2.3mi −2.4mi −2.4mi) | 21.9mi | +0.1mi (+0.2mi +0.1mi +0.1mi) |
| City unemployment gap p90−p10 | 21.2% | 14.2% | −6.9pt (−7.7pt −6.9pt −6.3pt) | 34.5% | +13.3pt (+13.0pt +12.9pt +14.0pt) | 19.3% | −1.9pt (−1.9pt −1.9pt −2.0pt) |
| Total hires | 220,168 | 220,432 | +264 (−5 +243 +553) | 220,405 | +237 (−77 +76 +711) | 219,840 | −329 (−715 +34 −305) |

Result. Fair-Chance does what it was built for. New grads placed ≤4Q go from 39% to 77% (+37 points), and
their wait halves (3.1 → 1.6 quarters). The regional gap narrows 6.9 points, the long-term-unemployed share falls
3.6 points, and unemployment falls 0.5 points. Every seed agrees.

The bill. The cap fixes total hires, so other groups pay:
- experienced 10y+ candidates −28 points placed ≤4Q;
- switchers −9.7 points;
- laid-off people −6.9 points;
- startups −4.9 points of headcount.

NET placements ≤4Q fall 3.2 points. Grads are placed fast, and everyone else waits longer. The variant that ranks by full
P(accept) including commute shows the trade-off clearly. It does better on NET (+2.0 points) and hurts experienced
candidates less (−19), but widens the regional gap by 13 points. I shipped the pay-fit ranking because it helps both
grads and the worst-off regions. The commute-weighted version is one toggle away (fairRankDistance). Rotation alone
helps nobody.

Verdict: a strong, targeted gain for new grads and lagging regions. It's paid for mostly by experienced job-seekers,
and that's labelled in the UI.

See it in the app. Choose the Fair-Chance preset, open the Visibility tab, and step a few quarters. Then use
the Policy Lab's Compare.

Feature 2 — Warm Handoff (layoff → same-quarter redeployment)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Problem. About 58k people are laid off over 5 years. In each layoff quarter they fall into a pool of about 80k where
hiring is a lottery, while about 40k reqs sit open at other companies.

Mechanism (warmHandoff). People are laid off exactly as before: same victims, same events, same 20% discount on
their ask. Then, after growth planning and before general hiring in the same quarter, each laid-off person (in layoff
order) is offered the best open seat at another company:
- the receiving HQ is within handoffRadiusMiles (25) of the old HQ;
- the seat is at their own level or one up;
- "best" means the highest P(accept) under the unchanged formula and offer rule;
- they get up to 3 offers, with one random draw each.

A placed person goes straight to employed with zero idle quarters, and the event log shows **"Redeployed (warm
handoff)"**. Frozen companies and the startup max are respected. handoffSharePct limits how many of each company's
laid-off people are offered a handoff.

Rules touched. None by default: **handoffCountsTowardCap = 1 (the default) counts handoff hires against the
receiving company's 5% cap**, which is fixed before the handoff runs, exactly as general hiring would fix it.
handoffCountsTowardCap = 0 is an explicit policy lever that lets redeployment bypass the cap. It's measured
separately and labelled that way everywhere.

node tools/compare.js '{}' '{"warmHandoff":1}' '{"warmHandoff":1,"handoffCountsTowardCap":0}'

| Metric | Baseline | Warm Handoff (cap counts) | Δ vs baseline (seeds 42 / 7 / 123) | Cap-exempt lever | Δ vs baseline (seeds 42 / 7 / 123) |
|---|----|----|----|----|----|
| Unemployment at end | 28.1% | 28.3% | +0.1pt (+0.3pt +0.0pt +0.0pt) | 19.8% | −8.4pt (−8.3pt −8.3pt −8.5pt) |
| NET placed ≤4Q, all cohorts (count) | 155,548 | 156,843 | +1,295 (+710 +1,427 +1,748) | 194,731 | +39,183 (+39,188 +38,614 +39,746) |
| NET placed ≤4Q, all cohorts (share) | 59.5% | 59.9% | +0.4pt (+0.2pt +0.4pt +0.6pt) | 71.8% | +12.4pt (+12.4pt +12.1pt +12.6pt) |
| New grads placed ≤4Q | 39.2% | 39.3% | +0.2pt (+0.3pt +0.1pt +0.0pt) | 55.7% | +16.6pt (+16.7pt +16.2pt +16.8pt) |
| New grads: quarters to hire | 3.06q | 3.01q | −0.06q (−0.07q −0.04q −0.06q) | 2.58q | −0.48q (−0.49q −0.46q −0.50q) |
| Laid off placed ≤4Q | 67.7% | 86.2% | +18.4pt (+18.1pt +18.4pt +18.8pt) | 91.5% | +23.7pt (+23.6pt +23.6pt +24.0pt) |
| Laid off: quarters to hire | 1.98q | 0.76q | −1.22q (−1.21q −1.22q −1.22q) | 0.54q | −1.44q (−1.43q −1.44q −1.45q) |
| Laid off: rehire pay ratio | 0.741 | 0.779 | +0.038 (+0.038 +0.038 +0.038) | 0.780 | +0.039 (+0.038 +0.039 +0.039) |
| Experienced 10y+ placed ≤4Q | 61.4% | 59.0% | −2.4pt (−2.7pt −2.3pt −2.1pt) | 69.5% | +8.2pt (+8.1pt +8.0pt +8.4pt) |
| Switchers placed ≤4Q | 60.5% | 54.8% | −5.7pt (−5.9pt −5.7pt −5.5pt) | 68.1% | +7.6pt (+7.6pt +7.3pt +7.9pt) |
| Pool idle 4+ quarters | 66.2% | 66.3% | +0.0pt (−0.1pt +0.2pt +0.0pt) | 54.5% | −11.7pt (−11.9pt −11.2pt −12.0pt) |
| Large-company headcount change | -22.7% | -22.8% | −0.1pt (−0.3pt −0.0pt −0.0pt) | -13.6% | +9.1pt (+9.0pt +9.0pt +9.3pt) |
| Startup headcount change | 31.5% | 31.1% | −0.4pt (−0.5pt +1.1pt −1.9pt) | 30.9% | −0.6pt (−1.8pt +1.2pt −1.2pt) |
| Avg commute | 21.8mi | 21.3mi | −0.5mi (−0.5mi −0.5mi −0.5mi) | 21.1mi | −0.7mi (−0.7mi −0.7mi −0.7mi) |
| City unemployment gap p90−p10 | 21.2% | 21.3% | +0.1pt (−0.2pt −0.7pt +1.2pt) | 19.3% | −1.9pt (−2.9pt −1.6pt −1.1pt) |
| Total hires | 220,168 | 219,907 | −261 (−560 −79 −144) | 257,407 | +37,238 (+37,146 +37,042 +37,527) |

Result (cap counts, the brief's rule). For laid-off people it's a clear gain:
- placed ≤4Q +18 points (68% → 86%);
- wait 2.0 → 0.8 quarters;
- rehired at 78% of their old pay instead of 74% (+3.8 points). They're placed before their ask decays.

Overall it's almost zero-sum. Unemployment doesn't change (+0.1 points) and NET placements rise only +0.4 points,
because the seats laid-off people take are seats switchers (−5.7 points) and experienced candidates (−2.4 points) would
have filled. As expected, the effect on the whole market is modest when the cap counts. What the handoff changes is
who waits, and the pay scar.

Result (cap-exempt lever). Unemployment 28.1% → 19.8% (−8.4 points), NET +39k placements, every pool cohort
better off, and large companies −22.7% → −13.6%. That's because it adds 37k hires the cap would otherwise forbid. It's a
policy choice (for example, a redeployment programme exempt from hiring freezes), not a free improvement, and it's
labelled that way.

See it in the app. Choose the Warm Handoff preset and press +1 quarter (the first quarter is a layoff
quarter):
- aqua arcs on the map go from the old HQ to the new HQ;
- the "Re-employed same quarter" card fills in;
- Flows → Who got hired shows a "Redeployed" series.

Feature 3 — Bay Corridors (draw shuttle lines on the map)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Problem. The regional gap is about 21 points. Most open seats are in the South Bay, acceptance halves every 15 miles
of commute, and nobody moves.

Mechanism. A corridor { from, to, cutPct = 40, spillMiles = 8 } cuts the effective commute miles between a home
city (and its neighbours within 8 miles) and a job city by 40%. It's symmetric, never goes below the 3-mile same-city
floor, and only ever shortens a distance. Corridors are passed as a third constructor argument, because
normalizeConfig keeps only numeric settings. With no corridors the distance table is untouched.

In the app:
- Draw corridor: click a home city, then a job city.
- Suggest 3: proposes the home → job city pairs with the most people looking (weighted by local unemployment) against
  open seats, where a corridor would most raise acceptance. It's computed from the current run.
- Corridors lock during a run, like the other settings.

The bar under the map shows:
- cost per quarter (assumption: $250k per corridor);
- commute hours per week (assumption: 2 trips a day, 5 days a week, 30 mph);
- CO₂ per quarter (assumption: 0.4 kg per vehicle mile);
- the city gap.

Commute hours and CO₂ are shown both with the corridors and for the same people on the original distances.

Rules touched. The distance table only. The acceptance formula is unchanged, so corridors reduce friction rather
than override the rule.

How I chose the suggestions (2 rounds). Ranking by the number of people looking picks the big cities (SF,
San Jose and Oakland to Mountain View). Weighting by the local unemployment rate changes nothing at the start of a run,
because everyone starts at 3%. The regional gap only develops over time, so suggestions are best made after a run.
The table uses the suggestions available at the start of a run, which is the conservative case.

node tools/compare.js '{}' '{"corridors":"suggest"}' '{"corridors":"suggest","fairScreening":1}'

| Metric | Baseline | 3 suggested corridors | Δ vs baseline (seeds 42 / 7 / 123) | Corridors + Fair-Chance | Δ vs baseline (seeds 42 / 7 / 123) |
|---|----|----|----|----|----|
| Unemployment at end | 28.1% | 28.3% | +0.1pt (+0.2pt +0.2pt −0.0pt) | 27.6% | −0.5pt (−0.3pt −0.5pt −0.8pt) |
| NET placed ≤4Q, all cohorts (count) | 155,548 | 156,010 | +462 (+48 +320 +1,018) | 146,931 | −8,618 (−9,146 −8,560 −8,147) |
| NET placed ≤4Q, all cohorts (share) | 59.5% | 59.6% | +0.2pt (+0.1pt −0.0pt +0.4pt) | 56.0% | −3.4pt (−3.6pt −3.5pt −3.2pt) |
| New grads placed ≤4Q | 39.2% | 36.5% | −2.6pt (−2.5pt −2.6pt −2.9pt) | 76.8% | +37.7pt (+37.6pt +38.0pt +37.4pt) |
| New grads: quarters to hire | 3.06q | 3.24q | +0.18q (+0.18q +0.17q +0.19q) | 1.63q | −1.43q (−1.43q −1.45q −1.40q) |
| Laid off placed ≤4Q | 67.7% | 68.3% | +0.5pt (+0.2pt +0.5pt +0.9pt) | 60.8% | −7.0pt (−7.3pt −7.0pt −6.6pt) |
| Laid off: quarters to hire | 1.98q | 1.95q | −0.03q (−0.03q −0.03q −0.03q) | 2.33q | +0.34q (+0.35q +0.34q +0.33q) |
| Laid off: rehire pay ratio | 0.741 | 0.742 | +0.000 (−0.000 +0.000 +0.001) | 0.750 | +0.009 (+0.008 +0.009 +0.009) |
| Experienced 10y+ placed ≤4Q | 61.4% | 62.5% | +1.2pt (+1.0pt +1.1pt +1.5pt) | 32.7% | −28.7pt (−28.8pt −28.6pt −28.5pt) |
| Switchers placed ≤4Q | 60.5% | 61.1% | +0.6pt (+0.5pt +0.3pt +0.9pt) | 50.4% | −10.1pt (−10.2pt −10.2pt −9.8pt) |
| Pool idle 4+ quarters | 66.2% | 66.2% | −0.1pt (−0.3pt +0.4pt −0.3pt) | 62.1% | −4.1pt (−4.2pt −3.8pt −4.4pt) |
| Large-company headcount change | -22.7% | -22.8% | −0.1pt (−0.2pt −0.2pt +0.0pt) | -22.1% | +0.6pt (+0.4pt +0.6pt +0.9pt) |
| Startup headcount change | 31.5% | 31.9% | +0.3pt (±0.0pt +0.9pt +0.1pt) | 26.8% | −4.7pt (−5.9pt −4.1pt −4.0pt) |
| Avg commute | 21.8mi | 20.5mi | −1.3mi (−1.2mi −1.3mi −1.3mi) | 20.7mi | −1.1mi (−1.0mi −1.1mi −1.1mi) |
| City unemployment gap p90−p10 | 21.2% | 21.5% | +0.3pt (+0.3pt −0.3pt +0.8pt) | 14.2% | −7.0pt (−8.0pt −7.2pt −5.7pt) |
| Total hires | 220,168 | 220,066 | −102 (−220 −209 +123) | 220,492 | +324 (−88 +251 +808) |

Result: this feature did not measurably help the group it targets. The three corridors suggested at the start of a
default run are San Jose → San Francisco, San Francisco → Mountain View and Oakland → Mountain View. They cut the
average commute by 1.3 miles (6%), with commute hours and CO₂ falling in proportion. But the **regional
unemployment gap doesn't move** (+0.3 points, with mixed signs across seeds), overall unemployment doesn't move, and
new grads lose 2.6 points: experienced candidates further away now accept first, the same effect as nearbyMiles 60
in the diagnosis.

Combined with Fair-Chance, the gap closes 7.0 points. That's the same as Fair-Chance alone (−6.9), so the corridors add
commute savings, not regional fairness.

My reading: a few corridors into the South Bay mostly help people who were already close to being hired. The
hardest-hit cities (North Bay, Tri-Valley) are on no suggested line at the start of a run, because their unemployment
hasn't built up yet. Drawing corridors from those cities is one click in the app, but I haven't measured it, and I
don't claim it works.

Verdict: shipped as a commute and emissions tool with honest numbers, and as a way to test corridor ideas in the Lab.
It's not a fix for regional unemployment.

See it in the app. Choose the Bay Corridors preset (purple lines), or draw your own. Watch the bar under the map,
then use the Policy Lab's Compare.

Feature 4 — Retire-to-Mentor (phased retirement)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Problem. About 2% of the workforce retires each year, the most experienced first. Each retirement removes an
experienced person at once and opens a backfill that competes for the 5% cap.

Mechanism (mentorSharePct, mentorQuarters). When an employed person is selected to retire, with probability
mentorSharePct they keep their seat as a mentor for mentorQuarters (4). So no backfill opens yet. Then they retire
for real through the normal path: backfill, retired status and event. Details:
- People in the pool who are selected retire as before.
- A selected mentor uses up that quarter's retirement draw, and is counted as retired only when they actually retire.
- Mentors are exempt from quitting, layoffs, promotion and being selected again.
- The timeline shows "Became a mentor".

The assumed effect (mentorAttritionCut, default 30%, an ASSUMPTION). New grads hired by a company that currently has
a mentor have their quit probability cut by 30% for their first 4 quarters.

Rules touched. Retirement timing for the mentoring share, and (by assumption) the quit rate of mentored grads. The
retirement rate and the cap are unchanged.

node tools/compare.js '{}' '{"mentorSharePct":50}' '{"mentorSharePct":50,"mentorAttritionCut":0}'

| Metric | Baseline | Mentor 50% | Δ vs baseline (seeds 42 / 7 / 123) | Mentor 50% with cut 0 (structural only) | Δ vs baseline (seeds 42 / 7 / 123) |
|---|----|----|----|----|----|
| Unemployment at end | 28.1% | 27.2% | −0.9pt (−0.8pt −0.8pt −1.1pt) | 27.5% | −0.6pt (−0.6pt −0.6pt −0.7pt) |
| NET placed ≤4Q, all cohorts (count) | 155,548 | 158,348 | +2,800 (+2,609 +2,859 +2,931) | 158,003 | +2,454 (+1,938 +2,814 +2,611) |
| NET placed ≤4Q, all cohorts (share) | 59.5% | 60.3% | +0.9pt (+0.8pt +0.8pt +1.0pt) | 60.1% | +0.6pt (+0.5pt +0.7pt +0.7pt) |
| New grads placed ≤4Q | 39.2% | 40.8% | +1.7pt (+1.9pt +1.9pt +1.2pt) | 40.4% | +1.2pt (+0.9pt +1.8pt +1.0pt) |
| Laid off placed ≤4Q | 67.7% | 68.5% | +0.8pt (+0.8pt +0.8pt +0.8pt) | 68.3% | +0.6pt (+0.4pt +0.7pt +0.6pt) |
| Switchers placed ≤4Q | 60.5% | 61.2% | +0.7pt (+0.7pt +0.6pt +1.0pt) | 61.0% | +0.5pt (+0.4pt +0.4pt +0.7pt) |
| Large-company headcount change | -22.7% | -21.0% | +1.7pt (+1.6pt +1.6pt +1.9pt) | -21.3% | +1.4pt (+1.3pt +1.4pt +1.4pt) |
| Startup headcount change | 31.5% | 30.8% | −0.7pt (−1.7pt −0.8pt +0.3pt) | 30.7% | −0.8pt (−1.9pt −0.6pt −0.1pt) |
| Unfilled reqs at end | 43,716 | 40,430 | −3,286 (−3,301 −2,737 −3,821) | 41,182 | −2,534 (−2,569 −2,355 −2,678) |
| Retirements | 27,875 | 25,746 | −2,129 (−2,186 −2,078 −2,124) | 25,757 | −2,118 (−2,079 −2,118 −2,156) |
| Retired + still mentoring at end | 27,875 | 28,049 | +174 (+175 +174 +174) | 28,051 | +176 (+177 +175 +176) |
| Grad hires: first-year quit rate | 14.1% | 10.2% | −3.9pt (−4.5pt −3.7pt −3.5pt) | 13.9% | −0.1pt (−0.7pt +0.2pt +0.1pt) |
| Open backfill reqs at end | 36,447 | 33,440 | −3,007 (−2,998 −2,489 −3,533) | 34,152 | −2,295 (−2,309 −2,155 −2,421) |
| Total hires | 220,168 | 223,156 | +2,988 (+2,777 +2,969 +3,218) | 222,853 | +2,684 (+2,429 +2,874 +2,750) |

Result. Mentoring half of all retirees gives:
- unemployment −0.9 points;
- +3k hires;
- large companies −22.7% → −21.0%;
- 3k fewer open backfill reqs;
- a small gain for every pool cohort (grads +1.7 points placed ≤4Q, laid off +0.8, switchers +0.7);
- grad first-year quits 14.1% → 10.2%.

Nobody loses except startups (−0.7 points, mixed signs across seeds). Retirements in the 5-year window are 2.1k lower
only because of timing. Retired plus still mentoring at the end is unchanged (+174), so the retirement rate is intact.

How much is my assumption? I re-ran with the assumed quit cut set to 0:
- The grad-retention gain is almost entirely the assumption. First-year quits fall −3.9 points with the 30% cut and
  −0.1 points without it.
- About 70–85% of the headcount and unemployment gains are structural and remain at a cut of 0: unemployment −0.6 of
  −0.9 points, large companies +1.4 of +1.7, hires +2.7k of +3.0k, backfill reqs −2.3k of −3.0k.

The structural mechanism: a mentor keeps their seat about a year longer, so their backfill doesn't compete for the 5% cap
and the cap goes to other hires. Grad retention through mentoring should therefore be read as *what would follow if
mentoring cut quits by 30%*, not as a finding. The UI says so next to the setting.

See it in the app. Choose the Retire-to-Mentor preset. The "Mentors active" card shows mentors, and grad
first-year quits with and without a mentor.

Feature 5 — Policy Lab (how the other four are seen)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A new overlay (js/ui/lab.js), opened from Policy Lab in the top bar, with four tabs:

1. Scorecard. Ten persona rows for the current run, each with a 0–100 score from one or two metrics, a bar and the
   numbers behind it: new grads, laid off, job switchers, experienced 10y+, long-term unemployed, large companies,
   startups, retirees & mentors, regions and commuters. Weights (0–3×) feed one overall score and apply in every
   tab. The score scales are heuristic and documented in js/metrics.js; they aren't a welfare measure.
2. Compare. Runs the same seed and settings twice:
   - Baseline: every uplift feature forced off, no corridors.
   - Your policy: your sidebar settings.

   Runs are chunked into about 30 ms slices on setTimeout, with a progress bar and Cancel, so the page never freezes.
   Web Workers don't run from file://. The baseline is cached per configuration. Results show persona deltas in green
   and red, a Who gains / Who loses line, the sum of persona changes, and every metric.
3. Stress tests. Engine setting shock: 1 is a recession (layoff rates ×2, funded growth frozen) and 2 is a hiring
   boom (funded growth ×2, cap ×1.5). The window is quarters 5–8 by default. The multipliers are assumptions. One click
   compares baseline and policy under the shock and says whether the policy still helps.
4. Autopilot. A fixed grid of 12 policy combinations (feature toggles and a few levels) runs on a smaller model
   (60 companies, 3 years, your seed). Each is scored with your weights, and the top 3 are shown with their persona deltas.
   Apply this policy copies one into the sidebar. It's cancellable, shows progress, and says plainly that it's a
   small grid search on a smaller model.

Runtime (measured in headless Chrome on the development laptop, which also had other Chrome windows busy).
- One full default run (200 companies, 5 years): 5–15 s.
- So Compare and Stress default to Quick scale (100 companies, 3 years), about 4–10 s per compare. Full scale is
  one click.
- The autopilot at 60 companies and 3 years takes about 11–20 s for all 12 policies plus a baseline.

The persona metrics live in one file, js/metrics.js, wrapped so the browser and Node use the same code. A test
checks that the tools and the page agree.

All four together
~~~~~~~~~~~~~~~~~

node tools/compare.js '{}' '{"fairScreening":1,"warmHandoff":1,"mentorSharePct":50,"corridors":"suggest"}' '{…same…,"handoffCountsTowardCap":0}'

| Metric | Baseline | All four (cap counts) | Δ vs baseline (seeds 42 / 7 / 123) | All four with cap-exempt handoff | Δ vs baseline (seeds 42 / 7 / 123) |
|---|----|----|----|----|----|
| Unemployment at end | 28.1% | 26.6% | −1.6pt (−1.4pt −1.7pt −1.6pt) | 18.4% | −9.8pt (−9.6pt −9.8pt −10.0pt) |
| NET placed ≤4Q, all cohorts (count) | 155,548 | 155,372 | −177 (−958 +638 −210) | 194,845 | +39,297 (+38,745 +39,078 +40,068) |
| NET placed ≤4Q, all cohorts (share) | 59.5% | 59.1% | −0.3pt (−0.6pt −0.0pt −0.3pt) | 71.8% | +12.4pt (+12.1pt +12.3pt +12.7pt) |
| New grads placed ≤4Q | 39.2% | 74.9% | +35.7pt (+35.5pt +36.5pt +35.2pt) | 91.3% | +52.1pt (+52.0pt +52.0pt +52.2pt) |
| New grads: quarters to hire | 3.06q | 1.64q | −1.42q (−1.42q −1.45q −1.39q) | 1.03q | −2.03q (−2.04q −2.04q −2.02q) |
| Laid off placed ≤4Q | 67.7% | 88.0% | +20.3pt (+20.1pt +20.3pt +20.4pt) | 92.1% | +24.4pt (+24.1pt +24.3pt +24.7pt) |
| Laid off: quarters to hire | 1.98q | 0.63q | −1.35q (−1.35q −1.35q −1.35q) | 0.46q | −1.52q (−1.51q −1.52q −1.53q) |
| Laid off: rehire pay ratio | 0.741 | 0.786 | +0.045 (+0.045 +0.045 +0.045) | 0.787 | +0.045 (+0.045 +0.045 +0.046) |
| Experienced 10y+ placed ≤4Q | 61.4% | 38.6% | −22.8pt (−23.2pt −22.7pt −22.5pt) | 48.8% | −12.6pt (−13.0pt −12.6pt −12.3pt) |
| Switchers placed ≤4Q | 60.5% | 46.0% | −14.5pt (−14.8pt −14.2pt −14.4pt) | 61.2% | +0.7pt (+0.5pt +0.6pt +1.0pt) |
| Pool idle 4+ quarters | 66.2% | 62.4% | −3.8pt (−3.8pt −3.8pt −3.9pt) | 51.6% | −14.6pt (−14.4pt −14.4pt −15.0pt) |
| Large-company headcount change | -22.7% | -20.3% | +2.3pt (+2.1pt +2.5pt +2.4pt) | -11.3% | +11.4pt (+11.2pt +11.4pt +11.6pt) |
| Startup headcount change | 31.5% | 25.6% | −5.9pt (−6.6pt −6.2pt −4.8pt) | 23.0% | −8.5pt (−11.1pt −8.8pt −5.7pt) |
| Avg commute | 21.8mi | 20.0mi | −1.8mi (−1.8mi −1.8mi −1.8mi) | 19.8mi | −2.0mi (−1.9mi −2.0mi −2.0mi) |
| City unemployment gap p90−p10 | 21.2% | 16.1% | −5.1pt (−6.1pt −5.9pt −3.2pt) | 12.5% | −8.7pt (−9.1pt −9.2pt −7.9pt) |
| Retired + still mentoring at end | 27,875 | 28,038 | +163 (+162 +164 +164) | 28,042 | +167 (+168 +166 +166) |
| Grad hires: first-year quit rate | 14.1% | 9.9% | −4.2pt (−4.4pt −4.0pt −4.1pt) | 9.9% | −4.1pt (−4.6pt −3.9pt −3.9pt) |
| Total hires | 220,168 | 223,458 | +3,290 (+2,804 +3,657 +3,409) | 259,415 | +39,247 (+38,928 +39,018 +39,795) |

With all four on and the brief's cap respected, the gains and costs add up roughly as you'd expect:
- new grads +36 points placed ≤4Q;
- laid off +20 points;
- unemployment −1.6 points;
- regional gap −5.1 points;
- commute −1.8 miles;
- grad first-year quits −4.2 points (assumption-driven).

Experienced 10y+ candidates (−23 points), switchers (−15) and startups (−6) pay for it, and NET placements are flat
(−0.3 points). It's a redistribution towards the groups the original market served worst.

With the cap-exempt handoff lever as well, unemployment falls 28.1% → 18.4% and switchers come back to even. Only
experienced candidates (−13) and startups (−8.5) are still worse off. That's the honest headline: under the brief's cap,
these policies decide who waits; only changing the cap decides how many.

---

5. ASSUMPTIONS (EVERY INVENTED NUMBER)
--------------------------------------

| Assumption | Value | Where | Why it's needed |
|---|---|---|---|
| Mentor effect on grad quits | −30% quit probability for 4 quarters | mentorAttritionCut | No data in the model on mentoring. Measured: it drives essentially all of Feature 4's grad-retention gain (see above). |
| Corridor cost | $250k per corridor per quarter | ASSUMPTIONS.corridorCostPerQuarter | Makes the trade-off visible. Not a real cost estimate. |
| Corridor effect | −40% effective commute miles; neighbours within 8 mi share it | cutPct, spillMiles | Stands in for a shuttle and hub cutting door-to-door time. |
| Commute hours | miles × 2 trips × 5 days ÷ 30 mph | ASSUMPTIONS | For a readable KPI only. |
| CO₂ | 0.4 kg per vehicle mile, one person per car | ASSUMPTIONS.kgCo2PerMile | For a readable KPI only. |
| Recession | layoff rates ×2, funded growth 0 for 4 quarters | shock = 1 | Makes a shock visible; not calibrated to a real cycle. |
| Boom | funded growth ×2, hiring cap ×1.5 for 4 quarters | shock = 2 | Same. |
| Fit-rank idle boost | up to +30% at 8+ idle quarters | fairIdleBoostPct | Tuned in 2 rounds to keep most of the grad gain while halving the harm to startups. |
| Persona score scales | e.g. large companies: −25% headcount → 0, +25% → 100 | js/metrics.js PERSONAS | Puts personas on one scale for weighting. Heuristic. |

The original model's own calibrated settings (pay bands, acceptance curve, slate size) are unchanged. They're described
in section 8.

---

6. LIMITATIONS AND HONEST NEGATIVES
-----------------------------------

- The hiring cap bounds everything. With backfills counting toward a 5%-a-quarter cap, total hires barely move.
  Fair-Chance, the cap-faithful Warm Handoff and Bay Corridors mainly move jobs between groups. The NET rows in the
  tables show it.
- Groups that get worse:
  - Fair-Chance: job switchers, laid-off people, experienced (10y+) candidates, and startups (smaller loss).
  - Warm Handoff (cap counts): job switchers and new grads lose the seats laid-off people take.
  - Corridors alone: new grads lose about 2 points, as more distant experienced candidates accept.
  - Exact sizes are in each table.
- Features that didn't help.
  - Slate rotation made placement worse. It's kept only as a labelled comparison.
  - Bay Corridors (three suggested lines) cut commutes 1.3 miles but did not narrow the regional gap, and cost new
    grads 2.6 points. They're shipped as a commute and emissions tool, not as a regional fix.
- What comes from assumptions.
  - The grad-retention benefit of Retire-to-Mentor comes almost entirely from the assumed 30% quit cut.
  - The cap-exempt handoff's large gains come from bypassing the cap. It's a policy choice, not a free improvement.
- Limited evidence. Three seeds at full scale, with tuning on two seeds at 100 companies and 3 years. The seeds agree
  closely (see the per-seed brackets), but it's still one model with hand-set parameters.
- What the model leaves out (unchanged from the original): nobody moves house, there's no remote work, companies'
  growth plans don't respond to the market, and distance is straight-line × 1.2.
- Runtime. A full run takes several seconds in the browser, so the Lab's default compare scale is smaller than the
  main run.

---

7. HOW AI WAS USED, AND THE THOUGHT PROCESS
-------------------------------------------

AI use. I built this with an AI coding assistant (Claude, in Claude Code) as a pair programmer. It read the codebase,
wrote and ran the measurement tools and tests, prototyped each feature, and drafted this README. I directed the
personas, the features and the constraints, and reviewed the trade-offs. Every number here comes from running the code.
The simulator itself contains no AI or machine learning, and makes no network calls. Everything in the app, including
the Policy Lab's scorecard and autopilot, is deterministic heuristics and a small grid search.

How I worked.
1. Measure before building. I wrote js/metrics.js and the compare tools first, then checked the claims I had
   (unemployment 3% → 28%, the cap as the binding constraint, the slate-40 collapse, commute and the regional gap). One
   correction surfaced: the regional fix (nearbyMiles 60) also wrecks grad placement. That shaped Features 1 and 3.
2. Keep the original reproducible. Every feature defaults off, and the new code consumes no random draws when it's
   off. I saved an untouched copy of the original engine (test/fixtures/engine.original.js), and a test compares every
   series field on three seeds.
3. At most 2 tuning rounds per feature at small scale, then ship the best option and record the trade-off.
4. Report losers. The NET placement line, the persona "who loses" line and the per-seed brackets exist so that a
   feature that only moves jobs between groups can't look like a win.

Considered and dropped.
- Raising the hiring cap or exempting backfills. That's the biggest lever by far (unemployment 28% → 9.5%), but it
  changes a rule from the brief. It stays as the original's toggle, and as the explicitly labelled cap-exempt handoff
  lever.
- Ranking by P(accept) including commute. It helped grads but widened the regional gap by 9–13 points. Kept as an
  off-by-default toggle.
- Moving people or companies, or adding remote work. They change the model's basic assumptions, so they were out of
  scope for "build on top, same mechanism".
- Web Workers for the Lab. They don't run from file://, so I used chunked setTimeout runs instead.

---

8. THE ORIGINAL MODEL (UNCHANGED)
---------------------------------

Map. About 50 cities from San Rafael and Concord down to Los Gatos, east to Pleasanton, with 2020 Census
populations. The shoreline, islands, freeways and bridges are traced by hand.

Companies. 500 Bay Area–headquartered companies:
- 100 named companies, whose Bay Area engineer counts are rough estimates, not sourced figures, placed at their HQ
  city.
- 150 synthetic growth-stage companies (30–140 engineers).
- 250 synthetic startups (≤ 25 people). Synthetic companies are labelled as such everywhere.

The simulation runs X of them: the X/2 largest plus X/2 startups (default X = 200, so every named company is
included).

Org charts. Every company starts as a 1:10 pyramid: E engineers → ⌈E/10⌉ managers → … → one head of engineering.

People. Each person has:
- a home city, drawn in proportion to population;
- a level and years of experience;
- a comp, and the comp of the seat they hold (the "band");
- a status: employed, new grad looking, switching jobs, laid off and looking, retired, or left the Bay Area.

The rules, as given (all configurable)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

| Rule | Implementation |
|---|---|
| X/2 large companies, X/2 startups; startups max 25 | Startups never exceed the cap (tested). |
| Hire ≤ 5% of headcount per quarter, minimum 5 | Applied per company per quarter. By default backfills count too. |
| Half-life 4 years (large), 2 years (startup) | Quarterly exit probability 1 − ½^(1/(4·half-life)): 4.2% and 8.3%. |
| 10% raise per year; 5% of comp hiring cost | Raises go to incumbents each Q1. Every hire costs 5% of the offer. |
| A fixed position's comp grows 2% per year | Bands and open reqs grow 2% each Q1. A backfill reopens the leaver's seat at its band. |
| New grads 3% of the working population per year | They arrive in Q3, or spread across the year (setting). |
| Retirements 2% per year | The most experienced are the likeliest to retire. |
| Layoffs 5% per year (large), 20% (startups), at random | One round a year (Q1 by default). Laid-off seats are eliminated. Option: lay off the most over-band people first. |
| Laid-off people take a 20% discount | They ask 80% of their last comp. |
| A closer candidate accepts at 2× the rate at equal comp | P(accept) = 75% × (offer ÷ ask)^4 × ½^(commute ÷ 15 mi). |

How a hire happens.
- Each open req screens 12 candidates from the pool and offers them in order: most experienced first in the original, or
  by fit with Fair-Chance.
- It offers each one their ask, capped at the band.
- Unfilled reqs raise their band 3% a quarter.
- Half of manager vacancies are filled by promoting from within.
- Candidates who stay idle lower their ask by 2% a quarter.

Quarter order. Raises (Q1), retirements, voluntary exits, the layoff round, graduates, growth plan, (Warm Handoff),
hiring, then the pool ages.

Interpretations I had to choose (original, still valid)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- "The remaining 1%." I read the brief's "3% grads in, 2% retire, remaining 1% laid off" as the net 1% of new supply
  each year. That 1% lands in the talent pool unless companies grow faster than they lay off.
- Does the 5% cap include backfills? The literal reading is yes, and that's the default. A large company loses about
  23% of its people a year, while a 5% quarterly cap lets it hire only about 20%. So big companies shrink about 22% over
  five years and unemployment climbs from 3% to about 28%. The toggle "Backfills count toward the cap" switches to the
  other reading.
- Funded growth. Large companies grow 5% a year; startups 40% a year up to their cap.
- Starting pool. 3% of the workforce starts out looking for work.
- Calibrated matching settings. The acceptance curve, slate size and offer escalation are calibrated so the market
  clears when the cap doesn't bind.

---

9. FILES
--------

    index.html               page shell (presets and demo, Policy Lab button, corridor bar)
    styles.css               light + dark themes, responsive
    js/data/*.js             cities, geography, the 500-company universe (unchanged)
    js/engine.js             the simulation (no DOM). New: Fair-Chance, Warm Handoff, Bay Corridors, Retire-to-Mentor,
                             stress shocks, visibility tracking. All opt-in.
    js/metrics.js            NEW persona metrics and scorecard, shared by the browser and Node
    js/ui/lab.js             NEW Policy Lab: scorecard, compare, stress tests, autopilot
    js/ui/charts.js          formatting and SVG charts (unchanged)
    js/ui/map.js             SVG map. New: corridor layer and drawing, warm-handoff arcs
    js/ui/overlays.js        company, city, raw data, employee timeline. New: Lab hook, new timeline events
    js/ui/insights.js        end-of-run summary (unchanged)
    js/app.js                controls, run loop, dashboard. New: Uplift group, Visibility tab, KPIs, corridors, presets
    test/engine.test.js      27 tests: the original 16, identical-to-original, and each feature's invariants
    test/fixtures/engine.original.js   the engine exactly as provided, for the identical-to-original test
    tools/metrics.js         Node entry for the metrics; runConfig()
    tools/baseline.js        one run, all persona metrics
    tools/compare.js         configs vs a reference on several seeds, with per-seed deltas
    tools/final-tables.sh    regenerates the README tables into tools/results/
    tools/md-table.js        compare output → Markdown table
    tools/headless.js        headless Chrome check over the DevTools protocol (no dependencies)
    tools/readme-txt.js      README.md → README.txt
    tools/results/           the measured outputs quoted in this README

