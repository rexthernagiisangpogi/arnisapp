import rubric from "../../../../assets/data/rubric.json";
import type { ScoreLevel } from "../types";

type RubricCriterion = { id: string; name: string; focus: string };
type RubricArea = { id: string; name: string; criteria: RubricCriterion[] };
const config = rubric as {
  levels: Record<string, string>;
  descriptor_templates: Record<string, string>;
  areas: RubricArea[];
};

export function averageScore(scores: number[]): ScoreLevel | null {
  if (
    !scores.length ||
    scores.some((score) => !Number.isInteger(score) || score < 1 || score > 4)
  )
    return null;
  return Math.max(
    1,
    Math.min(
      4,
      Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    ),
  ) as ScoreLevel;
}

export function performanceLevel(score: number | null): string {
  if (score === null || !Number.isInteger(score) || score < 1 || score > 4)
    return "Not scored";
  return config.levels[String(score)];
}

export function getRubricDescriptor(
  criterionId: string,
  score: ScoreLevel,
): string | null {
  const criterion = config.areas
    .flatMap((area) => area.criteria)
    .find((item) => item.id === criterionId);
  return criterion
    ? config.descriptor_templates[String(score)].replace(
        "{focus}",
        criterion.focus,
      )
    : null;
}

export function getRelevantCriteria(areaIds: string[]): RubricArea[] {
  return config.areas.filter((area) => areaIds.includes(area.id));
}

export function rubricAreas(): RubricArea[] {
  return config.areas;
}
