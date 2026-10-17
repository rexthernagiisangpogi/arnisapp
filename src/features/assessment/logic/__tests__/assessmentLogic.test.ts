import type { ValidatedReference } from "../../types";
import { comparePoseToReference } from "../comparison";
import type { Pose } from "../poseAnalysis";
import { computePoseMeasurements, evaluateImageQuality } from "../poseAnalysis";
import {
    averageScore,
    getRelevantCriteria,
    getRubricDescriptor,
    performanceLevel,
} from "../rubricEngine";

function samplePose(): Pose {
  const pose = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.95,
  }));
  pose[11] = { x: 0.4, y: 0.3, visibility: 0.95 };
  pose[12] = { x: 0.6, y: 0.3, visibility: 0.95 };
  pose[13] = { x: 0.35, y: 0.45, visibility: 0.95 };
  pose[14] = { x: 0.65, y: 0.45, visibility: 0.95 };
  pose[15] = { x: 0.3, y: 0.6, visibility: 0.95 };
  pose[16] = { x: 0.7, y: 0.6, visibility: 0.95 };
  pose[23] = { x: 0.44, y: 0.55, visibility: 0.95 };
  pose[24] = { x: 0.56, y: 0.55, visibility: 0.95 };
  pose[25] = { x: 0.42, y: 0.75, visibility: 0.95 };
  pose[26] = { x: 0.58, y: 0.75, visibility: 0.95 };
  pose[27] = { x: 0.4, y: 0.9, visibility: 0.95 };
  pose[28] = { x: 0.6, y: 0.9, visibility: 0.95 };
  return pose;
}

describe("rubric scoring", () => {
  it("rounds the arithmetic mean to the nearest integer with halves up", () => {
    expect(averageScore([4, 3])).toBe(4);
    expect(averageScore([1, 2, 2])).toBe(2);
    expect(averageScore([])).toBeNull();
    expect(averageScore([0, 5])).toBeNull();
  });

  it("maps 1-4 to the configured performance levels", () => {
    expect([1, 2, 3, 4].map(performanceLevel)).toEqual([
      "Beginning",
      "Developing",
      "Proficient",
      "Advanced",
    ]);
    expect(performanceLevel(null)).toBe("Not scored");
  });

  it("looks up a draft descriptor and filters relevant rubric areas", () => {
    expect(getRubricDescriptor("strike-angle", 3)).toContain("arm angle");
    expect(getRubricDescriptor("unknown-criterion", 2)).toBeNull();
    expect(
      getRelevantCriteria(["footwork-stance"]).map((area) => area.name),
    ).toEqual(["Footwork and Stance"]);
  });
});

describe("image quality checks", () => {
  const image = { width: 1080, height: 1920, fileSize: 400_000 };
  const pixels = { meanLuminance: 112, sharpnessVariance: 40 };

  it("passes a full-body, visible pose with adequate image measurements", () => {
    const measurements = computePoseMeasurements(samplePose());
    expect(measurements).not.toBeNull();
    expect(evaluateImageQuality(image, measurements, pixels).passed).toBe(true);
  });

  it("reports specific reasons for low resolution, darkness, blur, and missing pose", () => {
    const measurements = computePoseMeasurements(samplePose());
    const lowQuality = evaluateImageQuality(
      { width: 320, height: 240, fileSize: 500 },
      measurements,
      { meanLuminance: 10, sharpnessVariance: 2 },
    );
    expect(lowQuality.passed).toBe(false);
    expect(
      lowQuality.reasons.some((reason) => reason.includes("resolution")),
    ).toBe(true);
    expect(lowQuality.reasons.some((reason) => reason.includes("dark"))).toBe(
      true,
    );
    expect(lowQuality.reasons.some((reason) => reason.includes("blurry"))).toBe(
      true,
    );

    const noPose = evaluateImageQuality(image, null, pixels);
    expect(noPose.passed).toBe(false);
    expect(noPose.reasons[0]).toContain("pose could not be detected");
  });
});

describe("reference comparison", () => {
  it("scores fixed sample keypoints only against a validated reference", () => {
    const measurements = computePoseMeasurements(samplePose());
    expect(measurements).not.toBeNull();
    const reference: ValidatedReference = {
      skill_id: "strike-1",
      validated: true,
      metrics: {
        leftElbowAngle: { target: measurements!.leftElbowAngle, tolerance: 18 },
        footSpacingRatio: {
          target: measurements!.footSpacingRatio + 0.2,
          tolerance: 0.2,
        },
      },
    };
    const scores = comparePoseToReference(measurements!, reference);
    expect(scores.map((item) => item.score)).toEqual([4, 3]);
    expect(
      comparePoseToReference(measurements!, {
        ...reference,
        validated: false,
      } as unknown as ValidatedReference),
    ).toEqual([]);
  });
});
