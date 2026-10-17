import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import skillsData from "../../../../assets/data/skills.json";
import { Button } from "../../../components/Button";
import { TextInput } from "../../../components/TextInput";
import { colors } from "../../../constants/colors";
import {
    listTeacherReferenceImages,
    uploadReferenceImage,
    validateReferenceImage,
    type ReferenceImageRecord,
} from "../services/referenceImagesService";
import type { AssessmentPhase } from "../types";

type Skill = {
  id: string;
  name: string;
  category: string;
  phases: AssessmentPhase[];
};
const skills = skillsData as Skill[];
const metricFields = [
  { id: "leftElbowAngle", label: "Left elbow target (degrees)" },
  { id: "rightElbowAngle", label: "Right elbow target (degrees)" },
  { id: "footSpacingRatio", label: "Foot spacing ratio" },
  { id: "shoulderHipAlignmentRatio", label: "Shoulder/hip alignment ratio" },
] as const;

export function ReferenceManagerScreen({ teacherId }: { teacherId: string }) {
  const [selectedSkillId, setSelectedSkillId] = useState(skills[0]?.id ?? "");
  const [phase, setPhase] = useState<AssessmentPhase>("starting");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<ReferenceImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skill = skills.find((item) => item.id === selectedSkillId) ?? skills[0];

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setReferences(await listTeacherReferenceImages(teacherId));
    } catch {
      setError(
        "Reference images could not be loaded. Check teacher access and connectivity.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function chooseImage() {
    const result = await launchImageLibrary({
      mediaType: "photo",
      selectionLimit: 1,
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.8,
    });
    if (result.errorCode) {
      setError(
        result.errorCode === "permission"
          ? "Allow photo access to select a reference image."
          : "The image could not be selected.",
      );
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setImageUri(asset.uri);
    setError(null);
  }

  async function saveReference() {
    if (!skill || !imageUri || !description.trim()) {
      setError("Choose a reference image and add a description.");
      return;
    }
    const metrics: Record<string, { target: number; tolerance: number }> = {};
    for (const field of metricFields) {
      const raw = metricValues[field.id]?.trim();
      if (!raw) continue;
      const target = Number(raw);
      if (!Number.isFinite(target)) {
        setError(`Enter a valid number for ${field.label.toLowerCase()}.`);
        return;
      }
      metrics[field.id] = {
        target,
        tolerance: field.id.toLowerCase().includes("angle") ? 18 : 0.2,
      };
    }
    if (!Object.keys(metrics).length) {
      setError("Add at least one measurable reference target before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await uploadReferenceImage({
        teacherId,
        skillId: skill.id,
        phase,
        uri: imageUri,
        description,
        keyPoints: Object.fromEntries(
          metricFields
            .filter((field) => metricValues[field.id])
            .map((field) => [field.id, metricValues[field.id]]),
        ),
        metrics,
      });
      setImageUri(null);
      setDescription("");
      setMetricValues({});
      await refresh();
    } catch {
      setError(
        "Reference upload failed. Check Firebase Storage, Firestore rules, and teacher approval.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function markValidated(referenceId: string) {
    setError(null);
    try {
      await validateReferenceImage(referenceId, teacherId);
      await refresh();
    } catch {
      setError(
        "The reference could not be validated. Confirm the upload is complete and teacher access is approved.",
      );
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.warning}>
        Only instructor-reviewed reference images may be used for automatic
        scoring.
      </Text>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Skill</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.choices}
        >
          {skills.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setSelectedSkillId(item.id);
                setPhase(item.phases[0]);
              }}
              style={[
                styles.choice,
                item.id === selectedSkillId && styles.choiceSelected,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  item.id === selectedSkillId && styles.choiceTextSelected,
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Phase</Text>
        <View style={styles.phaseChoices}>
          {skill?.phases.map((item) => (
            <Pressable
              key={item}
              onPress={() => setPhase(item)}
              style={[
                styles.phaseChoice,
                phase === item && styles.phaseSelected,
              ]}
            >
              <Text
                style={[
                  styles.phaseText,
                  phase === item && styles.phaseTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void chooseImage()}
        style={styles.imagePicker}
      >
        <Text style={styles.imagePickerTitle}>
          {imageUri ? "Reference image selected" : "Choose reference image"}
        </Text>
        <Text style={styles.imagePickerSub}>
          {imageUri
            ? "Tap to replace this image"
            : "Select an instructor-approved photo"}
        </Text>
      </Pressable>
      <TextInput
        label="Description"
        onChangeText={setDescription}
        placeholder="Describe the expected position for this phase"
        value={description}
      />
      <Text style={styles.targetsTitle}>Pose targets · draft measurements</Text>
      {metricFields.map((field) => (
        <TextInput
          key={field.id}
          keyboardType="decimal-pad"
          label={field.label}
          onChangeText={(value) =>
            setMetricValues((current) => ({ ...current, [field.id]: value }))
          }
          placeholder="Optional until reviewed"
          value={metricValues[field.id] ?? ""}
        />
      ))}
      {error && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        label="Upload unvalidated reference"
        loading={isSaving}
        onPress={() => void saveReference()}
      />
      <View style={styles.uploadedSection}>
        <Text style={styles.uploadedTitle}>Uploaded references</Text>
        {isLoading ? (
          <Text style={styles.muted}>Loading references…</Text>
        ) : references.length ? (
          references.map((item) => (
            <View key={item.id} style={styles.referenceRow}>
              <View style={styles.referenceCopy}>
                <Text style={styles.referenceName}>
                  {skills.find((entry) => entry.id === item.skill_id)?.name ??
                    item.skill_id}{" "}
                  · {item.phase}
                </Text>
                <Text
                  style={item.validated ? styles.validated : styles.unvalidated}
                >
                  {item.validated
                    ? `Validated by ${item.validated_by ?? "teacher"}`
                    : "Pending validation"}
                </Text>
              </View>
              {!item.validated && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void markValidated(item.id)}
                  style={styles.validateButton}
                >
                  <Text style={styles.validateText}>Validate</Text>
                </Pressable>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No reference images uploaded yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 15, paddingBottom: 25 },
  warning: {
    backgroundColor: "#FFF0D0",
    borderRadius: 8,
    color: "#70440F",
    fontSize: 11,
    lineHeight: 16,
    padding: 11,
  },
  fieldGroup: { gap: 7 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  choices: { gap: 6 },
  choice: {
    backgroundColor: "#EAF0EF",
    borderRadius: 7,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 10,
  },
  choiceSelected: { backgroundColor: colors.teal },
  choiceText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  choiceTextSelected: { color: colors.white },
  phaseChoices: { flexDirection: "row", gap: 6 },
  phaseChoice: {
    backgroundColor: "#EAF0EF",
    borderRadius: 7,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 6,
  },
  phaseSelected: { backgroundColor: colors.teal },
  phaseText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "capitalize",
  },
  phaseTextSelected: { color: colors.white },
  imagePicker: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.teal,
    borderRadius: 9,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 74,
    padding: 12,
  },
  imagePickerTitle: { color: colors.tealDark, fontSize: 12, fontWeight: "800" },
  imagePickerSub: { color: colors.muted, fontSize: 10 },
  targetsTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  error: { color: colors.danger, fontSize: 11, lineHeight: 16 },
  uploadedSection: { gap: 9, marginTop: 8 },
  uploadedTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  referenceRow: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  referenceCopy: { flex: 1, gap: 4 },
  referenceName: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  validated: { color: colors.success, fontSize: 9, fontWeight: "700" },
  unvalidated: { color: colors.danger, fontSize: 9, fontWeight: "700" },
  validateButton: {
    backgroundColor: "#E0F2EF",
    borderRadius: 7,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 10,
  },
  validateText: { color: colors.tealDark, fontSize: 10, fontWeight: "800" },
});
