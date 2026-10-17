import type { UserRole } from "../auth/types";

export type AssessmentPhase = "starting" | "execution" | "final" | "single";
export type AssessmentStatus = "pending" | "validated";
export type AssessmentType = "image" | "manual" | "challenge";
export type ScoreLevel = 1 | 2 | 3 | 4;

export type AssessmentScores = Record<string, Record<string, ScoreLevel>>;
export type StoredAssessment = PendingAssessmentInput & {
  id: string;
  created_at: unknown;
  validated_at?: unknown;
  validated_by?: string | null;
};
export type AssessmentImage = {
  phase: AssessmentPhase;
  uri: string;
  width: number;
  height: number;
  fileSize: number;
  type?: string;
};

export type ImagePixelsQuality = {
  meanLuminance: number;
  sharpnessVariance: number;
};

export type QualityResult = {
  passed: boolean;
  reasons: string[];
  confidence: number;
  visibleBodyFraction: number;
};

export type PoseMeasurements = {
  leftElbowAngle: number;
  rightElbowAngle: number;
  footSpacingRatio: number;
  shoulderHipAlignmentRatio: number;
  visibleBodyFraction: number;
  averageVisibility: number;
  landmarkVisibility: Record<string, number>;
};

export type ReferenceMetric = { target: number; tolerance: number };
export type NumericPoseMetric = Exclude<
  keyof PoseMeasurements,
  "landmarkVisibility"
>;
export type ValidatedReference = {
  skill_id: string;
  validated: true;
  metrics: Partial<Record<NumericPoseMetric, ReferenceMetric>>;
};

export type AssessmentProfile = {
  id: string;
  email: string;
  full_name: string;
  grade: string;
  section: string;
  role: UserRole;
};

export type PendingAssessmentInput = {
  student_id: string;
  teacher_id: string;
  teacher_viewer_ids: string[];
  skill_id: string;
  skill_name: string;
  type: AssessmentType;
  status: "pending";
  generated_scores: AssessmentScores | null;
  final_scores: AssessmentScores | null;
  overall_score: number | null;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  teacher_feedback: string;
};
