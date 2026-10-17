import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextInput } from "../../../components/TextInput";
import { colors } from "../../../constants/colors";
import { updateProfile } from "../services/profileService";
import type { Profile } from "../types";

export function ProfileScreen({
  profile,
  onSignOut,
}: {
  profile: Profile;
  onSignOut: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [grade, setGrade] = useState(profile.grade);
  const [section, setSection] = useState(profile.section);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateProfile(profile.user_id, {
        full_name: fullName,
        grade,
        section,
      });
      setIsEditing(false);
    } catch {
      setError(
        "Profile changes could not be saved. Check your connection and access.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.kicker}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.profileDetails}>
          {isEditing ? (
            <>
              <TextInput
                label="Full name"
                onChangeText={setFullName}
                value={fullName}
              />
              {profile.role === "student" && (
                <>
                  <TextInput
                    keyboardType="number-pad"
                    label="Grade"
                    onChangeText={setGrade}
                    value={grade}
                  />
                  <TextInput
                    label="Section"
                    onChangeText={setSection}
                    value={section}
                  />
                </>
              )}
              {error && <Text style={styles.error}>{error}</Text>}
              <Button
                label="Save profile"
                loading={isSaving}
                onPress={() => void saveProfile()}
              />
              <Pressable onPress={() => setIsEditing(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.name}>{fullName}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.edit}>Edit profile</Text>
              </Pressable>
            </>
          )}
          <Text style={styles.role}>
            {profile.role === "teacher" ? "Teacher" : "Student"}
          </Text>
          {!isEditing && profile.role === "student" && (
            <Text style={styles.classInfo}>
              Grade {grade} · Section {section}
            </Text>
          )}
        </View>
        <Button label="Sign out" onPress={onSignOut} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 14, padding: 24, paddingTop: 36 },
  kicker: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: { color: colors.ink, fontSize: 27, fontWeight: "800" },
  profileDetails: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    marginVertical: 6,
    padding: 18,
  },
  name: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  role: { color: colors.tealDark, fontSize: 14, fontWeight: "700" },
  classInfo: { color: colors.muted, fontSize: 13 },
  edit: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 4,
  },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  cancel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    padding: 7,
    textAlign: "center",
  },
});
