import type { PoseDetectionResultBundle } from "react-native-mediapipe-posedetection";
import thresholds from "../../../../assets/data/analysis-thresholds.json";
import { inspectJpegQuality } from "../logic/imageQuality";
import {
    computePoseMeasurements,
    evaluateImageQuality,
    type Pose,
} from "../logic/poseAnalysis";
import type { AssessmentImage, QualityResult } from "../types";

const MODEL = "pose_landmarker_lite.task";

export type ImageAnalysis = {
  phase: AssessmentImage["phase"];
  quality: QualityResult;
  pose: Pose | null;
  error: string | null;
};

type PoseApi = typeof import("react-native-mediapipe-posedetection");

export async function analyzeAssessmentImage(
  image: AssessmentImage & { base64?: string },
): Promise<ImageAnalysis> {
  const pixels = image.base64 ? inspectJpegQuality(image.base64) : null;
  try {
    const poseApi = require("react-native-mediapipe-posedetection") as PoseApi;
    const result = (await poseApi.PoseDetectionOnImage(image.uri, MODEL, {
      numPoses: 1,
      minPoseDetectionConfidence: thresholds.quality.minimumLandmarkVisibility,
      minPosePresenceConfidence: thresholds.quality.minimumLandmarkVisibility,
      minTrackingConfidence: thresholds.quality.minimumLandmarkVisibility,
      delegate: poseApi.Delegate.CPU,
    })) as PoseDetectionResultBundle;
    const pose = result.results?.[0]?.landmarks?.[0] as Pose | undefined;
    const resolvedPose = pose && pose.length ? pose : null;
    const measurements = resolvedPose
      ? computePoseMeasurements(resolvedPose)
      : null;
    return {
      phase: image.phase,
      quality: evaluateImageQuality(image, measurements, pixels),
      pose: resolvedPose,
      error: measurements
        ? null
        : "Pose detection did not return enough visible body landmarks.",
    };
  } catch (cause) {
    return {
      phase: image.phase,
      quality: evaluateImageQuality(image, null, pixels),
      pose: null,
      error: cause instanceof Error ? cause.message : "Pose detection failed.",
    };
  }
}
