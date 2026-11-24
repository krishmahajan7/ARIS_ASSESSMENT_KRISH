#!/bin/sh
# Reproduces the README tables at full scale (200 companies, 5 years, seeds 42, 7, 123).
# Takes several minutes. Output: tools/results/*.txt
cd "$(dirname "$0")/.."
node tools/baseline.js > tools/results/baseline-seed42.txt
node tools/compare.js '{}' '{"hireCapPct":8}' '{"slate":40}' '{"nearbyMiles":60}' > tools/results/diagnosis.txt
node tools/compare.js '{}' '{"fairScreening":1}' '{"fairScreening":1,"fairRankDistance":1,"fairIdleBoostPct":0}' '{"fairRotation":1}' > tools/results/f1-fair-chance.txt
node tools/compare.js '{}' '{"warmHandoff":1}' '{"warmHandoff":1,"handoffCountsTowardCap":0}' > tools/results/f2-warm-handoff.txt
node tools/compare.js '{}' '{"corridors":"suggest"}' '{"corridors":"suggest","fairScreening":1}' > tools/results/f3-corridors.txt
node tools/compare.js '{}' '{"mentorSharePct":50}' '{"mentorSharePct":50,"mentorAttritionCut":0}' > tools/results/f4-mentor.txt
node tools/compare.js '{}' '{"fairScreening":1,"warmHandoff":1,"mentorSharePct":50,"corridors":"suggest"}' '{"fairScreening":1,"warmHandoff":1,"handoffCountsTowardCap":0,"mentorSharePct":50,"corridors":"suggest"}' > tools/results/all-uplift.txt
node tools/compare.js '{}' '{"outsourceOn":1}' '{"aiSharePct":70}' '{"outsourceOn":1,"aiSharePct":70}' > tools/results/scenarios.txt
echo done
