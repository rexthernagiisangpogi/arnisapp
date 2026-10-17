import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Image,
    PermissionsAndroid,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import thresholds from "../../../../assets/data/analysis-thresholds.json";
import skillsData from "../../../../assets/data/skills.json";
import { Button } from "../../../components/Button";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextInput } from "../../../components/TextInput";
import { colors } from "../../../constants/colors";
import type { Profile } from "../../profile/types";
import { listTeacherStudents } from "../../students/services/studentsService";
import type { StudentRosterRecord } from "../../students/types";
import {
    addDerivedOverallArea,
    scoresFromComparisons,
} from "../logic/assessmentScoring";
import { comparePoseToReference } from "../logic/comparison";
import { generateResultText } from "../logic/resultGenerator";
import { getRelevantCriteria, rubricAreas } from "../logic/rubricEngine";
import {
    createPendingAssessment,
    listAssessmentImages,
    listPendingAssessments,
    listStudentPendingAssessments,
    uploadAssessmentImage,
    validateAssessment,
} from "../services/assessmentService";
import {
    analyzeAssessmentImage,
    type ImageAnalysis,
} from "../services/poseDetectionService";
import {
    getValidatedReference,
    getValidatedReferenceRecord,
} from "../services/referenceImagesService";
import type {
    AssessmentImage,
    AssessmentPhase,
    AssessmentScores,
    AssessmentType,
    PendingAssessmentInput,
    ScoreLevel,
    StoredAssessment,
    ValidatedReference,
} from "../types";

type Skill = {
  id: string;
  category: string;
  name: string;
  description: string;
  instructions: string;
  phases: AssessmentPhase[];
  relevant_areas: string[];
};
type CapturedImage = AssessmentImage & { base64?: string };
type Assignment = StoredAssessment & { skill_id: string; skill_name: string };
const skills = skillsData as Skill[];
const areaNamesToIds = new Map(
  rubricAreas().map((area) => [area.name, area.id]),
);

export function AssessmentScreen({ profile }: { profile: Profile }) {
  const isTeacher = profile.role === "teacher";
  const [teacherView, setTeacherView] = useState<"create" | "review">("create");
  const [students, setStudents] = useState<StudentRosterRecord[]>([]);
  const [pending, setPending] = useState<StoredAssessment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("image");
  const [images, setImages] = useState<Record<string, CapturedImage>>({});
  const [analysis, setAnalysis] = useState<ImageAnalysis[]>([]);
  const [generatedScores, setGeneratedScores] =
    useState<AssessmentScores | null>(null);
  const [manualScores, setManualScores] = useState<AssessmentScores>({});
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [selectedReview, setSelectedReview] = useState<StoredAssessment | null>(
    null,
  );
  const [reviewImages, setReviewImages] = useState<Record<string, unknown>[]>(
    [],
  );
  const [finalScores, setFinalScores] = useState<AssessmentScores>({});
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [teacherRecommendations, setTeacherRecommendations] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [validatedReferences, setValidatedReferences] = useState<
    Record<string, ValidatedReference | null>
  >({});
  const [referenceRecords, setReferenceRecords] = useState<
    Record<string, { image_url: string; description: string } | null>
  >({});

  const selectedSkill =
    skills.find((skill) => skill.id === selectedSkillId) ?? null;
  const activeStudent =
    students.find((student) => student.linked_user_id === selectedStudentId) ??
    null;
  const currentAssignment =
    selectedAssignment ?? (assignments.length === 1 ? assignments[0] : null);
  const assignmentSkill =
    skills.find((skill) => skill.id === currentAssignment?.skill_id) ?? null;
  const relevantAreaIds = useMemo(() => {
    const names =
      selectedSkill?.relevant_areas ?? assignmentSkill?.relevant_areas ?? [];
    return names.flatMap((name) =>
      areaNamesToIds.has(name) ? [areaNamesToIds.get(name)!] : [],
    );
  }, [assignmentSkill, selectedSkill]);
  const relevantAreas = useMemo(
    () => getRelevantCriteria(relevantAreaIds),
    [relevantAreaIds],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isTeacher) {
        const [roster, pendingItems] = await Promise.all([
          listTeacherStudents(profile.user_id),
          listPendingAssessments(profile.user_id),
        ]);
        setStudents(roster);
        setPending(pendingItems);
      } else {
        setAssignments(
          (await listStudentPendingAssessments(
            profile.user_id,
          )) as Assignment[],
        );
      }
    } catch {
      setError(
        "Assessment data could not be loaded. Check connectivity and your assigned role.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isTeacher, profile.user_id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let active = true;
    if (!selectedSkill) {
      setValidatedReferences({});
      setReferenceRecords({});
      return () => {
        active = false;
      };
    }
    Promise.all(
      selectedSkill.phases.map(async (phase) => {
        const [reference, record] = await Promise.all([
          getValidatedReference(selectedSkill.id, phase).catch(() => null),
          getValidatedReferenceRecord(selectedSkill.id, phase).catch(
            () => null,
          ),
        ]);
        return [phase, reference, record] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      setValidatedReferences(
        Object.fromEntries(
          entries.map(([phase, reference]) => [phase, reference]),
        ),
      );
      setReferenceRecords(
        Object.fromEntries(
          entries.map(([phase, , record]) => [
            phase,
            record
              ? { image_url: record.image_url, description: record.description }
              : null,
          ]),
        ),
      );
    });
    return () => {
      active = false;
    };
  }, [selectedSkill]);

  useEffect(() => {
    if (!selectedReview) return;
    setFinalScores(selectedReview.generated_scores ?? {});
    setTeacherFeedback(selectedReview.teacher_feedback ?? "");
    setTeacherRecommendations(
      (selectedReview.recommendations ?? []).join("\n"),
    );
    void listAssessmentImages(selectedReview.id)
      .then(setReviewImages)
      .catch(() => setReviewImages([]));
  }, [selectedReview]);

  function resetCaptureState() {
    setImages({});
    setAnalysis([]);
    setGeneratedScores(null);
    setNotice(null);
    setError(null);
  }

  function chooseSkill(skillId: string) {
    setSelectedSkillId(skillId);
    resetCaptureState();
  }

  async function pickPhoto(
    phase: AssessmentPhase,
    source: "camera" | "library",
  ) {
    setError(null);
    if (source === "camera" && Platform.OS === "android") {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        setError(
          "Camera access is required to capture this phase. Allow it in Settings or choose an image from your library.",
        );
        return;
      }
    }
    const options = {
      mediaType: "photo" as const,
      maxWidth: thresholds.capture.maximumDimensionPx,
      maxHeight: thresholds.capture.maximumDimensionPx,
      quality: 0.8 as const,
      includeBase64: true,
      saveToPhotos: false,
      selectionLimit: 1,
    };
    const response =
      source === "camera"
        ? await launchCamera(options)
        : await launchImageLibrary(options);
    if (response.didCancel) return;
    if (response.errorCode) {
      setError(
        response.errorCode === "permission"
          ? "Permission was denied. Allow camera or photo access in Settings, or use the other image option."
          : response.errorMessage ?? "The image could not be opened.",
      );
      return;
    }
    const asset = response.assets?.[0];
    if (!asset?.uri || !asset.width || !asset.height) {
      setError(
        "The selected image has no readable dimensions. Choose a different photo.",
      );
      return;
    }
    const fileSize = asset.fileSize ?? 0;
    if (fileSize > thresholds.capture.maximumImageBytes) {
      setError(
        "This image is too large to upload. Choose another photo; images are limited to 8 MB.",
      );
      return;
    }
    setImages((current) => ({
      ...current,
      [phase]: {
        phase,
        uri: asset.uri!,
        width: asset.width!,
        height: asset.height!,
        fileSize,
        type: asset.type,
        base64: asset.base64,
      },
    }));
    setAnalysis([]);
    setGeneratedScores(null);
  }

  async function analyzeImages(
    skill: Skill,
    selectedImages: Record<string, CapturedImage>,
  ) {
    const phaseAnalyses: ImageAnalysis[] = [];
    for (const phase of skill.phases) {
      const image = selectedImages[phase];
      if (!image) continue;
      phaseAnalyses.push(await analyzeAssessmentImage(image));
    }
    setAnalysis(phaseAnalyses);
    const failed = phaseAnalyses.filter((item) => !item.quality.passed);
    if (failed.length) {
      setError(
        failed
          .map((item) => `${item.phase}: ${item.quality.reasons.join(" ")}`)
          .join("\n"),
      );
      setGeneratedScores(null);
      return null;
    }

    const comparisons = [];
    let hasEveryReference = true;
    for (const result of phaseAnalyses) {
      const reference = validatedReferences[result.phase] ?? null;
      const pose = result.pose;
      if (!reference || !pose) {
        hasEveryReference = false;
        continue;
      }
      const module =
        require("../logic/poseAnalysis") as typeof import("../logic/poseAnalysis");
      const measurements = module.computePoseMeasurements(pose);
      if (measurements)
        comparisons.push(...comparePoseToReference(measurements, reference));
    }
    const scores =
      hasEveryReference && comparisons.length
        ? addDerivedOverallArea(
            scoresFromComparisons(comparisons, relevantAreaIds),
          )
        : null;
    setGeneratedScores(scores);
    setNotice(
      scores
        ? "Preliminary result, pending teacher validation. The still-image pose comparison is not a final grade."
        : "Pose checks passed, but no validated reference exists for every phase. No automatic score was generated; continue for teacher review or choose manual scoring.",
    );
    return phaseAnalyses;
  }

  function setCriterionScore(
    areaId: string,
    criterionId: string,
    score: ScoreLevel,
    target: "manual" | "final",
  ) {
    const update = target === "manual" ? setManualScores : setFinalScores;
    update((current) => ({
      ...current,
      [areaId]: { ...(current[areaId] ?? {}), [criterionId]: score },
    }));
  }

  function renderRubricControls(
    scores: AssessmentScores,
    target: "manual" | "final",
  ) {
    return relevantAreas.map((area) => (
      <View key={area.id} style={styles.rubricArea}>
        <Text style={styles.areaTitle}>{area.name}</Text>
        {area.criteria.map((criterion) => (
          <View key={criterion.id} style={styles.criterionRow}>
            <Text style={styles.criterionName}>{criterion.name}</Text>
            <View style={styles.scoreButtons}>
              {([1, 2, 3, 4] as ScoreLevel[]).map((score) => (
                <Pressable
                  key={score}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: scores[area.id]?.[criterion.id] === score,
                  }}
                  onPress={() =>
                    setCriterionScore(area.id, criterion.id, score, target)
                  }
                  style={[
                    styles.scoreButton,
                    scores[area.id]?.[criterion.id] === score &&
                      styles.scoreSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreText,
                      scores[area.id]?.[criterion.id] === score &&
                        styles.scoreTextSelected,
                    ]}
                  >
                    {score}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
    ));
  }

  function renderPhaseCapture(phases: AssessmentPhase[]) {
    return phases.map((phase) => (
      <View key={phase} style={styles.phaseCard}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseTitle}>{phaseLabel(phase)}</Text>
          <Text style={images[phase] ? styles.imageReady : styles.imageNeeded}>
            {images[phase] ? "Image ready" : "Required"}
          </Text>
        </View>
        {referenceRecords[phase]?.image_url ? (
          <Image
            source={{ uri: referenceRecords[phase]!.image_url }}
            resizeMode="contain"
            style={styles.referenceImage}
          />
        ) : (
          <Text style={styles.referencePlaceholder}>
            Reference image not validated for this phase
          </Text>
        )}
        <View style={styles.imageActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickPhoto(phase, "camera")}
            style={styles.imageAction}
          >
            <Text style={styles.imageActionText}>Camera</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickPhoto(phase, "library")}
            style={styles.imageAction}
          >
            <Text style={styles.imageActionText}>Gallery</Text>
          </Pressable>
        </View>
        {images[phase] && (
          <Text style={styles.photoMeta}>
            {images[phase].width} × {images[phase].height} ·{" "}
            {(images[phase].fileSize / 1024).toFixed(0)} KB
          </Text>
        )}
        {analysis.find((item) => item.phase === phase) && (
          <Text
            style={
              analysis.find((item) => item.phase === phase)!.quality.passed
                ? styles.passText
                : styles.failText
            }
          >
            {analysis.find((item) => item.phase === phase)!.quality.passed
              ? `Pose visible · ${Math.round(
                  analysis.find((item) => item.phase === phase)!.quality
                    .confidence * 100,
                )}% confidence`
              : analysis
                  .find((item) => item.phase === phase)!
                  .quality.reasons.join(" ")}
          </Text>
        )}
      </View>
    ));
  }

  function allManualScoresPresent(scores: AssessmentScores): boolean {
    return (
      relevantAreas.length > 0 &&
      relevantAreas.every((area) =>
        area.criteria.every(
          (criterion) => scores[area.id]?.[criterion.id] !== undefined,
        ),
      )
    );
  }

  async function submitTeacherAssessment() {
    if (!selectedSkill || !activeStudent?.linked_user_id) {
      setError(
        "Select a student with a linked account and an assessment skill.",
      );
      return;
    }
    let scores =
      assessmentType === "manual" ? manualScores : generatedScores ?? {};
    if (assessmentType === "manual" && !allManualScoresPresent(manualScores)) {
      setError(
        "Score every applicable rubric criterion before creating this manual assessment.",
      );
      return;
    }
    if (assessmentType === "image") {
      if (!selectedSkill.phases.every((phase) => images[phase])) {
        setError("Capture or select an image for every required phase.");
        return;
      }
      const results = await analyzeImages(selectedSkill, images);
      if (!results || results.some((result) => !result.quality.passed)) return;
      scores = generatedScores ?? {};
    }
    if (assessmentType === "manual") scores = addDerivedOverallArea(scores);
    const resultText = Object.keys(scores).length
      ? generateResultText(scores)
      : { strengths: [], improvements: [], recommendations: [] };
    const input: PendingAssessmentInput = {
      student_id: activeStudent.linked_user_id,
      teacher_id: profile.user_id,
      teacher_viewer_ids: [profile.user_id],
      skill_id: selectedSkill.id,
      skill_name: selectedSkill.name,
      type: assessmentType,
      status: "pending",
      generated_scores: Object.keys(scores).length ? scores : null,
      final_scores: null,
      overall_score: null,
      strengths: resultText.strengths,
      improvements: resultText.improvements,
      recommendations: resultText.recommendations,
      teacher_feedback: "",
    };
    setIsWorking(true);
    setError(null);
    try {
      const assessmentId = await createPendingAssessment(input);
      for (const phase of selectedSkill.phases) {
        const image = images[phase];
        if (!image) continue;
        const result = analysis.find((item) => item.phase === phase);
        const poseModule =
          require("../logic/poseAnalysis") as typeof import("../logic/poseAnalysis");
        const measurements = result?.pose
          ? poseModule.computePoseMeasurements(result.pose)
          : null;
        await uploadAssessmentImage({
          assessmentId,
          studentId: activeStudent.linked_user_id,
          teacherId: profile.user_id,
          image,
          quality: result?.quality as unknown as Record<string, unknown>,
          analysis: measurements ? { measurements, preliminary: true } : null,
        });
      }
      setNotice(
        "Assessment saved as Pending validation. It is not a final result.",
      );
      resetCaptureState();
      setSelectedSkillId("");
      setManualScores({});
      await refresh();
    } catch {
      setError(
        "The assessment could not be saved. If it was created, it remains pending; check connectivity and try refreshing.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function submitStudentImages() {
    if (!currentAssignment || !assignmentSkill) return;
    if (!assignmentSkill.phases.every((phase) => images[phase])) {
      setError("Capture or select an image for every required phase.");
      return;
    }
    setIsWorking(true);
    setError(null);
    const results = await analyzeImages(assignmentSkill, images);
    if (!results || results.some((result) => !result.quality.passed)) {
      setIsWorking(false);
      return;
    }
    try {
      for (const phase of assignmentSkill.phases) {
        const image = images[phase];
        const result = results.find((item) => item.phase === phase);
        const poseModule =
          require("../logic/poseAnalysis") as typeof import("../logic/poseAnalysis");
        const measurements = result?.pose
          ? poseModule.computePoseMeasurements(result.pose)
          : null;
        await uploadAssessmentImage({
          assessmentId: currentAssignment.id,
          studentId: profile.user_id,
          teacherId: currentAssignment.teacher_id,
          image,
          quality: result?.quality as unknown as Record<string, unknown>,
          analysis: measurements ? { measurements, preliminary: true } : null,
        });
      }
      setNotice(
        "Your phase images were submitted. The result remains pending teacher validation.",
      );
      resetCaptureState();
      setSelectedAssignment(null);
      await refresh();
    } catch {
      setError(
        "Your images could not be submitted. Check your connection and try again.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function validateSelectedAssessment() {
    if (!selectedReview || !allManualScoresPresent(finalScores)) {
      setError(
        "Review and score every applicable criterion before validating.",
      );
      return;
    }
    setIsWorking(true);
    setError(null);
    try {
      await validateAssessment({
        assessmentId: selectedReview.id,
        teacherId: profile.user_id,
        finalScores: addDerivedOverallArea(finalScores),
        teacherFeedback,
        recommendations: teacherRecommendations
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setNotice("Result validated. It is now visible to the student.");
      setSelectedReview(null);
      await refresh();
    } catch {
      setError(
        "Validation failed. Confirm teacher approval and check your connection.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>
          {isTeacher ? "TEACHER PORTAL" : "STUDENT PORTAL"}
        </Text>
        <Text style={styles.title}>Assessment</Text>
        {isTeacher && (
          <View style={styles.viewSwitch}>
            {(["create", "review"] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setTeacherView(item);
                  setError(null);
                  setNotice(null);
                }}
                style={[
                  styles.viewChoice,
                  teacherView === item && styles.viewChoiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.viewChoiceText,
                    teacherView === item && styles.viewChoiceTextActive,
                  ]}
                >
                  {item === "create" ? "Create" : `Review (${pending.length})`}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {isLoading ? (
          <Text style={styles.stateText}>Loading assessment data…</Text>
        ) : !isTeacher ? (
          selectedAssignment ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {assignmentSkill?.name ?? selectedAssignment.skill_name}
              </Text>
              {assignmentSkill && (
                <Text style={styles.bodyText}>
                  {assignmentSkill.instructions}
                </Text>
              )}
              <Text style={styles.statusNote}>
                This submission is pending teacher review. Scoring is not final
                until validated.
              </Text>
              {renderPhaseCapture(assignmentSkill?.phases ?? [])}
              {analysis.length > 0 &&
                analysis.every((item) => item.quality.passed) && (
                  <Text style={styles.statusNote}>
                    Image quality and pose checks passed. Teacher reference
                    validation is still required for automatic scoring.
                  </Text>
                )}
              <Button
                label="Run quality check and submit"
                loading={isWorking}
                onPress={() => void submitStudentImages()}
              />
              <Pressable onPress={() => setSelectedAssignment(null)}>
                <Text style={styles.cancel}>Back to assignments</Text>
              </Pressable>
            </View>
          ) : assignments.length ? (
            <View style={styles.list}>
              {assignments.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedAssignment(item);
                    setSelectedSkillId(item.skill_id);
                    resetCaptureState();
                  }}
                  style={styles.listCard}
                >
                  <Text style={styles.studentName}>{item.skill_name}</Text>
                  <Text style={styles.bodyText}>
                    Assigned assessment · Pending
                  </Text>
                  <Text style={styles.link}>Open assessment</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No assigned assessments"
              description="Your teacher’s assigned Arnis assessments will appear here."
            />
          )
        ) : teacherView === "review" ? (
          selectedReview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {selectedReview.skill_name} · Teacher review
              </Text>
              <Text style={styles.statusNote}>
                Preliminary scores are advisory only. Review the images and set
                the final rubric scores.
              </Text>
              {reviewImages.map((image, index) => {
                const url =
                  typeof image.image_url === "string" ? image.image_url : null;
                const phase =
                  typeof image.phase === "string"
                    ? image.phase
                    : `Image ${index + 1}`;
                return url ? (
                  <View
                    key={String(image.id ?? index)}
                    style={styles.reviewImage}
                  >
                    <Image
                      source={{ uri: url }}
                      resizeMode="contain"
                      style={styles.reviewPhoto}
                    />
                    <Text style={styles.photoMeta}>
                      {phaseLabel(phase as AssessmentPhase)}
                    </Text>
                  </View>
                ) : null;
              })}
              {renderRubricControls(finalScores, "final")}
              <TextInput
                label="Teacher feedback"
                multiline
                onChangeText={setTeacherFeedback}
                placeholder="Comments for the student"
                value={teacherFeedback}
              />
              <TextInput
                label="Practice recommendations (one per line)"
                multiline
                onChangeText={setTeacherRecommendations}
                placeholder="Practice balance in ready stance"
                value={teacherRecommendations}
              />
              <Button
                label="Validate result"
                loading={isWorking}
                onPress={() => void validateSelectedAssessment()}
              />
              <Pressable onPress={() => setSelectedReview(null)}>
                <Text style={styles.cancel}>Back to pending results</Text>
              </Pressable>
            </View>
          ) : pending.length ? (
            <View style={styles.list}>
              {pending.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedReview(item);
                    setError(null);
                  }}
                  style={styles.listCard}
                >
                  <Text style={styles.studentName}>{item.skill_name}</Text>
                  <Text style={styles.bodyText}>
                    {item.type} assessment · Pending validation
                  </Text>
                  <Text style={styles.link}>Review result</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No pending validation"
              description="Submitted assessments will appear here for teacher review."
            />
          )
        ) : (
          <>
            <Text style={styles.sectionTitle}>1. Select student</Text>
            {students.filter(
              (student) =>
                student.status === "active" && student.linked_user_id,
            ).length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.choiceList}
              >
                {students
                  .filter(
                    (student) =>
                      student.status === "active" && student.linked_user_id,
                  )
                  .map((student) => (
                    <Pressable
                      key={student.id}
                      onPress={() => {
                        setSelectedStudentId(student.linked_user_id!);
                        setError(null);
                      }}
                      style={[
                        styles.choice,
                        selectedStudentId === student.linked_user_id &&
                          styles.choiceActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          selectedStudentId === student.linked_user_id &&
                            styles.choiceTextActive,
                        ]}
                      >
                        {student.full_name}
                      </Text>
                      <Text
                        style={[
                          styles.choiceSub,
                          selectedStudentId === student.linked_user_id &&
                            styles.choiceTextActive,
                        ]}
                      >
                        Grade {student.grade} · {student.section}
                      </Text>
                    </Pressable>
                  ))}
              </ScrollView>
            ) : (
              <EmptyState
                title="No linked students"
                description="Add students and have them create an account with the roster email before assigning an assessment."
              />
            )}
            <Text style={styles.sectionTitle}>2. Select skill</Text>
            <View style={styles.skillGrid}>
              {skills.map((skill) => (
                <Pressable
                  key={skill.id}
                  onPress={() => chooseSkill(skill.id)}
                  style={[
                    styles.skillCard,
                    selectedSkillId === skill.id && styles.choiceActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.skillName,
                      selectedSkillId === skill.id && styles.choiceTextActive,
                    ]}
                  >
                    {skill.name}
                  </Text>
                  <Text
                    style={[
                      styles.choiceSub,
                      selectedSkillId === skill.id && styles.choiceTextActive,
                    ]}
                  >
                    {skill.category}
                  </Text>
                </Pressable>
              ))}
            </View>
            {selectedSkill && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  3. Instructions and references
                </Text>
                <Text style={styles.bodyText}>
                  {selectedSkill.instructions}
                </Text>
                {selectedSkill.phases.map((phase) => (
                  <View key={phase} style={styles.referencePhase}>
                    <Text style={styles.phaseTitle}>{phaseLabel(phase)}</Text>
                    {referenceRecords[phase]?.image_url ? (
                      <Image
                        source={{ uri: referenceRecords[phase]!.image_url }}
                        resizeMode="contain"
                        style={styles.referenceImage}
                      />
                    ) : (
                      <Text style={styles.referencePlaceholder}>
                        No validated reference image for this phase. It will not
                        be used for automatic scoring.
                      </Text>
                    )}
                  </View>
                ))}
                <Text style={styles.sectionTitle}>4. Assessment method</Text>
                <View style={styles.viewSwitch}>
                  {(["image", "manual"] as const).map((method) => (
                    <Pressable
                      key={method}
                      onPress={() => {
                        setAssessmentType(method);
                        resetCaptureState();
                      }}
                      style={[
                        styles.viewChoice,
                        assessmentType === method && styles.viewChoiceActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.viewChoiceText,
                          assessmentType === method &&
                            styles.viewChoiceTextActive,
                        ]}
                      >
                        {method === "image" ? "Image-based" : "Manual rubric"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {assessmentType === "image" ? (
                  <>
                    <Text style={styles.statusNote}>
                      Image-based analysis is preliminary. It checks still-image
                      pose visibility and compares measurements only with
                      validated references.
                    </Text>
                    {renderPhaseCapture(selectedSkill.phases)}
                    <Button
                      label="Check images and pose"
                      loading={isWorking}
                      onPress={() => {
                        if (
                          !selectedSkill.phases.every((phase) => images[phase])
                        ) {
                          setError(
                            "Capture or select an image for every required phase.",
                          );
                          return;
                        }
                        void analyzeImages(selectedSkill, images);
                      }}
                    />
                    {generatedScores && (
                      <>
                        <Text style={styles.preliminary}>
                          PRELIMINARY · PENDING TEACHER VALIDATION
                        </Text>
                        {renderRubricControls(generatedScores, "manual")}
                      </>
                    )}
                    {!generatedScores &&
                      analysis.length === selectedSkill.phases.length &&
                      analysis.every((item) => item.quality.passed) && (
                        <>
                          <Text style={styles.statusNote}>
                            No validated reference exists for every phase. Use
                            the manual rubric below; no automated score will be
                            invented.
                          </Text>
                          {renderRubricControls(manualScores, "manual")}
                        </>
                      )}
                  </>
                ) : (
                  renderRubricControls(manualScores, "manual")
                )}
                {assessmentType === "manual" && (
                  <Text style={styles.statusNote}>
                    Manual assessment: score the applicable rubric criteria.
                    Images are optional and are not analyzed.
                  </Text>
                )}
                {assessmentType === "manual" && (
                  <View style={styles.optionalImages}>
                    <Text style={styles.optionalTitle}>
                      Optional evidence images
                    </Text>
                    {renderPhaseCapture(["single"])}
                  </View>
                )}
                <Button
                  label="Save as pending validation"
                  loading={isWorking}
                  onPress={() => void submitTeacherAssessment()}
                />
              </View>
            )}
          </>
        )}

        {error && (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        )}
        {notice && (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            {notice}
          </Text>
        )}
        <Pressable onPress={() => void refresh()} style={styles.refresh}>
          <Text style={styles.link}>Refresh</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.bodyText}>{description}</Text>
    </View>
  );
}

function phaseLabel(phase: AssessmentPhase): string {
  return {
    starting: "Starting position",
    execution: "Execution",
    final: "Final position",
    single: "Optional image",
  }[phase];
}

const styles = StyleSheet.create({
  screen: { gap: 12, padding: 18, paddingTop: 24, paddingBottom: 32 },
  kicker: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  viewSwitch: {
    backgroundColor: "#EAF0EF",
    borderRadius: 8,
    flexDirection: "row",
    padding: 3,
  },
  viewChoice: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    minHeight: 37,
  },
  viewChoiceActive: { backgroundColor: colors.white },
  viewChoiceText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  viewChoiceTextActive: { color: colors.tealDark },
  sectionTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  choiceList: { gap: 7 },
  choice: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 10,
  },
  choiceActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  choiceText: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  choiceSub: { color: colors.muted, fontSize: 9 },
  choiceTextActive: { color: colors.white },
  skillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  skillCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "31%",
    flexGrow: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 8,
  },
  skillName: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  section: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  bodyText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  referencePhase: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    gap: 7,
    padding: 9,
  },
  phaseTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  referenceImage: { backgroundColor: "#EAF0EF", height: 120, width: "100%" },
  referencePlaceholder: {
    backgroundColor: "#EAF0EF",
    borderRadius: 6,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    padding: 14,
    textAlign: "center",
  },
  statusNote: {
    backgroundColor: "#EEF5F4",
    borderRadius: 7,
    color: colors.tealDark,
    fontSize: 10,
    lineHeight: 15,
    padding: 10,
  },
  phaseCard: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    gap: 7,
    padding: 10,
  },
  phaseHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  imageReady: { color: colors.success, fontSize: 9, fontWeight: "800" },
  imageNeeded: { color: colors.danger, fontSize: 9, fontWeight: "800" },
  imageActions: { flexDirection: "row", gap: 7 },
  imageAction: {
    alignItems: "center",
    backgroundColor: "#E1F0EE",
    borderRadius: 7,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
  },
  imageActionText: { color: colors.tealDark, fontSize: 10, fontWeight: "800" },
  photoMeta: { color: colors.muted, fontSize: 9 },
  passText: { color: colors.success, fontSize: 10, lineHeight: 15 },
  failText: { color: colors.danger, fontSize: 10, lineHeight: 15 },
  preliminary: {
    backgroundColor: "#FFF0D0",
    borderRadius: 7,
    color: "#70440F",
    fontSize: 10,
    fontWeight: "900",
    padding: 9,
    textAlign: "center",
  },
  rubricArea: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 7,
    paddingTop: 9,
  },
  areaTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  criterionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  criterionName: { color: colors.muted, flex: 1, fontSize: 9, lineHeight: 13 },
  scoreButtons: { flexDirection: "row", gap: 4 },
  scoreButton: {
    alignItems: "center",
    backgroundColor: "#EAF0EF",
    borderRadius: 5,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  scoreSelected: { backgroundColor: colors.teal },
  scoreText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  scoreTextSelected: { color: colors.white },
  optionalImages: { gap: 7 },
  optionalTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  list: { gap: 8 },
  listCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 9,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  studentName: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  link: { color: colors.tealDark, fontSize: 10, fontWeight: "800" },
  reviewImage: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    gap: 5,
    padding: 8,
  },
  reviewPhoto: { height: 180, width: "100%" },
  empty: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 9,
    borderWidth: 1,
    gap: 7,
    padding: 14,
  },
  stateText: { color: colors.muted, fontSize: 12, padding: 12 },
  error: { color: colors.danger, fontSize: 11, lineHeight: 17 },
  notice: { color: colors.success, fontSize: 11, lineHeight: 16 },
  cancel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    padding: 8,
    textAlign: "center",
  },
  refresh: { alignItems: "center", padding: 7 },
});
