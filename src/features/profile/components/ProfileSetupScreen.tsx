import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import { TextInput } from "../../../components/TextInput";
import { colors } from "../../../constants/colors";
import type { UserRole } from "../../auth/types";
import type { ProfileInput } from "../types";

type Props = {
  initialName: string;
  initialRole: UserRole;
  isSaving: boolean;
  error: string | null;
  onSubmit: (profile: ProfileInput) => void;
};

export function ProfileSetupScreen({
  initialName,
  initialRole,
  isSaving,
  error,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function saveProfile() {
    if (!name.trim()) {
      setValidationError("Enter your name to continue.");
      return;
    }
    if (role === "student" && (!grade.trim() || !section.trim())) {
      setValidationError("Add your grade and section to continue.");
      return;
    }
    setValidationError(null);
    onSubmit({ full_name: name, role, grade, section });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>A</Text>
      </View>
      <Text style={styles.eyebrow}>FIRST-TIME SETUP</Text>
      <Text style={styles.title}>Set up your profile</Text>
      <Text style={styles.subtitle}>
        A few details help Arnis-Assess show the right learning and assessment
        tools.
      </Text>

      <TextInput
        autoCapitalize="words"
        label="Full name"
        onChangeText={setName}
        placeholder="Enter your name"
        value={name}
      />

      <View style={styles.roleSection}>
        <Text style={styles.label}>I am a</Text>
        <View style={styles.roleOptions}>
          {(["student", "teacher"] as UserRole[]).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === option }}
              onPress={() => setRole(option)}
              style={[
                styles.roleOption,
                role === option && styles.roleSelected,
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  role === option && styles.roleTextSelected,
                ]}
              >
                {option === "student" ? "Student" : "Teacher"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {role === "student" && (
        <View style={styles.classFields}>
          <TextInput
            keyboardType="number-pad"
            label="Grade"
            onChangeText={setGrade}
            placeholder="7"
            value={grade}
          />
          <TextInput
            autoCapitalize="characters"
            label="Section"
            onChangeText={setSection}
            placeholder="e.g. Mabini"
            value={section}
          />
        </View>
      )}

      {(validationError || error) && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {validationError ?? error}
        </Text>
      )}
      {role === "teacher" && (
        <Text style={styles.note}>
          Teacher data access is granted by your school administrator.
        </Text>
      )}
      <Button label="Continue" loading={isSaving} onPress={saveProfile} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.paper,
    flex: 1,
    gap: 19,
    justifyContent: "center",
    padding: 26,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  brandMarkText: { color: colors.white, fontSize: 23, fontWeight: "900" },
  eyebrow: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: { color: colors.ink, fontSize: 29, fontWeight: "800", marginTop: -11 },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: -11,
  },
  roleSection: { gap: 8 },
  label: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  roleOptions: { flexDirection: "row", gap: 10 },
  roleOption: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  roleSelected: { backgroundColor: "#E0F2EF", borderColor: colors.teal },
  roleText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  roleTextSelected: { color: colors.tealDark },
  classFields: { gap: 15 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
