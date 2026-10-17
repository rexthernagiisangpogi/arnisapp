import {
    requireFirebaseRuntime,
    requireFirestore,
} from "../../../services/firebase";
import { uploadLocalImage } from "../../../services/firebaseStorage";
import { overallScore } from "../logic/assessmentScoring";
import type {
    AssessmentImage,
    PendingAssessmentInput,
    StoredAssessment,
} from "../types";

type AssessmentDocument = Omit<PendingAssessmentInput, "status"> & {
  status: "pending" | "validated";
  created_at: unknown;
  validated_at?: unknown;
  validated_by?: string | null;
};

function api() {
  return requireFirebaseRuntime().firestoreApi;
}

export async function createPendingAssessment(
  input: PendingAssessmentInput,
): Promise<string> {
  const firestoreApi = api();
  const document = firestoreApi.doc(
    firestoreApi.collection(requireFirestore(), "assessments"),
  );
  await firestoreApi.setDoc(document, {
    ...input,
    created_at: firestoreApi.serverTimestamp(),
    validated_at: null,
    validated_by: null,
  });
  return document.id;
}

export async function uploadAssessmentImage(input: {
  assessmentId: string;
  studentId: string;
  teacherId: string;
  image: AssessmentImage;
  quality: Record<string, unknown>;
  analysis: Record<string, unknown> | null;
}): Promise<void> {
  const firestoreApi = api();
  const imageId = firestoreApi.doc(
    firestoreApi.collection(requireFirestore(), "assessment_images"),
  ).id;
  const storagePath = `assessment-images/${input.assessmentId}/${input.studentId}/${input.image.phase}-${imageId}.jpg`;
  const imageUrl = await uploadLocalImage(storagePath, input.image.uri);
  await firestoreApi.setDoc(
    firestoreApi.doc(requireFirestore(), "assessment_images", imageId),
    {
      assessment_id: input.assessmentId,
      student_id: input.studentId,
      teacher_id: input.teacherId,
      phase: input.image.phase,
      image_url: imageUrl,
      width: input.image.width,
      height: input.image.height,
      file_size: input.image.fileSize,
      quality_check_result: input.quality,
      analysis_data: input.analysis,
      created_at: firestoreApi.serverTimestamp(),
    },
  );
}

export async function listPendingAssessments(
  teacherId: string,
): Promise<StoredAssessment[]> {
  const firestoreApi = api();
  const snapshot = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "assessments"),
      firestoreApi.where("teacher_id", "==", teacherId),
      firestoreApi.where("teacher_viewer_ids", "array-contains", teacherId),
      firestoreApi.where("status", "==", "pending"),
    ),
  );
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as AssessmentDocument),
  })) as StoredAssessment[];
}

export async function listStudentPendingAssessments(
  studentId: string,
): Promise<StoredAssessment[]> {
  const firestoreApi = api();
  const snapshot = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "assessments"),
      firestoreApi.where("student_id", "==", studentId),
      firestoreApi.where("status", "==", "pending"),
    ),
  );
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as AssessmentDocument),
  })) as StoredAssessment[];
}

export async function listAssessmentImages(assessmentId: string) {
  const firestoreApi = api();
  const snapshot = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "assessment_images"),
      firestoreApi.where("assessment_id", "==", assessmentId),
    ),
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listStudentValidatedAssessments(
  studentId: string,
): Promise<StoredAssessment[]> {
  const firestoreApi = api();
  const snapshot = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "assessments"),
      firestoreApi.where("student_id", "==", studentId),
      firestoreApi.where("status", "==", "validated"),
    ),
  );
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as AssessmentDocument),
  })) as StoredAssessment[];
}

export async function validateAssessment(input: {
  assessmentId: string;
  teacherId: string;
  finalScores: PendingAssessmentInput["final_scores"];
  teacherFeedback: string;
  recommendations: string[];
}): Promise<void> {
  const firestoreApi = api();
  const scores = input.finalScores ?? {};
  await firestoreApi.updateDoc(
    firestoreApi.doc(requireFirestore(), "assessments", input.assessmentId),
    {
      final_scores: input.finalScores,
      overall_score: overallScore(scores),
      teacher_feedback: input.teacherFeedback.trim(),
      recommendations: input.recommendations,
      status: "validated",
      validated_by: input.teacherId,
      validated_at: firestoreApi.serverTimestamp(),
    },
  );
}
