import thresholds from "../../../../assets/data/analysis-thresholds.json";
import type { PoseMeasurements } from "../types";
import { poseLandmarkIndices } from "./poseLandmarkIndices";

export type PoseLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

export type Pose = PoseLandmark[];

function point(pose: Pose, index: number): PoseLandmark | undefined {
  return pose[index];
}

function visibilityOf(landmark: PoseLandmark | undefined): number {
  return landmark?.visibility ?? landmark?.presence ?? 0;
}

function distance(a: PoseLandmark, b: PoseLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleDegrees(
  a: PoseLandmark,
  vertex: PoseLandmark,
  c: PoseLandmark,
): number {
  const vectorA = { x: a.x - vertex.x, y: a.y - vertex.y };
  const vectorC = { x: c.x - vertex.x, y: c.y - vertex.y };
  const magnitude =
    Math.hypot(vectorA.x, vectorA.y) * Math.hypot(vectorC.x, vectorC.y);
  if (!magnitude) return 0;
  const cosine = Math.max(
    -1,
    Math.min(1, (vectorA.x * vectorC.x + vectorA.y * vectorC.y) / magnitude),
  );
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function computePoseMeasurements(pose: Pose): PoseMeasurements | null {
  const ids = poseLandmarkIndices;
  const leftShoulder = point(pose, ids.leftShoulder);
  const rightShoulder = point(pose, ids.rightShoulder);
  const leftElbow = point(pose, ids.leftElbow);
  const rightElbow = point(pose, ids.rightElbow);
  const leftWrist = point(pose, ids.leftWrist);
  const rightWrist = point(pose, ids.rightWrist);
  const leftHip = point(pose, ids.leftHip);
  const rightHip = point(pose, ids.rightHip);
  const leftKnee = point(pose, ids.leftKnee);
  const rightKnee = point(pose, ids.rightKnee);
  const leftAnkle = point(pose, ids.leftAnkle);
  const rightAnkle = point(pose, ids.rightAnkle);
  if (
    !leftShoulder ||
    !rightShoulder ||
    !leftElbow ||
    !rightElbow ||
    !leftWrist ||
    !rightWrist ||
    !leftHip ||
    !rightHip ||
    !leftKnee ||
    !rightKnee ||
    !leftAnkle ||
    !rightAnkle
  )
    return null;

  const shoulderMid = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const hipMid = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };
  const torsoLength = Math.max(0.001, distance(shoulderMid, hipMid));
  const shoulderWidth = Math.max(0.001, distance(leftShoulder, rightShoulder));
  const visibleIndices = [
    ids.leftShoulder,
    ids.rightShoulder,
    ids.leftHip,
    ids.rightHip,
    ids.leftKnee,
    ids.rightKnee,
    ids.leftAnkle,
    ids.rightAnkle,
  ];
  const ys = visibleIndices.map((index) => pose[index].y);
  const visibleBodyFraction = Math.max(...ys) - Math.min(...ys);
  const averageVisibility =
    visibleIndices.reduce((sum, index) => sum + visibilityOf(pose[index]), 0) /
    visibleIndices.length;

  return {
    leftElbowAngle: angleDegrees(leftShoulder, leftElbow, leftWrist),
    rightElbowAngle: angleDegrees(rightShoulder, rightElbow, rightWrist),
    footSpacingRatio: distance(leftAnkle, rightAnkle) / torsoLength,
    shoulderHipAlignmentRatio:
      Math.abs(shoulderMid.x - hipMid.x) / shoulderWidth,
    visibleBodyFraction,
    averageVisibility,
    landmarkVisibility: Object.fromEntries(
      thresholds.quality.requiredLandmarks.map((name) => {
        const index = ids[name as keyof typeof ids];
        return [name, visibilityOf(pose[index])];
      }),
    ),
  };
}

export function evaluateImageQuality(
  image: { width: number; height: number; fileSize: number },
  measurements: PoseMeasurements | null,
  pixels?: { meanLuminance: number; sharpnessVariance: number } | null,
): {
  passed: boolean;
  reasons: string[];
  confidence: number;
  visibleBodyFraction: number;
} {
  const reasons: string[] = [];
  if (
    image.width < thresholds.quality.minimumWidthPx ||
    image.height < thresholds.quality.minimumHeightPx
  ) {
    reasons.push(
      "Image resolution is too low; retake or upload a larger, sharper image.",
    );
  }
  if (image.fileSize < thresholds.capture.minimumBytes) {
    reasons.push(
      "The image file is too small to inspect reliably; choose another image.",
    );
  }
  if (!measurements) {
    reasons.push(
      "A full pose could not be detected. Include the whole body in a well-lit, unblurred image and retake it.",
    );
    return { passed: false, reasons, confidence: 0, visibleBodyFraction: 0 };
  }
  if (
    measurements.averageVisibility <
    thresholds.quality.minimumLandmarkVisibility
  ) {
    reasons.push(
      "Key body points are unclear. Improve lighting, remove blur or obstruction, and retake.",
    );
  }
  if (
    measurements.visibleBodyFraction <
    thresholds.quality.minimumVisibleBodyFraction
  ) {
    reasons.push(
      "The full body is not visible. Step back and include shoulders, hips, knees, and feet.",
    );
  }
  if (
    pixels &&
    pixels.meanLuminance < thresholds.quality.minimumMeanLuminance
  ) {
    reasons.push(
      "The image is too dark. Move to a brighter area and retake it.",
    );
  }
  if (
    pixels &&
    pixels.meanLuminance > thresholds.quality.maximumMeanLuminance
  ) {
    reasons.push(
      "The image is overexposed. Reduce glare or move away from direct light and retake it.",
    );
  }
  if (
    pixels &&
    pixels.sharpnessVariance < thresholds.quality.minimumSharpnessVariance
  ) {
    reasons.push(
      "The image appears blurry. Hold the camera steady and retake it.",
    );
  }
  const missingLandmarks = Object.entries(measurements.landmarkVisibility)
    .filter(
      ([, confidence]) =>
        confidence < thresholds.quality.minimumLandmarkVisibility,
    )
    .map(([name]) => name);
  if (missingLandmarks.length) {
    reasons.push(
      `Required body parts are not clearly visible: ${missingLandmarks.join(
        ", ",
      )}. Retake with your full body in frame.`,
    );
  }
  return {
    passed: reasons.length === 0,
    reasons,
    confidence: measurements.averageVisibility,
    visibleBodyFraction: measurements.visibleBodyFraction,
  };
}
