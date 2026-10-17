import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../constants/colors";
import { AssessmentScreen } from "../features/assessment/components/AssessmentScreen";
import { DashboardScreen } from "../features/dashboard/screens/DashboardScreen";
import { ArnisContentScreen } from "../features/learning/components/ArnisContentScreen";
import { FeaturePlaceholderScreen } from "../features/navigation/screens/FeaturePlaceholderScreen";
import { ProfileScreen } from "../features/profile/components/ProfileScreen";
import type { Profile } from "../features/profile/types";
import { StudentsScreen } from "../features/students/components/StudentsScreen";

const Tab = createBottomTabNavigator();

const placeholders = {
  Students:
    "Class roster, student profiles, and learning support will be available here.",
  Assessment:
    "Assigned and teacher-created Arnis assessments will be available here.",
  Fundamentals:
    "Arnis background, reference skills, and practice instructions will be available here.",
  Reports:
    "Validated assessment reports and class summaries will be available here.",
  Progress:
    "Your validated results and improvement over time will be available here.",
};

export function MainTabs({
  profile,
  onSignOut,
}: {
  profile: Profile;
  onSignOut: () => void;
}) {
  const teacherTabs = [
    "Dashboard",
    "Students",
    "Assessment",
    "Fundamentals",
    "Reports",
    "Profile",
  ];
  const studentTabs = [
    "Dashboard",
    "Assessment",
    "Fundamentals",
    "Progress",
    "Profile",
  ];
  const tabs = profile.role === "teacher" ? teacherTabs : studentTabs;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          height: 62,
          paddingBottom: 7,
          paddingTop: 5,
        },
      }}
    >
      {tabs.map((tab) => {
        if (tab === "Dashboard") {
          return (
            <Tab.Screen key={tab} name={tab}>
              {() => <DashboardScreen profile={profile} />}
            </Tab.Screen>
          );
        }
        if (tab === "Profile") {
          return (
            <Tab.Screen key={tab} name={tab}>
              {() => <ProfileScreen profile={profile} onSignOut={onSignOut} />}
            </Tab.Screen>
          );
        }
        if (tab === "Students") {
          return (
            <Tab.Screen key={tab} name={tab}>
              {() => <StudentsScreen teacherId={profile.user_id} />}
            </Tab.Screen>
          );
        }
        if (tab === "Fundamentals") {
          return (
            <Tab.Screen key={tab} name={tab}>
              {() => <ArnisContentScreen profile={profile} />}
            </Tab.Screen>
          );
        }
        if (tab === "Assessment") {
          return (
            <Tab.Screen key={tab} name={tab}>
              {() => <AssessmentScreen profile={profile} />}
            </Tab.Screen>
          );
        }
        const description = placeholders[tab as keyof typeof placeholders];
        return (
          <Tab.Screen key={tab} name={tab}>
            {() => (
              <FeaturePlaceholderScreen title={tab} description={description} />
            )}
          </Tab.Screen>
        );
      })}
    </Tab.Navigator>
  );
}
