import {
    requireFirebaseRuntime,
    requireFirestore,
} from "../../../services/firebase";

type Data = Record<string, unknown>;
export type RecentAssessment = {
  id: string;
  student_id: string;
  skill_name: string;
  status: "pending" | "validated";
  overall_score: number | null;
  created_at: unknown;
  strengths: string[];
  improvements: string[];
};

export type TeacherDashboardData = {
  studentCount: number;
  pendingCount: number;
  completedCount: number;
  studentsNeedingSupport: number;
  classAverage: number | null;
  recentAssessments: RecentAssessment[];
};

export type StudentDashboardData = {
  assessments: RecentAssessment[];
  completedSkills: string[];
  strongestSkill: string | null;
};

function toAssessment(id: string, data: Data): RecentAssessment {
  return {
    id,
    student_id: typeof data.student_id === "string" ? data.student_id : "",
    skill_name:
      typeof data.skill_name === "string" ? data.skill_name : "Assessment",
    status: data.status === "validated" ? "validated" : "pending",
    overall_score:
      typeof data.overall_score === "number" ? data.overall_score : null,
    created_at: data.created_at,
    strengths: Array.isArray(data.strengths)
      ? data.strengths.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    improvements: Array.isArray(data.improvements)
      ? data.improvements.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

function timestampValue(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = value.toMillis;
    if (typeof toMillis === "function") return toMillis.call(value);
  }
  return 0;
}

export async function getTeacherDashboardData(
  teacherId: string,
): Promise<TeacherDashboardData> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  const db = requireFirestore();
  const [studentSnapshot, assessmentSnapshot] = await Promise.all([
    firestoreApi.getDocs(
      firestoreApi.query(
        firestoreApi.collection(db, "students"),
        firestoreApi.where("created_by", "==", teacherId),
        firestoreApi.where("status", "==", "active"),
      ),
    ),
    firestoreApi.getDocs(
      firestoreApi.query(
        firestoreApi.collection(db, "assessments"),
        firestoreApi.where("teacher_id", "==", teacherId),
        firestoreApi.where("teacher_viewer_ids", "array-contains", teacherId),
      ),
    ),
  ]);
  const assessments = assessmentSnapshot.docs
    .map((item) => toAssessment(item.id, item.data()))
    .sort(
      (left, right) =>
        timestampValue(right.created_at) - timestampValue(left.created_at),
    );
  const completed = assessments.filter(
    (assessment) => assessment.status === "validated",
  );
  const scores = completed
    .map((assessment) => assessment.overall_score)
    .filter((score): score is number => score !== null);
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;
  const studentAverages = new Map<string, number[]>();
  completed.forEach((assessment) => {
    if (assessment.overall_score === null) return;
    const values = studentAverages.get(assessment.student_id) ?? [];
    values.push(assessment.overall_score);
    studentAverages.set(assessment.student_id, values);
  });
  const studentsNeedingSupport = Array.from(studentAverages.values()).filter(
    (values) =>
      values.reduce((sum, score) => sum + score, 0) / values.length <= 2,
  ).length;

  return {
    studentCount: studentSnapshot.size,
    pendingCount: assessments.filter(
      (assessment) => assessment.status === "pending",
    ).length,
    completedCount: completed.length,
    studentsNeedingSupport,
    classAverage: averageScore,
    recentAssessments: assessments.slice(0, 5),
  };
}

export async function getStudentDashboardData(
  studentId: string,
): Promise<StudentDashboardData> {
  const firestoreApi = requireFirebaseRuntime().firestoreApi;
  const snapshot = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "assessments"),
      firestoreApi.where("student_id", "==", studentId),
      firestoreApi.where("status", "==", "validated"),
    ),
  );
  const assessments = snapshot.docs
    .map((item) => toAssessment(item.id, item.data()))
    .sort(
      (left, right) =>
        timestampValue(right.created_at) - timestampValue(left.created_at),
    );
  const bySkill = new Map<string, number[]>();
  assessments.forEach((assessment) => {
    if (assessment.overall_score === null) return;
    const values = bySkill.get(assessment.skill_name) ?? [];
    values.push(assessment.overall_score);
    bySkill.set(assessment.skill_name, values);
  });
  const strongestSkill =
    Array.from(bySkill.entries()).sort(
      ([, left], [, right]) =>
        right.reduce((sum, score) => sum + score, 0) / right.length -
        left.reduce((sum, score) => sum + score, 0) / left.length,
    )[0]?.[0] ?? null;

  return {
    assessments,
    completedSkills: Array.from(
      new Set(assessments.map((item) => item.skill_name)),
    ),
    strongestSkill,
  };
}
