import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Button } from "../../../components/Button";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextInput } from "../../../components/TextInput";
import { colors } from "../../../constants/colors";
import {
    addStudent,
    listTeacherStudents,
    setStudentArchived,
    updateStudent,
} from "../services/studentsService";
import type { StudentRosterInput, StudentRosterRecord } from "../types";

const emptyStudent: StudentRosterInput = {
  full_name: "",
  email: "",
  grade: "7",
  section: "",
};

export function StudentsScreen({ teacherId }: { teacherId: string }) {
  const [students, setStudents] = useState<StudentRosterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [isArchivedVisible, setIsArchivedVisible] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editing, setEditing] = useState<StudentRosterRecord | null>(null);
  const [form, setForm] = useState<StudentRosterInput>(emptyStudent);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setStudents(await listTeacherStudents(teacherId));
    } catch {
      setError(
        "Student records could not be loaded. Check your connection and teacher access.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return students.filter((student) => {
      const isArchived = student.status === "archived";
      return (
        isArchived === isArchivedVisible &&
        (!normalizedSearch ||
          student.full_name.toLowerCase().includes(normalizedSearch) ||
          student.email.toLowerCase().includes(normalizedSearch)) &&
        (!gradeFilter.trim() || student.grade === gradeFilter.trim()) &&
        (!sectionFilter.trim() ||
          student.section.toLowerCase() === sectionFilter.trim().toLowerCase())
      );
    });
  }, [gradeFilter, isArchivedVisible, search, sectionFilter, students]);

  function openCreate() {
    setEditing(null);
    setForm(emptyStudent);
    setFormError(null);
    setIsFormVisible(true);
  }

  function openEdit(student: StudentRosterRecord) {
    setEditing(student);
    setForm({
      full_name: student.full_name,
      email: student.email,
      grade: student.grade,
      section: student.section,
    });
    setFormError(null);
    setIsFormVisible(true);
  }

  async function saveStudent() {
    if (!form.full_name.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setFormError("Enter the student’s name and a valid email address.");
      return;
    }
    if (!form.grade.trim() || !form.section.trim()) {
      setFormError("Enter the student’s grade and section.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      if (editing) await updateStudent(editing.id, form);
      else await addStudent(teacherId, form);
      setIsFormVisible(false);
      await refresh();
    } catch {
      setFormError(
        "The student record could not be saved. Check your teacher access and connection.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleArchive(student: StudentRosterRecord) {
    try {
      await setStudentArchived(student.id, student.status === "active");
      await refresh();
    } catch {
      setError("The student record could not be updated.");
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <Text style={styles.kicker}>TEACHER PORTAL</Text>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>Students</Text>
            <Text style={styles.subtitle}>
              Manage your Grade 7 class roster.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openCreate}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
        <TextInput
          label="Search students"
          onChangeText={setSearch}
          placeholder="Name or email"
          value={search}
        />
        <View style={styles.filters}>
          <View style={styles.filterInput}>
            <TextInput
              keyboardType="number-pad"
              label="Grade"
              onChangeText={setGradeFilter}
              placeholder="All"
              value={gradeFilter}
            />
          </View>
          <View style={styles.filterInput}>
            <TextInput
              label="Section"
              onChangeText={setSectionFilter}
              placeholder="All"
              value={sectionFilter}
            />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsArchivedVisible((value) => !value)}
          style={styles.archiveToggle}
        >
          <Text style={styles.archiveToggleText}>
            {isArchivedVisible
              ? "View active students"
              : "View archived students"}
          </Text>
        </Pressable>
        {isLoading ? (
          <Text style={styles.stateText}>Loading students…</Text>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{error}</Text>
            <Button label="Retry" onPress={() => void refresh()} />
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {isArchivedVisible ? "No archived students" : "No students yet"}
            </Text>
            <Text style={styles.emptyText}>
              {isArchivedVisible
                ? "Archived students will appear here."
                : "Add a student to start building your class roster."}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {filteredStudents.map((student) => (
              <View key={student.id} style={styles.studentRow}>
                <View style={styles.studentCopy}>
                  <Text style={styles.studentName}>{student.full_name}</Text>
                  <Text style={styles.studentEmail}>{student.email}</Text>
                  <Text style={styles.studentClass}>
                    Grade {student.grade} · Section {student.section}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openEdit(student)}
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void toggleArchive(student)}
                  >
                    <Text style={styles.archiveText}>
                      {student.status === "active" ? "Archive" : "Restore"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <Modal
          animationType="slide"
          onRequestClose={() => setIsFormVisible(false)}
          transparent
          visible={isFormVisible}
        >
          <View style={styles.modalBackdrop}>
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>
                  {editing ? "Edit student" : "Add student"}
                </Text>
                <TextInput
                  autoCapitalize="words"
                  label="Full name"
                  onChangeText={(full_name) =>
                    setForm((value) => ({ ...value, full_name }))
                  }
                  placeholder="Student name"
                  value={form.full_name}
                />
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={(email) =>
                    setForm((value) => ({ ...value, email }))
                  }
                  placeholder="student@school.edu"
                  value={form.email}
                />
                <View style={styles.filters}>
                  <View style={styles.filterInput}>
                    <TextInput
                      keyboardType="number-pad"
                      label="Grade"
                      onChangeText={(grade) =>
                        setForm((value) => ({ ...value, grade }))
                      }
                      placeholder="7"
                      value={form.grade}
                    />
                  </View>
                  <View style={styles.filterInput}>
                    <TextInput
                      label="Section"
                      onChangeText={(section) =>
                        setForm((value) => ({ ...value, section }))
                      }
                      placeholder="Section"
                      value={form.section}
                    />
                  </View>
                </View>
                {formError && <Text style={styles.formError}>{formError}</Text>}
                <Button
                  label={editing ? "Save changes" : "Add student"}
                  loading={isSaving}
                  onPress={() => void saveStudent()}
                />
                <Pressable onPress={() => setIsFormVisible(false)}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 13, padding: 20, paddingTop: 22 },
  kicker: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headingCopy: { flex: 1, gap: 3 },
  title: { color: colors.ink, fontSize: 25, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 12 },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 62,
  },
  addButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  filters: { flexDirection: "row", gap: 10 },
  filterInput: { flex: 1 },
  archiveToggle: { alignSelf: "flex-start", paddingVertical: 5 },
  archiveToggleText: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: "700",
  },
  list: { gap: 9, paddingBottom: 20 },
  studentRow: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 13,
  },
  studentCopy: { flex: 1, gap: 4 },
  studentName: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  studentEmail: { color: colors.muted, fontSize: 11 },
  studentClass: { color: colors.tealDark, fontSize: 11, fontWeight: "700" },
  rowActions: { alignItems: "flex-end", gap: 12 },
  actionText: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: "800",
    padding: 4,
  },
  archiveText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
    padding: 4,
  },
  stateText: { color: colors.muted, fontSize: 13, paddingVertical: 18 },
  emptyState: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    gap: 9,
    marginTop: 4,
    padding: 16,
  },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  modalBackdrop: {
    backgroundColor: "rgba(16,42,67,0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalScroll: { justifyContent: "flex-end", minHeight: "100%" },
  modalSheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 15,
    padding: 23,
    paddingBottom: 32,
  },
  modalTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  formError: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  cancel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    padding: 8,
    textAlign: "center",
  },
});
