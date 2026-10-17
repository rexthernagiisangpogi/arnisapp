import {
    requireFirebaseRuntime,
    requireFirestore,
} from "../../../services/firebase";
import type { StudentRosterInput, StudentRosterRecord } from "../types";

function api() {
  return requireFirebaseRuntime().firestoreApi;
}

export async function listTeacherStudents(
  teacherId: string,
): Promise<StudentRosterRecord[]> {
  const firestoreApi = api();
  const rosterQuery = firestoreApi.query(
    firestoreApi.collection(requireFirestore(), "students"),
    firestoreApi.where("created_by", "==", teacherId),
  );
  const [snapshot, assignmentSnapshot] = await Promise.all([
    firestoreApi.getDocs(rosterQuery),
    firestoreApi.getDocs(
      firestoreApi.query(
        firestoreApi.collection(requireFirestore(), "student_assignments"),
        firestoreApi.where("teacher_id", "==", teacherId),
      ),
    ),
  ]);
  const linkedUsers = new Map<string, string>();
  assignmentSnapshot.docs.forEach((assignment) => {
    const data = assignment.data();
    if (
      typeof data.roster_id === "string" &&
      typeof data.student_id === "string"
    ) {
      linkedUsers.set(data.roster_id, data.student_id);
    }
  });
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<StudentRosterRecord, "id">),
    linked_user_id: linkedUsers.get(item.id),
  }));
}

export async function addStudent(
  teacherId: string,
  input: StudentRosterInput,
): Promise<void> {
  const firestoreApi = api();
  const ref = firestoreApi.doc(
    firestoreApi.collection(requireFirestore(), "students"),
  );
  await firestoreApi.setDoc(ref, {
    created_by: teacherId,
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name.trim(),
    grade: input.grade.trim(),
    section: input.section.trim(),
    status: "active",
    created_at: firestoreApi.serverTimestamp(),
    updated_at: firestoreApi.serverTimestamp(),
  });
}

export async function updateStudent(
  id: string,
  input: StudentRosterInput,
): Promise<void> {
  const firestoreApi = api();
  await firestoreApi.setDoc(
    firestoreApi.doc(requireFirestore(), "students", id),
    {
      email: input.email.trim().toLowerCase(),
      full_name: input.full_name.trim(),
      grade: input.grade.trim(),
      section: input.section.trim(),
      updated_at: firestoreApi.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setStudentArchived(
  id: string,
  isArchived: boolean,
): Promise<void> {
  const firestoreApi = api();
  await firestoreApi.setDoc(
    firestoreApi.doc(requireFirestore(), "students", id),
    {
      status: isArchived ? "archived" : "active",
      updated_at: firestoreApi.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function claimStudentRoster(
  studentId: string,
  email: string,
): Promise<boolean> {
  const firestoreApi = api();
  const snapshot = await firestoreApi.getDocs(
    firestoreApi.query(
      firestoreApi.collection(requireFirestore(), "students"),
      firestoreApi.where("email", "==", email.trim().toLowerCase()),
      firestoreApi.where("status", "==", "active"),
    ),
  );
  if (snapshot.size !== 1) return false;

  const roster = snapshot.docs[0];
  const data = roster.data();
  if (typeof data.created_by !== "string") return false;

  await firestoreApi.setDoc(
    firestoreApi.doc(requireFirestore(), "student_assignments", studentId),
    {
      student_id: studentId,
      teacher_id: data.created_by,
      roster_id: roster.id,
      created_at: firestoreApi.serverTimestamp(),
    },
  );
  return true;
}
