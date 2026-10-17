import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { colors } from "../../../constants/colors";
import type { Profile } from "../../profile/types";
import {
    getStudentDashboardData,
    getTeacherDashboardData,
    type StudentDashboardData,
    type TeacherDashboardData,
} from "../services/phase2DashboardService";

type DashboardData = StudentDashboardData | TeacherDashboardData;

export function DashboardScreen({ profile }: { profile: Profile }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigation = useNavigation<{ navigate: (name: string) => void }>();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    const request =
      profile.role === "teacher"
        ? getTeacherDashboardData(profile.user_id)
        : getStudentDashboardData(profile.user_id);
    request
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile.role, profile.user_id]);

  const goTo = (tab: string) => navigation.navigate(tab);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>
          {profile.role === "teacher" ? "TEACHER PORTAL" : "STUDENT PORTAL"}
        </Text>
        <Text style={styles.title}>
          Welcome, {profile.full_name.split(" ")[0]}
        </Text>
        <Text style={styles.intro}>
          Basic Arnis skills, assessment, and progress in one place.
        </Text>
        {profile.role === "student" && (
          <Text style={styles.classInfo}>
            Grade {profile.grade} · Section {profile.section}
          </Text>
        )}

        <View style={styles.quickActions}>
          <Pressable
            onPress={() => goTo("Assessment")}
            style={styles.quickAction}
          >
            <Text style={styles.quickActionText}>
              {profile.role === "teacher"
                ? "Create assessment"
                : "My assessments"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => goTo("Fundamentals")}
            style={[styles.quickAction, styles.secondaryAction]}
          >
            <Text style={styles.secondaryActionText}>Arnis fundamentals</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <Text style={styles.stateText}>Loading your class activity…</Text>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Activity unavailable</Text>
            <Text style={styles.emptyBody}>
              Connect to the internet or check your account access to refresh
              assessment data.
            </Text>
          </View>
        ) : profile.role === "teacher" && data && "studentCount" in data ? (
          <TeacherOverview data={data} onStudents={() => goTo("Students")} />
        ) : profile.role === "student" && data && "assessments" in data ? (
          <StudentOverview
            data={data}
            grade={profile.grade}
            section={profile.section}
          />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function TeacherOverview({
  data,
  onStudents,
}: {
  data: TeacherDashboardData;
  onStudents: () => void;
}) {
  return (
    <>
      <View style={styles.metricGrid}>
        <Metric label="Students" value={data.studentCount} />
        <Metric label="Pending validation" value={data.pendingCount} />
        <Metric label="Completed" value={data.completedCount} />
        <Metric label="Need support" value={data.studentsNeedingSupport} />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Class performance</Text>
          <Text style={styles.metricNote}>
            {data.classAverage === null
              ? "No scores yet"
              : `Average ${data.classAverage} / 4`}
          </Text>
        </View>
        <View style={styles.chartTrack}>
          <View
            style={[
              styles.chartBar,
              {
                width: `${Math.max(
                  0,
                  Math.min(100, (data.classAverage ?? 0) * 25),
                )}%`,
              },
            ]}
          />
        </View>
        {data.classAverage === null && (
          <Text style={styles.emptyBody}>
            Validated scores will build this summary.
          </Text>
        )}
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Recent assessments</Text>
          <Pressable onPress={onStudents}>
            <Text style={styles.link}>Manage students</Text>
          </Pressable>
        </View>
        {data.recentAssessments.length ? (
          data.recentAssessments.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <Text style={styles.activityName}>{item.skill_name}</Text>
              <Text style={styles.activityMeta}>
                {item.status === "pending" ? "Pending validation" : "Validated"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyBody}>
            No assessment activity yet. Add students or create the first
            assessment.
          </Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        <Text style={styles.emptyBody}>
          School announcements will appear here.
        </Text>
      </View>
    </>
  );
}

function StudentOverview({
  data,
  grade,
  section,
}: {
  data: StudentDashboardData;
  grade: string;
  section: string;
}) {
  const latest = data.assessments[0];
  const level =
    latest?.overall_score === null || latest?.overall_score === undefined
      ? "Not assessed yet"
      : ["Beginning", "Developing", "Proficient", "Advanced"][
          Math.max(0, Math.min(3, Math.round(latest.overall_score) - 1))
        ];
  return (
    <>
      <Text style={styles.classInfo}>
        Grade {grade} · Section {section}
      </Text>
      <View style={styles.metricGrid}>
        <Metric label="Current level" value={level} />
        <Metric label="Skills assessed" value={data.completedSkills.length} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Most recent assessment</Text>
        {latest ? (
          <View style={styles.activityRow}>
            <Text style={styles.activityName}>{latest.skill_name}</Text>
            <Text style={styles.activityMeta}>
              {latest.overall_score === null
                ? "Score pending"
                : `${latest.overall_score} / 4`}
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyBody}>
            Your validated assessment results will appear here.
          </Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Completed skills</Text>
        <Text style={styles.emptyBody}>
          {data.completedSkills.length
            ? data.completedSkills.join(" · ")
            : "Skills will appear after a result is validated by your teacher."}
        </Text>
      </View>
      {latest?.strengths.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strengths</Text>
          <Text style={styles.emptyBody}>{latest.strengths.join(" · ")}</Text>
        </View>
      ) : null}
      {latest?.improvements.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice next</Text>
          <Text style={styles.emptyBody}>
            {latest.improvements.join(" · ")}
          </Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress over time</Text>
        {data.assessments.length > 1 ? (
          <View style={styles.chart}>
            {data.assessments
              .slice(0, 6)
              .reverse()
              .map((item) => (
                <View key={item.id} style={styles.chartColumn}>
                  <View
                    style={[
                      styles.studentBar,
                      {
                        height: Math.max(
                          6,
                          ((item.overall_score ?? 0) / 4) * 72,
                        ),
                      },
                    ]}
                  />
                  <Text style={styles.chartLabel}>
                    {item.skill_name.slice(0, 7)}
                  </Text>
                </View>
              ))}
          </View>
        ) : (
          <Text style={styles.emptyBody}>
            Complete more assessments to see your progress chart.
          </Text>
        )}
      </View>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 13, padding: 24, paddingTop: 36 },
  kicker: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: { color: colors.ink, fontSize: 28, fontWeight: "800" },
  intro: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 2 },
  classInfo: { color: colors.tealDark, fontSize: 13, fontWeight: "700" },
  emptyState: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    marginTop: 16,
    padding: 18,
  },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  quickActions: { flexDirection: "row", gap: 9, marginVertical: 5 },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 9,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  quickActionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryAction: { backgroundColor: "#E1F0EE" },
  secondaryActionText: {
    color: colors.tealDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: { color: colors.muted, fontSize: 13, paddingVertical: 18 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metric: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 6,
    minHeight: 76,
    padding: 12,
  },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  metricValue: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  section: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    padding: 15,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  metricNote: { color: colors.muted, fontSize: 11 },
  chartTrack: {
    backgroundColor: "#E8F0EF",
    borderRadius: 4,
    height: 8,
    overflow: "hidden",
  },
  chartBar: { backgroundColor: colors.teal, borderRadius: 4, height: 8 },
  link: { color: colors.tealDark, fontSize: 11, fontWeight: "800" },
  activityRow: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 9,
  },
  activityName: { color: colors.ink, flex: 1, fontSize: 12, fontWeight: "700" },
  activityMeta: { color: colors.muted, fontSize: 11 },
  chart: { alignItems: "flex-end", flexDirection: "row", gap: 13, height: 100 },
  chartColumn: {
    alignItems: "center",
    flex: 1,
    gap: 5,
    justifyContent: "flex-end",
  },
  studentBar: {
    backgroundColor: colors.teal,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 6,
    width: "70%",
  },
  chartLabel: { color: colors.muted, fontSize: 9 },
});
