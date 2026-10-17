import referenceSeed from "../../../../assets/data/reference-library.json";
import {
    requireFirebaseRuntime,
    requireFirestore,
} from "../../../services/firebase";
import { uploadLocalImage } from "../../../services/firebaseStorage";
import type { AssessmentPhase, ValidatedReference } from "../types";

export type ReferenceImageRecord = {
  id: string;
  skill_id: string;
  phase: AssessmentPhase;
  description: string;
  image_url: string;
  storage_path: string;
  key_points: Record<string, string | number>;
  metrics: Partial<Record<string, { target: number; tolerance: number }>>;
  validated: boolean;
  validated_by: string | null;
  validated_at: unknown;
  teacher_id: string;
};

export type ReferenceSeed = {
  skill_id: string;
  category: string;
  name: string;
  phases: Array<{
    phase: AssessmentPhase;
    description: string;
    image_placeholder: string;
    key_points: Record<string, string>;
    validated: false;
    validated_by: null;
    validated_at: null;
  }>;
};

export const getReferenceSeeds = () => referenceSeed as ReferenceSeed[];

export async function listTeacherReferenceImages(
  teacherId: string,
): Promise<ReferenceImageRecord[]> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  const snapshot = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "reference_images"),
      firestoreApi.where("teacher_id", "==", teacherId),
    ),
  );
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<ReferenceImageRecord, "id">),
  }));
}

export async function getValidatedReference(
  skillId: string,
  phase: AssessmentPhase,
): Promise<ValidatedReference | null> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  const result = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "reference_images"),
      firestoreApi.where("skill_id", "==", skillId),
      firestoreApi.where("phase", "==", phase),
      firestoreApi.where("validated", "==", true),
    ),
  );
  const record = result.docs[0]?.data();
  if (!record || !record.metrics || typeof record.metrics !== "object")
    return null;
  return {
    skill_id: skillId,
    validated: true,
    metrics: record.metrics,
  } as ValidatedReference;
}

export async function getValidatedReferenceRecord(
  skillId: string,
  phase: AssessmentPhase,
): Promise<ReferenceImageRecord | null> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  const result = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "reference_images"),
      firestoreApi.where("skill_id", "==", skillId),
      firestoreApi.where("phase", "==", phase),
      firestoreApi.where("validated", "==", true),
    ),
  );
  const first = result.docs[0];
  return first
    ? ({
        id: first.id,
        ...(first.data() as Omit<ReferenceImageRecord, "id">),
      } as ReferenceImageRecord)
    : null;
}

export async function uploadReferenceImage(input: {
  teacherId: string;
  skillId: string;
  phase: AssessmentPhase;
  uri: string;
  description: string;
  keyPoints: Record<string, string>;
  metrics: Record<string, { target: number; tolerance: number }>;
}): Promise<string> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  const document = firestoreApi.doc(
    firestoreApi.collection(requireFirestore(), "reference_images"),
  );
  const storagePath = `reference-images/${document.id}/${input.phase}.jpg`;
  const placeholder = {
    skill_id: input.skillId,
    phase: input.phase,
    description: input.description.trim(),
    image_url: "",
    storage_path: storagePath,
    key_points: input.keyPoints,
    metrics: input.metrics,
    validated: false,
    validated_by: null,
    validated_at: null,
    teacher_id: input.teacherId,
    created_at: firestoreApi.serverTimestamp(),
  };
  await firestoreApi.setDoc(document, placeholder);
  const imageUrl = await uploadLocalImage(storagePath, input.uri);
  await firestoreApi.setDoc(document, { image_url: imageUrl }, { merge: true });
  return document.id;
}

export async function validateReferenceImage(
  referenceId: string,
  teacherId: string,
): Promise<void> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  const docRef = firestoreApi.doc(
    requireFirestore(),
    "reference_images",
    referenceId,
  );
  const snapshot = await firestoreApi.getDoc(docRef);
  if (!snapshot.exists() || !snapshot.data().image_url) {
    throw new Error("Upload the reference image before validating it.");
  }
  await firestoreApi.setDoc(
    docRef,
    {
      validated: true,
      validated_by: teacherId,
      validated_at: firestoreApi.serverTimestamp(),
    },
    { merge: true },
  );
}
