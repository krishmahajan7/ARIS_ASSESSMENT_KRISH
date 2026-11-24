# BayWork — who the Bay Area engineering market fails, and five ways to help them

## Summary

- **What I built:** I extended the BayWork simulator without changing its rules. With every new setting off, it gives exactly the original results.
- **Five uplift features:** Fair-Chance Slates, Warm Handoff, Bay Corridors, Retire-to-Mentor, and a Policy Lab that compares policies persona by persona.
- **Two scenarios the brief asked for:** outsourcing to India and AI automation (70% AI / 30% human). They're what-ifs, not improvements.
- **Main result:** under the brief's 5% hiring cap, total hires barely move. The policies decide **who** waits for a job, not **how many** wait.
- **Biggest numbers:** new grads placed within 4 quarters 39% → 77% with Fair-Chance. In the AI 70/30 scenario, unemployment goes from 28% to 54%.
- **See it in 3 minutes:** open `index.html` in Chrome and press **▶ 3-minute demo** at the top of the sidebar.

BayWork simulates hiring, attrition, layoffs, graduations, retirements and pay across the Bay Area's engineering
workforce, one quarter at a time. It models every engineer and manager individually: about 270,000 people.

> README.txt is the same document in plain text (generated with `node tools/readme-txt.js`).

---

## 1. How to run it

Open `index.html` in Chrome. There's no build step, no install and no network access; it works from `file://`.

**The 3-minute tour**
1. Press **▶ 3-minute demo**. It loads the **All uplift** preset (all four policies on) and compares it with the original
   model in the Policy Lab, same seed. Read the **Who gains / Who loses** lines.
2. Use the **Presets** in the sidebar to switch on one feature at a time: Original, All uplift, Fair-Chance, Warm Handoff,
   Handoff cap-exempt, Bay Corridors, Retire-to-Mentor, and the two scenarios, **Outsourcing** and **AI 70/30**. "What to
   look at" under the presets says where each one shows up.
3. For a scenario, choose its preset and open **Policy Lab → Compare** to see which groups lose.

**Original controls (unchanged):** Start/Stop (or <kbd>Space</kbd>), +1 quarter, speed, a zoomable map (click an HQ or
a city), Raw data tables with CSV download, and an end-of-run Summary.

**New in this version**
- **Uplift features** and **Scenarios**: two sidebar groups. Everything is off by default.
- **Policy Lab** (top bar): a scorecard, baseline-vs-policy compare, stress tests and an autopilot.
- **Visibility** tab on the dashboard: who is being screened, and who actually gets offers.
- **Bay Corridors** bar under the map: draw or suggest shuttle corridors.
- **New KPI cards**: "Re-employed same quarter", "Mentors active", "Roles outsourced to India" and "Roles automated by AI".

**Tests and tools** (Node 18 or later, no dependencies)

```
node test/engine.test.js                 29 tests (about 3 minutes)
node tools/baseline.js                   persona metrics for one run (seed 42, 5 years, 200 companies)
node tools/compare.js '{}' '{"fairScreening":1}'          baseline vs. a policy on seeds 42, 7, 123
node tools/compare.js --small '{}' '{"warmHandoff":1}'    fast scale: 100 companies, 3 years, seeds 42 and 7
sh tools/final-tables.sh                 regenerates every table in this README, scenarios included (output in tools/results/)
node tools/headless.js                   opens index.html in headless Chrome, clicks through it, reports console errors
```

---

## 2. The problem: what the original market does to each group

Command: `node tools/compare.js '{}' '{"hireCapPct":8}' '{"slate":40}' '{"nearbyMiles":60}'`, at 200 companies and
5 years, averaged over seeds 42, 7 and 123. The seeds agree to within about 1 point.

**One definition used everywhere.** "Placed within 4 quarters" (≤4Q) means hired in the quarter the person started
looking or in the next 3 quarters. Only job searches with 4 full quarters of follow-up count. An earlier figure of 44%
for new grads used a 5-quarter window; on this stricter definition the same run gives 39.2%.

| Group | What happens (default rules, 5 years) | Why |
|---|---|---|
| Everyone | Unemployment rises from **2.9% to 28.1%**. | Replacing leavers counts toward the 5%-a-quarter hiring cap, but large companies lose about 23% of their people a year. |
| Large companies | Headcount **−22.7%**; 43.7k jobs unfilled at the end. | The cap is the binding limit. Raising it to 8% brings unemployment to 9.5%. |
| New grads | Only **39.2%** placed ≤4Q; 20k still looking at the end. | Recruiters offer jobs to the most experienced candidate first. With bigger slates (40), grads placed ≤4Q fall to **3.2%**. |
| Job switchers | 60.5% placed ≤4Q; **50.7k still looking**, the biggest group. | Years of 10% raises push their asking pay above what a seat (growing 2% a year) can pay. |
| Laid off | 67.7% placed ≤4Q, but rehired at **74% of their old pay**. | They ask 20% less, so they're hired quickly but cheaply. |
| Long-term unemployed | **66%** of people looking have been looking 4+ quarters. | All of the above. |
| Regions | The city unemployment gap is **21.2 points**: North Bay 45%, South Bay 20%. | The chance of accepting halves every 15 miles of commute, and most jobs are in the South Bay. |
| Retirees | 27.9k retire and leave. | Each retirement opens a replacement job that competes for the same cap. |

(The "city gap" is the unemployment rate of the 90th-percentile city minus the 10th-percentile city, for cities with
200+ engineers.)

**What limits every feature:** under the cap, total hires stay at about 220k whatever else changes. So a feature that
changes *who* gets hired helps one group at another's expense. I report the losing groups for every feature.

---

## 3. Who I built for, and why these features

**Personas I optimised for**
1. **New grads**: the worst placement rate, caused by the offer order rather than by their fit for the job.
2. **Laid-off engineers**: tens of thousands laid off while tens of thousands of jobs sit open elsewhere.
3. **People in far-out regions** (North Bay, Tri-Valley): unemployment about twice the South Bay's.
4. **Retirees and the companies they leave**: the brief names retirees, but the original gives them no role.
5. **Employers** (large companies and startups): headcount against plan, and fill time.

I also track **job switchers** and **experienced (10+ years) candidates**, because they're the groups that pay for some of
these features.

**Why these features.** I chose Fair-Chance Slates, Warm Handoff, Bay Corridors, Retire-to-Mentor and the Policy Lab
because they change *how the market works*:
- who is seen by recruiters;
- where laid-off people go;
- who stays in work;
- how a policy is judged.

Adjusting a single number such as the hiring cap or the slate size is easy and common, and the diagnosis already shows
what it does. These features are new mechanisms that sit on top of the original rules. The results below show where they
work well (grads, laid-off people) and where they don't (corridors and regional unemployment).

**How every feature was built.** Each feature was tested and compared against the baseline *before* I integrated it:
1. I added tests for its rules.
2. I compared it with the baseline at small scale (100 companies, 3 years, seeds 42 and 7), in at most two tuning rounds.
3. I fixed the design.
4. I re-measured it at full scale (200 companies, 5 years, seeds 42, 7 and 123) for the tables below.

The two scenarios went through the same steps, without tuning rounds (one full-scale measurement).

Every feature and scenario is off by default and uses no random draws when off. So the original runs are reproduced exactly; a test
checks this against an untouched copy of the original engine.

---

## 4. The five features

None of the features changes the acceptance formula `P = 75% × (offer ÷ ask)^4 × ½^(miles ÷ 15)`, the offer rule
(offer = the candidate's ask, capped at the seat's pay band), or the 5% hiring cap. Each one changes only who is
screened, where people go, or adds a clearly labelled policy lever.

In the tables, "NET placed ≤4Q" adds new grads, laid-off people and job switchers together. If it stays flat while the
group rows move in opposite directions, the feature moves jobs between groups rather than adding jobs.

### Feature 1 — Fair-Chance Slates

**Problem.** Almost everyone looking for work is screened: only about 3% were left off every slate for 4 quarters. But
**55% of new grads had no job offer in 4 quarters**, against 11–16% of others. Recruiters work down each slate from the
most experienced candidate, and stop at the first acceptance.

**What it does**
- **Visibility audit** (always on, bookkeeping only). It counts how often each person is screened and how often they get
  an offer. The new **Visibility** tab shows "no offer in 4 quarters" by status, time looking and region.
- **Fit ranking** (`fairScreening`). It offers first to the candidate whose asking pay the seat can best meet. It uses
  the pay part of the unchanged acceptance formula, plus a small boost for time spent looking (`fairIdleBoostPct`, up to
  +30%).
- **Rotation** (`fairRotation`, off). It reserves 20% of each slate for the longest-idle people. It's kept only for
  comparison.

**What it changes in the engine:** only the order of offers in `fill()`. The offer and the acceptance formula are
unchanged.

**Key results** (full scale, 3 seeds)

| Measure | Baseline | Fair-Chance | Change |
|---|---:|---:|---:|
| New grads placed ≤4Q | 39.2% | 76.5% | **+37.3 pts** |
| City unemployment gap | 21.2% | 14.2% | **−6.9 pts** |
| Unemployment | 28.1% | 27.6% | −0.5 pts |
| Experienced 10y+ placed ≤4Q | 61.4% | 33.6% | **−27.8 pts** |
| Job switchers placed ≤4Q | 60.5% | 50.8% | −9.7 pts |
| NET placed ≤4Q (share) | 59.5% | 56.3% | −3.2 pts |

<details><summary>Full table (all metrics, per-seed changes)</summary>

Command: `node tools/compare.js '{}' '{"fairScreening":1}' '{"fairScreening":1,"fairRankDistance":1,"fairIdleBoostPct":0}' '{"fairRotation":1}'`

| Metric | Baseline | Fair-Chance (shipped) | Δ vs baseline (seeds 42 / 7 / 123) | Fit incl. commute | Δ vs baseline (seeds 42 / 7 / 123) | Rotation only | Δ vs baseline (seeds 42 / 7 / 123) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Unemployment at end | 28.1% | 27.6% | −0.5pt <sub>(−0.5pt −0.5pt −0.7pt)</sub> | 27.6% | −0.5pt <sub>(−0.4pt −0.4pt −0.8pt)</sub> | 28.3% | +0.2pt <sub>(+0.4pt +0.0pt +0.1pt)</sub> |
| NET placed ≤4Q, all cohorts <sub>(count)</sub> | 155,548 | 147,560 | −7,989 <sub>(−8,429 −8,176 −7,361)</sub> | 161,061 | +5,513 <sub>(+5,014 +5,181 +6,344)</sub> | 149,086 | −6,463 <sub>(−6,718 −6,011 −6,659)</sub> |
| NET placed ≤4Q, all cohorts <sub>(share)</sub> | 59.5% | 56.3% | −3.2pt <sub>(−3.3pt −3.3pt −2.9pt)</sub> | 61.4% | +2.0pt <sub>(+1.8pt +1.7pt +2.4pt)</sub> | 56.9% | −2.5pt <sub>(−2.7pt −2.4pt −2.6pt)</sub> |
| New grads placed ≤4Q | 39.2% | 76.5% | +37.3pt <sub>(+37.8pt +37.1pt +37.1pt)</sub> | 77.6% | +38.5pt <sub>(+38.2pt +38.3pt +38.9pt)</sub> | 35.1% | −4.1pt <sub>(−3.9pt −3.8pt −4.5pt)</sub> |
| New grads: quarters to hire | 3.06q | 1.64q | −1.42q <sub>(−1.44q −1.42q −1.40q)</sub> | 1.34q | −1.72q <sub>(−1.71q −1.71q −1.73q)</sub> | 3.76q | +0.70q <sub>(+0.67q +0.67q +0.74q)</sub> |
| Laid off placed ≤4Q | 67.7% | 60.8% | −6.9pt <sub>(−7.3pt −6.9pt −6.6pt)</sub> | 65.2% | −2.6pt <sub>(−2.8pt −2.7pt −2.3pt)</sub> | 65.5% | −2.2pt <sub>(−2.5pt −2.0pt −2.1pt)</sub> |
| Laid off: quarters to hire | 1.98q | 2.31q | +0.33q <sub>(+0.35q +0.33q +0.31q)</sub> | 1.95q | −0.03q <sub>(−0.01q −0.03q −0.04q)</sub> | 2.11q | +0.13q <sub>(+0.14q +0.12q +0.13q)</sub> |
| Laid off: rehire pay ratio | 0.741 | 0.750 | +0.008 <sub>(+0.008 +0.008 +0.009)</sub> | 0.752 | +0.011 <sub>(+0.010 +0.011 +0.012)</sub> | 0.741 | −0.001 <sub>(−0.001 −0.001 −0.000)</sub> |
| Experienced 10y+ placed ≤4Q | 61.4% | 33.6% | −27.8pt <sub>(−28.1pt −27.9pt −27.4pt)</sub> | 42.1% | −19.3pt <sub>(−19.7pt −19.6pt −18.8pt)</sub> | 59.1% | −2.3pt <sub>(−2.6pt −2.1pt −2.2pt)</sub> |
| Switchers placed ≤4Q | 60.5% | 50.8% | −9.7pt <sub>(−9.8pt −9.8pt −9.4pt)</sub> | 57.0% | −3.5pt <sub>(−3.6pt −3.8pt −3.1pt)</sub> | 58.2% | −2.3pt <sub>(−2.4pt −2.3pt −2.3pt)</sub> |
| Pool idle 4+ quarters | 66.2% | 62.6% | −3.6pt <sub>(−3.7pt −3.3pt −4.0pt)</sub> | 68.5% | +2.3pt <sub>(+2.2pt +2.8pt +1.9pt)</sub> | 65.7% | −0.6pt <sub>(−0.5pt −0.5pt −0.7pt)</sub> |
| Large-company headcount change | -22.7% | -22.1% | +0.6pt <sub>(+0.5pt +0.6pt +0.7pt)</sub> | -22.1% | +0.6pt <sub>(+0.4pt +0.5pt +0.9pt)</sub> | -22.9% | −0.2pt <sub>(−0.4pt −0.0pt −0.1pt)</sub> |
| Startup headcount change | 31.5% | 26.7% | −4.9pt <sub>(−5.8pt −4.7pt −4.1pt)</sub> | 25.7% | −5.9pt <sub>(−7.7pt −4.7pt −5.2pt)</sub> | 31.8% | +0.3pt <sub>(+0.3pt −0.1pt +0.7pt)</sub> |
| Avg commute | 21.8mi | 22.1mi | +0.3mi <sub>(+0.3mi +0.3mi +0.3mi)</sub> | 19.5mi | −2.4mi <sub>(−2.3mi −2.4mi −2.4mi)</sub> | 21.9mi | +0.1mi <sub>(+0.2mi +0.1mi +0.1mi)</sub> |
| City unemployment gap p90−p10 | 21.2% | 14.2% | −6.9pt <sub>(−7.7pt −6.9pt −6.3pt)</sub> | 34.5% | +13.3pt <sub>(+13.0pt +12.9pt +14.0pt)</sub> | 19.3% | −1.9pt <sub>(−1.9pt −1.9pt −2.0pt)</sub> |
| Total hires | 220,168 | 220,432 | +264 <sub>(−5 +243 +553)</sub> | 220,405 | +237 <sub>(−77 +76 +711)</sub> | 219,840 | −329 <sub>(−715 +34 −305)</sub> |

</details>

**How I tested it**
- **Tests:**
  - *"all uplift features off: identical to the original engine (seeds 42, 7, 123)"* compares every quarterly output with
    the original engine.
  - *"Fair-Chance: books, band and cap hold every quarter"* checks that every list stays consistent, no new hire is paid
    above band, and no company exceeds its cap.
  - *"Fair-Chance: new-grad placement within 4 quarters is not worse on average"* takes the mean over seeds 42, 7 and 123.
  - *"visibility: per-spell counts and shares stay in range"*.
- **Tuning (small scale, seeds 42 and 7):**
  - Ranking by full P(accept), *including* commute: grads +33.7 pts, but the city gap +9.0 pts.
  - Pay fit only: grads +43.6, gap −4.6, startups −12.0.
  - Pay fit plus the idle boost: grads +38.1, gap −5.2, startups −6.7, switchers −6.8.
  - Rotation alone, at full scale: NET −6.5k placements.
- **Full scale (seeds 42, 7, 123):** the table above. All seeds agree in sign.
- **Decision:**
  - **Kept pay fit plus the idle boost.** It helps grads *and* the worst-off regions.
  - Kept the commute-weighted version as an off-by-default toggle. It has a better NET (+2.0 pts) but widens the city
    gap by 13.3 pts.
  - Kept rotation only as a labelled comparison.
  - The cost to experienced candidates is labelled in the UI.

**See it:** choose the **Fair-Chance** preset, open the **Visibility** tab, and step a few quarters.

### Feature 2 — Warm Handoff

**Problem.** About 58k people are laid off over 5 years. They join a pool of about 80k where hiring is a lottery, while
about 40k jobs are open at other companies.

**What it does** (`warmHandoff`)
- Layoffs happen exactly as before.
- In the same quarter, *before general hiring*, each laid-off person is offered the best open job at another company:
  - the HQ is within 25 miles of their old HQ;
  - the job is at their level or one up;
  - "best" means the highest chance of acceptance under the unchanged formula;
  - they get up to 3 offers.
- If they accept, they're employed again with no time out of work. The timeline shows "Redeployed".
- By default **handoff hires count toward the receiving company's 5% cap** (`handoffCountsTowardCap = 1`), which is the
  brief's rule. Setting it to 0 is a labelled **policy lever** that lets redeployment bypass the cap.

**Key results** (full scale, 3 seeds)

| Measure | Baseline | Warm Handoff | Change |
|---|---:|---:|---:|
| Laid off placed ≤4Q | 67.7% | 86.2% | **+18.4 pts** |
| Laid off: quarters to rehire | 1.98 | 0.76 | **−1.22** |
| Laid off: rehired at % of old pay | 74.1% | 77.9% | +3.8 pts |
| Job switchers placed ≤4Q | 60.5% | 54.8% | −5.7 pts |
| Unemployment | 28.1% | 28.3% | +0.1 pts |
| Unemployment, *cap-exempt lever* | 28.1% | 19.8% | −8.4 pts |

<details><summary>Full table (all metrics, per-seed changes)</summary>

Command: `node tools/compare.js '{}' '{"warmHandoff":1}' '{"warmHandoff":1,"handoffCountsTowardCap":0}'`

| Metric | Baseline | Warm Handoff (cap counts) | Δ vs baseline (seeds 42 / 7 / 123) | Cap-exempt lever | Δ vs baseline (seeds 42 / 7 / 123) |
|---|---:|---:|---:|---:|---:|
| Unemployment at end | 28.1% | 28.3% | +0.1pt <sub>(+0.3pt +0.0pt +0.0pt)</sub> | 19.8% | −8.4pt <sub>(−8.3pt −8.3pt −8.5pt)</sub> |
| NET placed ≤4Q, all cohorts <sub>(count)</sub> | 155,548 | 156,843 | +1,295 <sub>(+710 +1,427 +1,748)</sub> | 194,731 | +39,183 <sub>(+39,188 +38,614 +39,746)</sub> |
| NET placed ≤4Q, all cohorts <sub>(share)</sub> | 59.5% | 59.9% | +0.4pt <sub>(+0.2pt +0.4pt +0.6pt)</sub> | 71.8% | +12.4pt <sub>(+12.4pt +12.1pt +12.6pt)</sub> |
| New grads placed ≤4Q | 39.2% | 39.3% | +0.2pt <sub>(+0.3pt +0.1pt +0.0pt)</sub> | 55.7% | +16.6pt <sub>(+16.7pt +16.2pt +16.8pt)</sub> |
| New grads: quarters to hire | 3.06q | 3.01q | −0.06q <sub>(−0.07q −0.04q −0.06q)</sub> | 2.58q | −0.48q <sub>(−0.49q −0.46q −0.50q)</sub> |
| Laid off placed ≤4Q | 67.7% | 86.2% | +18.4pt <sub>(+18.1pt +18.4pt +18.8pt)</sub> | 91.5% | +23.7pt <sub>(+23.6pt +23.6pt +24.0pt)</sub> |
| Laid off: quarters to hire | 1.98q | 0.76q | −1.22q <sub>(−1.21q −1.22q −1.22q)</sub> | 0.54q | −1.44q <sub>(−1.43q −1.44q −1.45q)</sub> |
| Laid off: rehire pay ratio | 0.741 | 0.779 | +0.038 <sub>(+0.038 +0.038 +0.038)</sub> | 0.780 | +0.039 <sub>(+0.038 +0.039 +0.039)</sub> |
| Experienced 10y+ placed ≤4Q | 61.4% | 59.0% | −2.4pt <sub>(−2.7pt −2.3pt −2.1pt)</sub> | 69.5% | +8.2pt <sub>(+8.1pt +8.0pt +8.4pt)</sub> |
| Switchers placed ≤4Q | 60.5% | 54.8% | −5.7pt <sub>(−5.9pt −5.7pt −5.5pt)</sub> | 68.1% | +7.6pt <sub>(+7.6pt +7.3pt +7.9pt)</sub> |
| Pool idle 4+ quarters | 66.2% | 66.3% | +0.0pt <sub>(−0.1pt +0.2pt +0.0pt)</sub> | 54.5% | −11.7pt <sub>(−11.9pt −11.2pt −12.0pt)</sub> |
| Large-company headcount change | -22.7% | -22.8% | −0.1pt <sub>(−0.3pt −0.0pt −0.0pt)</sub> | -13.6% | +9.1pt <sub>(+9.0pt +9.0pt +9.3pt)</sub> |
| Startup headcount change | 31.5% | 31.1% | −0.4pt <sub>(−0.5pt +1.1pt −1.9pt)</sub> | 30.9% | −0.6pt <sub>(−1.8pt +1.2pt −1.2pt)</sub> |
| Avg commute | 21.8mi | 21.3mi | −0.5mi <sub>(−0.5mi −0.5mi −0.5mi)</sub> | 21.1mi | −0.7mi <sub>(−0.7mi −0.7mi −0.7mi)</sub> |
| City unemployment gap p90−p10 | 21.2% | 21.3% | +0.1pt <sub>(−0.2pt −0.7pt +1.2pt)</sub> | 19.3% | −1.9pt <sub>(−2.9pt −1.6pt −1.1pt)</sub> |
| Total hires | 220,168 | 219,907 | −261 <sub>(−560 −79 −144)</sub> | 257,407 | +37,238 <sub>(+37,146 +37,042 +37,527)</sub> |

</details>

**How I tested it**
- **Tests:**
  - *"Warm Handoff: books, band, cap and startup max hold; redeployed people never sit idle"* checks every quarter: lists
    stay consistent, no redeployed person is paid above band or has idle quarters, no company exceeds its cap, and no
    startup exceeds 25 people.
  - *"Warm Handoff: cap-exempt lever hires more than the faithful reading"*.
  - The identical-to-original test covers the off state.
- **Small scale (seeds 42 and 7):** laid off +11.7 pts and switchers −4.7 pts with the cap counting; unemployment −5.1 pts
  with the cap-exempt lever. One round was enough.
- **Full scale (seeds 42, 7, 123):** the table above.
- **Decision:**
  - **Kept the cap-counting default.** It's a real gain for laid-off people, but almost zero-sum overall: the jobs they
    take would have gone to switchers.
  - The cap-exempt version cuts unemployment by 8.4 pts only because it adds hires the cap would forbid, so it's labelled
    as a policy lever.

**See it:** choose the **Warm Handoff** preset and press **+1 quarter**. Aqua arcs on the map go from the old HQ to the
new HQ.

### Feature 3 — Bay Corridors

**Problem.** The city unemployment gap is about 21 points. Most jobs are in the South Bay, and acceptance halves every 15
miles of commute.

**What it does.** A corridor (a shuttle line plus a hub) cuts the effective commute between a home city (and its
neighbours within 8 miles) and a job city by 40%. It only shortens distances, never below 3 miles, and it's symmetric.

In the app:
- **Draw corridor**: click a home city, then a job city.
- **Suggest 3**: proposes the city pairs where a corridor would most raise acceptance for people looking for work.

The bar under the map shows the corridor cost, commute hours per week and CO₂, all marked *assumed*.

**What it changes in the engine:** the table of commute distances only.

**Key results** (full scale, 3 seeds; the 3 corridors suggested at the start of a run)

| Measure | Baseline | Corridors | Change |
|---|---:|---:|---:|
| Average commute | 21.8 mi | 20.5 mi | **−1.3 mi** |
| City unemployment gap | 21.2% | 21.5% | +0.3 pts |
| New grads placed ≤4Q | 39.2% | 36.5% | −2.6 pts |
| Unemployment | 28.1% | 28.3% | +0.1 pts |
| City gap, corridors + Fair-Chance | 21.2% | 14.2% | −7.0 pts |

<details><summary>Full table (all metrics, per-seed changes)</summary>

Command: `node tools/compare.js '{}' '{"corridors":"suggest"}' '{"corridors":"suggest","fairScreening":1}'`

| Metric | Baseline | 3 suggested corridors | Δ vs baseline (seeds 42 / 7 / 123) | Corridors + Fair-Chance | Δ vs baseline (seeds 42 / 7 / 123) |
|---|---:|---:|---:|---:|---:|
| Unemployment at end | 28.1% | 28.3% | +0.1pt <sub>(+0.2pt +0.2pt −0.0pt)</sub> | 27.6% | −0.5pt <sub>(−0.3pt −0.5pt −0.8pt)</sub> |
| NET placed ≤4Q, all cohorts <sub>(count)</sub> | 155,548 | 156,010 | +462 <sub>(+48 +320 +1,018)</sub> | 146,931 | −8,618 <sub>(−9,146 −8,560 −8,147)</sub> |
| NET placed ≤4Q, all cohorts <sub>(share)</sub> | 59.5% | 59.6% | +0.2pt <sub>(+0.1pt −0.0pt +0.4pt)</sub> | 56.0% | −3.4pt <sub>(−3.6pt −3.5pt −3.2pt)</sub> |
| New grads placed ≤4Q | 39.2% | 36.5% | −2.6pt <sub>(−2.5pt −2.6pt −2.9pt)</sub> | 76.8% | +37.7pt <sub>(+37.6pt +38.0pt +37.4pt)</sub> |
| New grads: quarters to hire | 3.06q | 3.24q | +0.18q <sub>(+0.18q +0.17q +0.19q)</sub> | 1.63q | −1.43q <sub>(−1.43q −1.45q −1.40q)</sub> |
| Laid off placed ≤4Q | 67.7% | 68.3% | +0.5pt <sub>(+0.2pt +0.5pt +0.9pt)</sub> | 60.8% | −7.0pt <sub>(−7.3pt −7.0pt −6.6pt)</sub> |
| Laid off: quarters to hire | 1.98q | 1.95q | −0.03q <sub>(−0.03q −0.03q −0.03q)</sub> | 2.33q | +0.34q <sub>(+0.35q +0.34q +0.33q)</sub> |
| Laid off: rehire pay ratio | 0.741 | 0.742 | +0.000 <sub>(−0.000 +0.000 +0.001)</sub> | 0.750 | +0.009 <sub>(+0.008 +0.009 +0.009)</sub> |
| Experienced 10y+ placed ≤4Q | 61.4% | 62.5% | +1.2pt <sub>(+1.0pt +1.1pt +1.5pt)</sub> | 32.7% | −28.7pt <sub>(−28.8pt −28.6pt −28.5pt)</sub> |
| Switchers placed ≤4Q | 60.5% | 61.1% | +0.6pt <sub>(+0.5pt +0.3pt +0.9pt)</sub> | 50.4% | −10.1pt <sub>(−10.2pt −10.2pt −9.8pt)</sub> |
| Pool idle 4+ quarters | 66.2% | 66.2% | −0.1pt <sub>(−0.3pt +0.4pt −0.3pt)</sub> | 62.1% | −4.1pt <sub>(−4.2pt −3.8pt −4.4pt)</sub> |
| Large-company headcount change | -22.7% | -22.8% | −0.1pt <sub>(−0.2pt −0.2pt +0.0pt)</sub> | -22.1% | +0.6pt <sub>(+0.4pt +0.6pt +0.9pt)</sub> |
| Startup headcount change | 31.5% | 31.9% | +0.3pt <sub>(±0.0pt +0.9pt +0.1pt)</sub> | 26.8% | −4.7pt <sub>(−5.9pt −4.1pt −4.0pt)</sub> |
| Avg commute | 21.8mi | 20.5mi | −1.3mi <sub>(−1.2mi −1.3mi −1.3mi)</sub> | 20.7mi | −1.1mi <sub>(−1.0mi −1.1mi −1.1mi)</sub> |
| City unemployment gap p90−p10 | 21.2% | 21.5% | +0.3pt <sub>(+0.3pt −0.3pt +0.8pt)</sub> | 14.2% | −7.0pt <sub>(−8.0pt −7.2pt −5.7pt)</sub> |
| Total hires | 220,168 | 220,066 | −102 <sub>(−220 −209 +123)</sub> | 220,492 | +324 <sub>(−88 +251 +808)</sub> |

</details>

**How I tested it**
- **Tests:** *"Bay Corridors: only shorten distances, never below 3 miles, stay symmetric; none = original"* checks every
  city pair, that invalid corridors are dropped, the suggestions, and that the books stay consistent after a full run.
- **Small scale, round 1 (seeds 42 and 7):** suggestions by the number of people looking picked SF, San Jose and Oakland →
  Mountain View. Commute −1.1 mi, gap unchanged, grads −2.1 pts.
- **Round 2:** I weighted home cities by unemployment rate. It picked the same lines at the start of a run, because every
  city starts at 3%. Lines suggested from the *end* of a run (including Concord) gave gap −1.2 pts and commute −0.9 mi.
- **Full scale (seeds 42, 7, 123):** the table above.
- **Decision:** this feature **did not measurably narrow the regional gap**. With Fair-Chance the gap closes 7.0 pts, the
  same as Fair-Chance alone. I kept it as a commute and emissions tool, labelled with its measured result in the UI. I
  don't claim it fixes regional unemployment.

**See it:** choose the **Bay Corridors** preset (purple lines), or draw your own.

### Feature 4 — Retire-to-Mentor

**Problem.** About 2% of the workforce retires each year, the most experienced first. Each retirement removes an expert
at once and opens a replacement job that competes for the 5% cap.

**What it does**
- When an employed person is chosen to retire, with probability `mentorSharePct` they first stay **4 quarters as a
  mentor**, keeping their seat (so no replacement job opens yet). Then they retire normally.
- Mentors don't quit, aren't laid off and aren't promoted. They're counted as retired only when they actually retire.
- An **assumption** (`mentorAttritionCut`, 30%): new grads hired where a mentor works quit 30% less often in their first
  year.

**Key results** (full scale, 3 seeds, half of retirees mentor)

| Measure | Baseline | Mentor 50% | Change |
|---|---:|---:|---:|
| Unemployment | 28.1% | 27.2% | **−0.9 pts** |
| Large-company headcount change | −22.7% | −21.0% | +1.7 pts |
| Total hires | 220,168 | 223,156 | +2,988 |
| Open replacement jobs at end | 36,447 | 33,440 | −3,007 |
| Grad first-year quit rate | 14.1% | 10.2% | −3.9 pts (13.9% with cut = 0) |

<details><summary>Full table (all metrics, per-seed changes)</summary>

Command: `node tools/compare.js '{}' '{"mentorSharePct":50}' '{"mentorSharePct":50,"mentorAttritionCut":0}'`

| Metric | Baseline | Mentor 50% | Δ vs baseline (seeds 42 / 7 / 123) | Mentor 50% with cut 0 (structural only) | Δ vs baseline (seeds 42 / 7 / 123) |
|---|---:|---:|---:|---:|---:|
| Unemployment at end | 28.1% | 27.2% | −0.9pt <sub>(−0.8pt −0.8pt −1.1pt)</sub> | 27.5% | −0.6pt <sub>(−0.6pt −0.6pt −0.7pt)</sub> |
| NET placed ≤4Q, all cohorts <sub>(count)</sub> | 155,548 | 158,348 | +2,800 <sub>(+2,609 +2,859 +2,931)</sub> | 158,003 | +2,454 <sub>(+1,938 +2,814 +2,611)</sub> |
| NET placed ≤4Q, all cohorts <sub>(share)</sub> | 59.5% | 60.3% | +0.9pt <sub>(+0.8pt +0.8pt +1.0pt)</sub> | 60.1% | +0.6pt <sub>(+0.5pt +0.7pt +0.7pt)</sub> |
| New grads placed ≤4Q | 39.2% | 40.8% | +1.7pt <sub>(+1.9pt +1.9pt +1.2pt)</sub> | 40.4% | +1.2pt <sub>(+0.9pt +1.8pt +1.0pt)</sub> |
| Laid off placed ≤4Q | 67.7% | 68.5% | +0.8pt <sub>(+0.8pt +0.8pt +0.8pt)</sub> | 68.3% | +0.6pt <sub>(+0.4pt +0.7pt +0.6pt)</sub> |
| Switchers placed ≤4Q | 60.5% | 61.2% | +0.7pt <sub>(+0.7pt +0.6pt +1.0pt)</sub> | 61.0% | +0.5pt <sub>(+0.4pt +0.4pt +0.7pt)</sub> |
| Large-company headcount change | -22.7% | -21.0% | +1.7pt <sub>(+1.6pt +1.6pt +1.9pt)</sub> | -21.3% | +1.4pt <sub>(+1.3pt +1.4pt +1.4pt)</sub> |
| Startup headcount change | 31.5% | 30.8% | −0.7pt <sub>(−1.7pt −0.8pt +0.3pt)</sub> | 30.7% | −0.8pt <sub>(−1.9pt −0.6pt −0.1pt)</sub> |
| Unfilled reqs at end | 43,716 | 40,430 | −3,286 <sub>(−3,301 −2,737 −3,821)</sub> | 41,182 | −2,534 <sub>(−2,569 −2,355 −2,678)</sub> |
| Retirements | 27,875 | 25,746 | −2,129 <sub>(−2,186 −2,078 −2,124)</sub> | 25,757 | −2,118 <sub>(−2,079 −2,118 −2,156)</sub> |
| Retired + still mentoring at end | 27,875 | 28,049 | +174 <sub>(+175 +174 +174)</sub> | 28,051 | +176 <sub>(+177 +175 +176)</sub> |
| Grad hires: first-year quit rate | 14.1% | 10.2% | −3.9pt <sub>(−4.5pt −3.7pt −3.5pt)</sub> | 13.9% | −0.1pt <sub>(−0.7pt +0.2pt +0.1pt)</sub> |
| Open backfill reqs at end | 36,447 | 33,440 | −3,007 <sub>(−2,998 −2,489 −3,533)</sub> | 34,152 | −2,295 <sub>(−2,309 −2,155 −2,421)</sub> |
| Total hires | 220,168 | 223,156 | +2,988 <sub>(+2,777 +2,969 +3,218)</sub> | 222,853 | +2,684 <sub>(+2,429 +2,874 +2,750)</sub> |

</details>

**How I tested it**
- **Tests:**
  - *"Retire-to-Mentor: mentors keep their seat, are never double-counted, and retire on schedule"* checks every quarter:
    mentors stay employed, per-company mentor counts match, nobody becomes a mentor or retires twice, no mentor quits or
    is laid off or promoted, every mentor retires exactly on schedule, and retirements are counted once.
  - *"Retire-to-Mentor: with the attrition cut at 0, grad quits are unchanged within noise"*.
- **Small scale (seeds 42 and 7):** unemployment −0.8 pts and grad quits −3.9 pts. With the assumed cut set to 0:
  unemployment −0.7 pts and grad quits −0.3 pts.
- **Full scale (seeds 42, 7, 123):** the table above. Retirements within the 5 years are 2.1k lower only because of timing;
  "retired + still mentoring" is unchanged.
- **Decision:**
  - The **grad-retention gain comes almost entirely from my assumption**, and the UI says so.
  - **Roughly two-thirds to 90% of the headcount and unemployment gains are structural.** They remain with the cut at 0,
    because mentors keep their seat and free up the cap.
  - Kept, with that labelling.

**See it:** choose the **Retire-to-Mentor** preset and watch the "Mentors active" card.

### Feature 5 — Policy Lab

**What it does.** A new window (Policy Lab button in the top bar) with four tabs:
1. **Scorecard.** Ten persona rows, each scored 0–100 from one or two metrics, with adjustable weights feeding one overall
   score. The scales are heuristic and documented in `js/metrics.js`.
2. **Compare.** Runs the same seed twice: *Baseline* (all uplift features off) against *Your policy*. It shows persona
   changes in green and red, **Who gains / Who loses**, and every metric. The runs proceed in small steps with a progress
   bar, so the page never freezes. The baseline is cached.
3. **Stress tests.** A recession (layoffs ×2, growth frozen) or a hiring boom (growth ×2, cap ×1.5) in year 2, applied
   to both runs. The multipliers are **assumptions**. It reports whether the policy still helps.
4. **Autopilot.** Tries a fixed grid of 12 policy mixes on a smaller model (60 companies, 3 years), scores them with your
   weights, and shows the top 3. **Apply this policy** copies one into the sidebar. It says plainly that it's a small grid
   search on a smaller model.

A full default run takes several seconds in the browser, so Compare and Stress default to a **Quick** scale (100
companies, 3 years); full scale is one click.

**How I tested it**
- **Tests:**
  - *"stress tests: shock off is the original; a recession doubles layoffs only in its window"* also checks that a boom
    hires more without breaking the raised cap.
  - *"metrics: one implementation for browser and tools; compare runs are deterministic"*. The page and the Node tools
    give identical metrics, the same seed gives identical results, and scores stay within 0–100.
- **In the browser** (headless Chrome, `tools/headless.js`):
  - Quick compare: 9.5 s. Recession test: 7.3 s. Autopilot: 11.2 s.
  - The 3-minute demo: 4.4 s.
  - Each preset changes the run as expected, and the console is clean.
- **Decision:** I made Quick the default scale so a comparison takes seconds, and kept full scale one click away.

### All four together

| Measure | Baseline | All four (cap counts) | With cap-exempt handoff |
|---|---:|---:|---:|
| New grads placed ≤4Q | 39.2% | 74.9% | 91.3% |
| Laid off placed ≤4Q | 67.7% | 88.0% | 92.1% |
| Experienced 10y+ placed ≤4Q | 61.4% | 38.6% | 48.8% |
| Job switchers placed ≤4Q | 60.5% | 46.0% | 61.2% |
| Unemployment | 28.1% | 26.6% | 18.4% |
| City unemployment gap | 21.2% | 16.1% | 12.5% |

<details><summary>Full table (all metrics, per-seed changes)</summary>

Command: `node tools/compare.js '{}' '{"fairScreening":1,"warmHandoff":1,"mentorSharePct":50,"corridors":"suggest"}' '{…same…,"handoffCountsTowardCap":0}'`

| Metric | Baseline | All four (cap counts) | Δ vs baseline (seeds 42 / 7 / 123) | All four with cap-exempt handoff | Δ vs baseline (seeds 42 / 7 / 123) |
|---|---:|---:|---:|---:|---:|
| Unemployment at end | 28.1% | 26.6% | −1.6pt <sub>(−1.4pt −1.7pt −1.6pt)</sub> | 18.4% | −9.8pt <sub>(−9.6pt −9.8pt −10.0pt)</sub> |
| NET placed ≤4Q, all cohorts <sub>(count)</sub> | 155,548 | 155,372 | −177 <sub>(−958 +638 −210)</sub> | 194,845 | +39,297 <sub>(+38,745 +39,078 +40,068)</sub> |
| NET placed ≤4Q, all cohorts <sub>(share)</sub> | 59.5% | 59.1% | −0.3pt <sub>(−0.6pt −0.0pt −0.3pt)</sub> | 71.8% | +12.4pt <sub>(+12.1pt +12.3pt +12.7pt)</sub> |
| New grads placed ≤4Q | 39.2% | 74.9% | +35.7pt <sub>(+35.5pt +36.5pt +35.2pt)</sub> | 91.3% | +52.1pt <sub>(+52.0pt +52.0pt +52.2pt)</sub> |
| New grads: quarters to hire | 3.06q | 1.64q | −1.42q <sub>(−1.42q −1.45q −1.39q)</sub> | 1.03q | −2.03q <sub>(−2.04q −2.04q −2.02q)</sub> |
| Laid off placed ≤4Q | 67.7% | 88.0% | +20.3pt <sub>(+20.1pt +20.3pt +20.4pt)</sub> | 92.1% | +24.4pt <sub>(+24.1pt +24.3pt +24.7pt)</sub> |
| Laid off: quarters to hire | 1.98q | 0.63q | −1.35q <sub>(−1.35q −1.35q −1.35q)</sub> | 0.46q | −1.52q <sub>(−1.51q −1.52q −1.53q)</sub> |
| Laid off: rehire pay ratio | 0.741 | 0.786 | +0.045 <sub>(+0.045 +0.045 +0.045)</sub> | 0.787 | +0.045 <sub>(+0.045 +0.045 +0.046)</sub> |
| Experienced 10y+ placed ≤4Q | 61.4% | 38.6% | −22.8pt <sub>(−23.2pt −22.7pt −22.5pt)</sub> | 48.8% | −12.6pt <sub>(−13.0pt −12.6pt −12.3pt)</sub> |
| Switchers placed ≤4Q | 60.5% | 46.0% | −14.5pt <sub>(−14.8pt −14.2pt −14.4pt)</sub> | 61.2% | +0.7pt <sub>(+0.5pt +0.6pt +1.0pt)</sub> |
| Pool idle 4+ quarters | 66.2% | 62.4% | −3.8pt <sub>(−3.8pt −3.8pt −3.9pt)</sub> | 51.6% | −14.6pt <sub>(−14.4pt −14.4pt −15.0pt)</sub> |
| Large-company headcount change | -22.7% | -20.3% | +2.3pt <sub>(+2.1pt +2.5pt +2.4pt)</sub> | -11.3% | +11.4pt <sub>(+11.2pt +11.4pt +11.6pt)</sub> |
| Startup headcount change | 31.5% | 25.6% | −5.9pt <sub>(−6.6pt −6.2pt −4.8pt)</sub> | 23.0% | −8.5pt <sub>(−11.1pt −8.8pt −5.7pt)</sub> |
| Avg commute | 21.8mi | 20.0mi | −1.8mi <sub>(−1.8mi −1.8mi −1.8mi)</sub> | 19.8mi | −2.0mi <sub>(−1.9mi −2.0mi −2.0mi)</sub> |
| City unemployment gap p90−p10 | 21.2% | 16.1% | −5.1pt <sub>(−6.1pt −5.9pt −3.2pt)</sub> | 12.5% | −8.7pt <sub>(−9.1pt −9.2pt −7.9pt)</sub> |
| Retired + still mentoring at end | 27,875 | 28,038 | +163 <sub>(+162 +164 +164)</sub> | 28,042 | +167 <sub>(+168 +166 +166)</sub> |
| Grad hires: first-year quit rate | 14.1% | 9.9% | −4.2pt <sub>(−4.4pt −4.0pt −4.1pt)</sub> | 9.9% | −4.1pt <sub>(−4.6pt −3.9pt −3.9pt)</sub> |
| Total hires | 220,168 | 223,458 | +3,290 <sub>(+2,804 +3,657 +3,409)</sub> | 259,415 | +39,247 <sub>(+38,928 +39,018 +39,795)</sub> |

</details>

**With the brief's cap respected**, the policies move jobs towards the groups the original market served worst: grads
+36 pts, laid off +20 pts, city gap −5.1 pts. Experienced candidates (−23), switchers (−15) and startups (−6) pay for it,
and NET placements are flat (−0.3 pts).

**With the cap-exempt handoff lever as well**, unemployment falls from 28.1% to 18.4%. Only experienced candidates and
startups stay worse off.

Under the brief's cap, these policies decide *who* waits. Only changing the cap decides *how many*.

---

## 5. Scenarios: outsourcing and AI

These are **scenarios requested in the brief, not uplift features**. They ask "what if?", and the answer is mostly bad
news for US job-seekers. Both are deterministic: they use fixed rules, not random draws.

### Outsourcing to India

**What the brief asked:** move hard-to-fill roles to India at 2.5 hires per US role.

**What it does** (`outsourceOn`)
- After planning and before hiring, each quarter, a US req that has been unfilled for more than `outsourceAfterQ` (1)
  quarters can be outsourced.
- `outsourceSharePct` (100%) sets the share of eligible reqs taken. It's every Nth req, not random.
- An outsourced req is closed in the US. The seat is eliminated, like a laid-off seat, so it isn't reopened.
- It's replaced by `outsourceRatio` (2.5) India hires. India hires are **not** in the US pool, the US cap or US
  unemployment.
- The event log records "Role outsourced to India".

### AI automation (70% AI / 30% human)

**What the brief asked:** a future where AI does 70% of the work and people do 30%.

**How I read it:** from now on, `aiSharePct`% of *newly opened* US roles (growth roles and replacement roles) are done by
AI and closed instead of hired. The rest stay open for people.
- The share ramps up evenly from 0 to the target over `aiRampQuarters` (8).
- The choice of which roles go to AI uses a running counter, not a random draw.
- **Existing employees aren't laid off.** I didn't build the optional AI-layoff switch.
- The event log records "Role automated".

**Key results** (full scale: 200 companies, 5 years, seeds 42, 7, 123)

| Measure | Baseline | Outsourcing | AI 70/30 | Both |
|---|---:|---:|---:|---:|
| US unemployment | 28.1% | 28.2% | **54.2%** | 54.7% |
| New grads placed ≤4Q | 39.2% | 41.1% | 18.7% | 17.7% |
| Laid off placed ≤4Q | 67.7% | 67.6% | 40.4% | 39.7% |
| Large / startup headcount change | −22.7% / +31.5% | −22.7% / +27.0% | −50.4% / −72.7% | −50.9% / −74.5% |
| India headcount | 0 | 110,993 | 0 | 5,632 |
| US roles automated by AI | 0 | 0 | 135,859 | 135,148 |

<details><summary>Full table (all metrics, per-seed changes)</summary>

Command: `node tools/compare.js '{}' '{"outsourceOn":1}' '{"aiSharePct":70}' '{"outsourceOn":1,"aiSharePct":70}'`

| Metric | Baseline | Outsourcing | Δ vs baseline (seeds 42 / 7 / 123) | AI 70/30 | Δ vs baseline (seeds 42 / 7 / 123) | Both | Δ vs baseline (seeds 42 / 7 / 123) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Unemployment at end | 28.1% | 28.2% | +0.1pt <sub>(+0.1pt +0.1pt +0.0pt)</sub> | 54.2% | +26.1pt <sub>(+26.1pt +26.1pt +26.0pt)</sub> | 54.7% | +26.5pt <sub>(+26.7pt +26.5pt +26.3pt)</sub> |
| NET placed ≤4Q, all cohorts <sub>(count)</sub> | 155,548 | 154,985 | −563 <sub>(−759 −356 −574)</sub> | 76,971 | −78,577 <sub>(−79,146 −78,424 −78,162)</sub> | 74,892 | −80,657 <sub>(−81,165 −80,706 −80,099)</sub> |
| NET placed ≤4Q, all cohorts <sub>(share)</sub> | 59.5% | 59.2% | −0.2pt <sub>(−0.2pt −0.3pt −0.2pt)</sub> | 32.4% | −27.0pt <sub>(−27.2pt −27.0pt −26.9pt)</sub> | 31.7% | −27.8pt <sub>(−28.0pt −27.9pt −27.5pt)</sub> |
| New grads placed ≤4Q | 39.2% | 41.1% | +1.9pt <sub>(+2.2pt +2.0pt +1.5pt)</sub> | 18.7% | −20.5pt <sub>(−20.7pt −20.4pt −20.4pt)</sub> | 17.7% | −21.5pt <sub>(−21.6pt −21.6pt −21.2pt)</sub> |
| Laid off placed ≤4Q | 67.7% | 67.6% | −0.1pt <sub>(−0.4pt +0.1pt −0.0pt)</sub> | 40.4% | −27.4pt <sub>(−27.8pt −27.2pt −27.1pt)</sub> | 39.7% | −28.0pt <sub>(−28.4pt −28.0pt −27.8pt)</sub> |
| Experienced 10y+ placed ≤4Q | 61.4% | 59.5% | −1.9pt <sub>(−1.9pt −2.1pt −1.8pt)</sub> | 32.4% | −29.0pt <sub>(−29.3pt −28.9pt −28.8pt)</sub> | 31.8% | −29.6pt <sub>(−29.9pt −29.7pt −29.2pt)</sub> |
| Switchers placed ≤4Q | 60.5% | 59.8% | −0.7pt <sub>(−0.7pt −0.8pt −0.6pt)</sub> | 32.7% | −27.9pt <sub>(−27.9pt −27.9pt −27.7pt)</sub> | 32.0% | −28.6pt <sub>(−28.7pt −28.7pt −28.3pt)</sub> |
| Pool idle 4+ quarters | 66.2% | 66.1% | −0.1pt <sub>(−0.4pt +0.3pt −0.2pt)</sub> | 83.7% | +17.4pt <sub>(+17.4pt +17.7pt +17.2pt)</sub> | 83.9% | +17.6pt <sub>(+17.6pt +17.9pt +17.4pt)</sub> |
| Large-company headcount change | -22.7% | -22.7% | −0.0pt <sub>(−0.0pt −0.1pt +0.0pt)</sub> | -50.4% | −27.7pt <sub>(−27.8pt −27.7pt −27.6pt)</sub> | -50.9% | −28.2pt <sub>(−28.4pt −28.2pt −28.0pt)</sub> |
| Startup headcount change | 31.5% | 27.0% | −4.6pt <sub>(−5.5pt −3.3pt −4.9pt)</sub> | -72.7% | −104.3pt <sub>(−104.8pt −104.8pt −103.2pt)</sub> | -74.5% | −106.0pt <sub>(−106.6pt −105.2pt −106.2pt)</sub> |
| Unfilled reqs at end | 43,716 | 8,464 | −35,252 <sub>(−34,893 −35,198 −35,665)</sub> | 285 | −43,431 <sub>(−43,189 −43,256 −43,848)</sub> | 256 | −43,460 <sub>(−43,182 −43,300 −43,899)</sub> |
| Total hires | 220,168 | 219,970 | −198 <sub>(−138 −278 −178)</sub> | 110,220 | −109,949 <sub>(−110,253 −109,974 −109,619)</sub> | 107,724 | −112,444 <sub>(−112,912 −112,492 −111,928)</sub> |
| India headcount <sub>(outsourced roles)</sub> | 0 | 110,993 | +110,993 <sub>(+109,675 +111,625 +111,680)</sub> | 0 | ±0 <sub>(±0 ±0 ±0)</sub> | 5,632 | +5,632 <sub>(+5,973 +5,545 +5,378)</sub> |
| US roles outsourced | 0 | 44,397 | +44,397 <sub>(+43,870 +44,650 +44,672)</sub> | 0 | ±0 <sub>(±0 ±0 ±0)</sub> | 2,253 | +2,253 <sub>(+2,389 +2,218 +2,151)</sub> |
| US roles automated by AI | 0 | 0 | ±0 <sub>(±0 ±0 ±0)</sub> | 135,859 | +135,859 <sub>(+135,662 +135,787 +136,127)</sub> | 135,148 | +135,148 <sub>(+135,030 +134,916 +135,499)</sub> |

</details>

**How I tested it**
- **Tests:**
  - *"Scenarios: outsourcing and AI keep the books, caps and startup max; deterministic per seed"* checks every quarter:
    lists stay consistent, no seat is both outsourced and filled, no outsourced req stays open, the cap and the startup
    max hold, the AI share stays at or below 70%, India headcount = 2.5 × outsourced reqs, there's one event per
    outsourced req, and two runs with the same seed are identical.
  - *"Scenarios: the AI share ramps and never exceeds aiSharePct; outsourcing every Nth is exact"*.
  - The identical-to-original test (seeds 42, 7, 123) passes with both off.
- **Before integrating:** a small-scale check (100 companies, 3 years, seed 42). Outsourcing: unemployment 19.1% → 19.0%.
  AI 70/30: unemployment 19.1% → 34.4%.
- **Full scale:** the table above, one measurement as requested, no tuning.
- **Decision:** kept both as clearly labelled scenarios in their own sidebar group, with KPI cards and Policy Lab rows.
  They're not offered as improvements.

**Verdict, honestly**
- **AI 70/30 is the harshest change in the whole model.**
  - US unemployment nearly doubles (28% → 54%), and total US hires halve (220k → 110k).
  - **Every job-seeking group loses 20–29 points** placed ≤4Q: new grads, laid-off people, switchers and experienced
    candidates.
  - Large companies shrink by half, and startups by almost three-quarters. Their high turnover means most of their
    roles are reopened, and 70% of those go to AI.
- **Outsourcing barely moves US unemployment** (+0.1 points), but not because it's harmless.
  - It closes 44k US roles that the 5% cap was already leaving unfilled. That's why the US hires don't change.
  - The roles disappear from the US for good, startups lose 4.6 points, and experienced candidates lose 1.9.
  - If the cap were lifted, those would have been US jobs.
- **Both together:** about the same as AI alone. AI takes most new roles before they're old enough to outsource.

---

## 6. Assumptions (every invented number)

| Assumption | Value | Setting |
|---|---|---|
| Mentor effect on grad quits | −30% for 4 quarters. **Drives almost all of Feature 4's grad-retention gain.** | `mentorAttritionCut` |
| Corridor cost | $250k per corridor per quarter | `ASSUMPTIONS.corridorCostPerQuarter` |
| Corridor effect | −40% commute miles; neighbours within 8 miles share it | `cutPct`, `spillMiles` |
| Commute hours | miles × 2 trips × 5 days ÷ 30 mph | `ASSUMPTIONS` |
| CO₂ | 0.4 kg per vehicle mile, one person per car | `ASSUMPTIONS.kgCo2PerMile` |
| Recession | layoffs ×2, funded growth 0, for 4 quarters | `shock = 1` |
| Boom | funded growth ×2, hiring cap ×1.5, for 4 quarters | `shock = 2` |
| Fit-rank idle boost | up to +30% at 8+ quarters looking (tuned in 2 rounds) | `fairIdleBoostPct` |
| Persona score scales | e.g. large companies: −25% headcount = 0, +25% = 100 | `js/metrics.js` |
| India hires per outsourced role | 2.5 (from the brief's budget statement) | `outsourceRatio` |
| India pay and cost | **Not modelled**, so no cost claims are made | — |
| AI share of new roles | 70% AI / 30% human: a scenario target, not a prediction | `aiSharePct` |
| AI ramp | rises evenly over 8 quarters | `aiRampQuarters` |

The original model's own calibrated values (pay bands, acceptance curve, slate size) are unchanged (section 10).

---

## 7. Limitations and honest negatives

- **The cap limits everything.** Fair-Chance, the cap-counting Warm Handoff and Bay Corridors mainly move jobs between
  groups. See the NET rows.
- **Groups that get worse:**
  - *Fair-Chance:* experienced candidates (−28 pts), switchers (−10), laid-off people (−7), startups (−5).
  - *Warm Handoff:* switchers (−6).
  - *Corridors alone:* new grads (−3).
- **Did not measurably help:**
  - *Bay Corridors* did not narrow the regional gap.
  - *Slate rotation* made placement worse.
- **What comes from assumptions or levers:**
  - Retire-to-Mentor's grad-retention gain is the assumed 30% cut.
  - The cap-exempt handoff's big gain comes from bypassing the cap.
- **Scenarios make things worse, as expected:**
  - *AI 70/30:* US unemployment 28% → 54%, every job-seeking group −20 to −29 points, startups −73%.
  - *Outsourcing:* 44k US roles leave for good; unemployment barely moves only because the cap left those roles empty.
  - Both scenarios were measured once, with no tuning.
- **Evidence:** three seeds at full scale; tuning on two seeds at small scale. The seeds agree closely, but it's one model
  with hand-set values.
- **Not modelled** (as in the original): moving house, remote work, growth plans that react to the market. Distance is
  straight-line × 1.2.

---

## 8. How AI was used

I used an AI coding assistant for development and prototyping: reading the code, writing measurement scripts and tests,
and drafting. The simulator itself uses deterministic rules and scoring only. It has no machine learning and makes no
network calls.

**Considered and dropped**
- *Raising the hiring cap or exempting backfills:* the biggest lever (unemployment 28% → 9.5%), but it changes a rule
  from the brief. It stays as the original toggle and as the labelled cap-exempt handoff lever.
- *Ranking by P(accept) including commute:* it helped grads but widened the city gap by 9–13 points. It's kept as an
  off-by-default toggle.
- *Moving people or companies, or remote work:* these change the model's basic assumptions, so they're out of scope for
  "build on top, same mechanism".
- *Web Workers for the Policy Lab:* they don't run from `file://`, so runs are split into small `setTimeout` steps.

---

## 9. Further improvements

The current work is complete and runs end to end. These are the extensions I'd add next:
- **Corridors from the hardest-hit cities.** Measure corridors drawn from the North Bay and Tri-Valley. The app already
  lets you draw them, but I haven't measured them yet.
- **More seeds and confidence ranges**, so every table shows a spread as well as a mean.
- **Persona-specific policies for more groups**, for example a re-entry path for experienced candidates, the group
  Fair-Chance asks the most of.
- **Calibrating assumed values** (the mentor quit cut, corridor cost, shock multipliers) against real data.
- **India cost and wage modelling**, so the outsourcing scenario can say what it saves and what it costs.
- **AI that helps people rather than replacing them**, for example raising each engineer's output instead of closing
  roles.
- **Remote work and moving house**, to test whether location still drives the regional gap.
- **A finer autopilot search at full scale**, with more levels per feature.

---

## 10. The original model (unchanged)

**Map.** About 50 cities from San Rafael and Concord to Los Gatos and Pleasanton, with 2020 Census populations.

**Companies.** 500 Bay Area companies:
- **100 named companies**, with engineer counts that are **rough estimates, not sourced figures**;
- **150 synthetic growth-stage companies** (30–140 engineers);
- **250 synthetic startups** (≤ 25 people).

The simulation runs X of them: the X/2 largest plus X/2 startups (default X = 200).

**People.** Each person has:
- a home city, drawn in proportion to population;
- a level and years of experience;
- a pay, and the pay band of their seat;
- a status: employed, new grad looking, switching jobs, laid off, retired, or left the Bay Area.

**The rules, as given (all configurable)**

| Rule | Implementation |
|---|---|
| X/2 large companies, X/2 startups; startups max 25 | Startups never exceed the cap (tested). |
| Hire ≤ 5% of headcount per quarter, minimum 5 | Per company per quarter. By default replacement hires count too. |
| Half-life 4 years (large), 2 years (startup) | Quarterly exit probability 4.2% and 8.3%. |
| 10% raise per year; hiring costs 5% of pay | Raises each Q1. |
| A seat's pay grows 2% per year | Bands and open jobs grow 2% each Q1. |
| New grads 3% of the workforce per year | They arrive in Q3. |
| Retirements 2% per year | The most experienced are the likeliest to retire. |
| Layoffs 5% per year (large), 20% (startups) | One round a year (Q1). Laid-off seats are eliminated. |
| Laid-off people take a 20% pay discount | They ask 80% of their last pay. |
| A closer candidate accepts at 2× the rate | P(accept) = 75% × (offer ÷ ask)^4 × ½^(commute ÷ 15 mi). |

**How a hire happens.**
- Each open job screens 12 candidates. In the original, it offers in order of experience; with Fair-Chance, in order of
  fit.
- Each candidate is offered their ask, capped at the band.
- Unfilled jobs raise their band 3% a quarter.
- Half of manager vacancies are filled from within.
- People looking for work lower their ask 2% a quarter.

**Quarter order.** Raises (Q1), retirements, voluntary exits, layoffs, graduates, growth plan, *(outsourcing)*, *(Warm
Handoff)*, hiring, then the pool ages. *(AI automation)* applies whenever a role is opened.

**Interpretations (original, still valid)**
- **"The remaining 1%."** Read as the net 1% of new supply each year (3% grads in, 2% retiring).
- **Does the 5% cap include replacement hires?** The literal reading is yes, and that's the default. Large companies then
  shrink about 22% in five years. A toggle switches to the other reading.
- **Funded growth:** large companies 5% a year; startups 40% a year up to their cap.
- **Starting pool:** 3% of the workforce starts out looking for work.

---

## 11. Files

```
index.html               page (presets and demo, Policy Lab button, corridor bar)
styles.css               light + dark themes, responsive
js/data/*.js             cities, geography, the 500 companies (unchanged)
js/engine.js             the simulation (no DOM), with the four opt-in features, two scenarios, stress shocks and visibility tracking
js/metrics.js            NEW persona metrics and scorecard, shared by the browser and Node
js/ui/lab.js             NEW Policy Lab
js/ui/map.js             map; new corridor layer and drawing, warm-handoff arcs
js/ui/overlays.js        detail windows; new timeline events
js/ui/charts.js, insights.js   unchanged
js/app.js                controls and dashboard; new Uplift and Scenarios groups, Visibility tab, KPIs, corridors, presets
test/engine.test.js      29 tests: the original 16, identical-to-original, each feature's rules, and the scenarios
test/fixtures/engine.original.js   the engine exactly as provided
tools/                   metrics, baseline, compare, final tables, headless check, README.txt generator
tools/results/           the measured outputs quoted in this README
```
