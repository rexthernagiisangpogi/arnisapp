import rubric from "../../../../assets/data/rubric.json";
import type { AssessmentScores, ScoreLevel } from "../types";
import type { MetricComparison } from "./comparison";
import { averageScore } from "./rubricEngine";

type Criterion = { id: string; name: string; focus: string };
type Area = { id: string; name: string; criteria: Criterion[] };
const areas = (rubric as { areas: Area[] }).areas;

const criterionMetrics: Record<string, string[]> = {
  "strike-position": ["leftElbowAngle", "rightElbowAngle"],
  "strike-direction": ["leftElbowAngle", "rightElbowAngle"],
  "strike-angle": ["leftElbowAngle", "rightElbowAngle"],
  "strike-alignment": ["shoulderHipAlignmentRatio"],
  "technique-execution": [
    "leftElbowAngle",
    "rightElbowAngle",
    "shoulderHipAlignmentRatio",
  ],
  "foot-placement": ["footSpacingRatio"],
  stance: ["footSpacingRatio", "shoulderHipAlignmentRatio"],
  balance: ["visibleBodyFraction"],
  "movement-pattern": ["footSpacingRatio"],
  "body-stability": ["visibleBodyFraction", "shoulderHipAlignmentRatio"],
  "upper-coordination": ["leftElbowAngle", "rightElbowAngle"],
  "lower-coordination": ["footSpacingRatio"],
  "coordination-alignment": ["shoulderHipAlignmentRatio"],
  "coordination-balance": ["visibleBodyFraction"],
  synchronization: ["leftElbowAngle", "rightElbowAngle", "footSpacingRatio"],
  "overall-accuracy": [
    "leftElbowAngle",
    "rightElbowAngle",
    "shoulderHipAlignmentRatio",
  ],
  "overall-stance": ["footSpacingRatio", "visibleBodyFraction"],
  "overall-coordination": [
    "leftElbowAngle",
    "rightElbowAngle",
    "footSpacingRatio",
  ],
  "overall-balance": ["visibleBodyFraction"],
  "overall-technique": [
    "leftElbowAngle",
    "rightElbowAngle",
    "footSpacingRatio",
    "shoulderHipAlignmentRatio",
  ],
};

export function scoresFromComparisons(
  comparisons: MetricComparison[],
  relevantAreaIds: string[],
): AssessmentScores {
  const scores: AssessmentScores = {};
  for (const area of areas.filter((item) =>
    relevantAreaIds.includes(item.id),
  )) {
    const criteriaScores: Record<string, ScoreLevel> = {};
    for (const criterion of area.criteria) {
      const metricNames = criterionMetrics[criterion.id] ?? [];
      const values = comparisons
        .filter((comparison) => metricNames.includes(comparison.metric))
        .map((comparison) => comparison.score);
      const score = averageScore(values);
      if (score !== null) criteriaScores[criterion.id] = score;
    }
    if (Object.keys(criteriaScores).length) scores[area.id] = criteriaScores;
  }
  return scores;
}

export function addDerivedOverallArea(
  scores: AssessmentScores,
): AssessmentScores {
  const sourceScores = Object.entries(scores)
    .filter(([areaId]) => areaId !== "overall")
    .flatMap(([, criteria]) => Object.values(criteria));
  const derived = averageScore(sourceScores);
  if (derived === null) return scores;
  const overallArea = areas.find((area) => area.id === "overall");
  if (!overallArea) return scores;
  const result = { ...scores, overall: {} as Record<string, ScoreLevel> };
  overallArea.criteria.forEach((criterion) => {
    result.overall[criterion.id] = derived;
  });
  return result;
}

export function overallScore(scores: AssessmentScores): ScoreLevel | null {
  const values = Object.values(scores).flatMap((area) => Object.values(area));
  return averageScore(values);
}
