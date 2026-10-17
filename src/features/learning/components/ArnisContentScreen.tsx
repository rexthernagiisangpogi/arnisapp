import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { colors } from "../../../constants/colors";
import { ReferenceManagerScreen } from "../../assessment/components/ReferenceManagerScreen";
import type { Profile } from "../../profile/types";
import { FundamentalsScreen } from "../screens/FundamentalsScreen";
import { ReferenceLibraryScreen } from "../screens/ReferenceLibraryScreen";
import { RubricScreen } from "../screens/RubricScreen";

type Section = "learn" | "references" | "manage" | "rubric";

export function ArnisContentScreen({ profile }: { profile: Profile }) {
  const [section, setSection] = useState<Section>("learn");
  const tabs: { id: Section; label: string }[] = [
    { id: "learn", label: "Learn" },
    { id: "references", label: "Reference library" },
    ...(profile.role === "teacher"
      ? [
          { id: "manage" as const, label: "Manage references" },
          { id: "rubric" as const, label: "Rubric" },
        ]
      : []),
  ];

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <Text style={styles.kicker}>LEARNING</Text>
        <Text style={styles.title}>Arnis Fundamentals</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: section === tab.id }}
              onPress={() => setSection(tab.id)}
              style={[styles.tab, section === tab.id && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  section === tab.id && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {section === "learn" ? (
          <FundamentalsScreen />
        ) : section === "references" ? (
          <ReferenceLibraryScreen canManage={profile.role === "teacher"} />
        ) : section === "manage" ? (
          <ReferenceManagerScreen teacherId={profile.user_id} />
        ) : (
          <RubricScreen />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 12, paddingTop: 21 },
  kicker: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    paddingHorizontal: 20,
  },
  title: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "800",
    paddingHorizontal: 20,
  },
  tabList: { gap: 7, paddingHorizontal: 20, paddingVertical: 2 },
  tab: {
    backgroundColor: "#EAF0EF",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 37,
    paddingHorizontal: 12,
  },
  activeTab: { backgroundColor: colors.teal },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  activeTabText: { color: colors.white },
});
