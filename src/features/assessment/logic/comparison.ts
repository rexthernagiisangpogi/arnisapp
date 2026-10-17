import thresholds from "../../../../assets/data/analysis-thresholds.json";
import type {
    NumericPoseMetric,
    PoseMeasurements,
    ScoreLevel,
    ValidatedReference,
} from "../types";

export type MetricComparison = {
  metric: keyof PoseMeasurements;
  measured: number;
  expected: number;
  normalizedError: number;
  score: ScoreLevel;
};

function metricTolerance(
  metric: keyof PoseMeasurements,
  referenceTolerance: number,
): number {
  if (metric.toLowerCase().includes("angle"))
    return referenceTolerance || thresholds.comparison.angleToleranceDegrees;
  if (metric === "footSpacingRatio")
    return referenceTolerance || thresholds.comparison.spacingToleranceRatio;
  if (metric === "shoulderHipAlignmentRatio")
    return referenceTolerance || thresholds.comparison.alignmentToleranceRatio;
  return referenceTolerance || 0.1;
}

function scoreNormalizedError(error: number): ScoreLevel {
  const [advanced, proficient, developing] = thresholds.comparison.scoreBands;
  if (error <= advanced) return 4;
  if (error <= proficient) return 3;
  if (error <= developing) return 2;
  return 1;
}

export function comparePoseToReference(
  measured: PoseMeasurements,
  reference: ValidatedReference,
): MetricComparison[] {
  if (!reference.validated) return [];
  return Object.entries(reference.metrics).flatMap(([key, expectation]) => {
    if (!expectation) return [];
    const metric = key as NumericPoseMetric;
    const value = measured[metric];
    const tolerance = metricTolerance(metric, expectation.tolerance);
    const normalizedError = Math.abs(value - expectation.target) / tolerance;
    return [
      {
        metric,
        measured: value,
        expected: expectation.target,
        normalizedError,
        score: scoreNormalizedError(normalizedError),
      },
    ];
  });
}
