import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import referenceData from "../../../../assets/data/reference-library.json";
import skillsData from "../../../../assets/data/skills.json";
import { colors } from "../../../constants/colors";

type PhaseReference = {
  phase: string;
  description: string;
  image_placeholder: string;
  key_points: Record<string, string>;
  validated: boolean;
  validated_by: string | null;
  validated_at: string | null;
};
type ReferenceEntry = {
  skill_id: string;
  category: string;
  name: string;
  phases: PhaseReference[];
};
const references = referenceData as ReferenceEntry[];
const skills = skillsData as { id: string; instructions: string }[];

export function ReferenceLibraryScreen({ canManage }: { canManage: boolean }) {
  const categories = useMemo(
    () => ["All", ...new Set(references.map((item) => item.category))],
    [],
  );
  const [category, setCategory] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const visibleReferences = references.filter(
    (item) => category === "All" || item.category === category,
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        {categories.map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item)}
            style={[
              styles.category,
              category === item && styles.categorySelected,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                category === item && styles.categoryTextSelected,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.list}>
        {visibleReferences.map((entry) => {
          const open = expanded === entry.skill_id;
          const skill = skills.find(
            (candidate) => candidate.id === entry.skill_id,
          );
          return (
            <View key={entry.skill_id} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setExpanded(open ? null : entry.skill_id)}
                style={styles.cardHeader}
              >
                <View style={styles.cardCopy}>
                  <Text style={styles.categoryLabel}>{entry.category}</Text>
                  <Text style={styles.skillName}>{entry.name}</Text>
                </View>
                <Text style={styles.chevron}>{open ? "−" : "+"}</Text>
              </Pressable>
              {open && (
                <View style={styles.details}>
                  <Text style={styles.instructions}>{skill?.instructions}</Text>
                  {entry.phases.map((phase) => (
                    <View key={phase.phase} style={styles.phase}>
                      <View style={styles.phaseHeading}>
                        <Text style={styles.phaseTitle}>
                          {phase.phase === "single"
                            ? "Single phase"
                            : phase.phase}
                        </Text>
                        <Text style={styles.unvalidated}>NOT VALIDATED</Text>
                      </View>
                      <View
                        accessibilityLabel={phase.image_placeholder}
                        style={styles.imagePlaceholder}
                      >
                        <Text style={styles.imageLabel}>
                          REFERENCE IMAGE PLACEHOLDER
                        </Text>
                        <Text style={styles.imageDescription}>
                          {phase.description}
                        </Text>
                      </View>
                      <Text style={styles.keyPointsTitle}>
                        Expected points · draft
                      </Text>
                      {Object.entries(phase.key_points).map(([key, value]) => (
                        <Text key={key} style={styles.keyPoint}>
                          {key.replaceAll("_", " ")}: {value}
                        </Text>
                      ))}
                    </View>
                  ))}
                  {canManage && (
                    <Text style={styles.managementNote}>
                      Only validated images are eligible for scoring. Teachers
                      can upload and validate references in Manage references.
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  categories: { gap: 7, paddingHorizontal: 16, paddingVertical: 3 },
  category: {
    backgroundColor: "#EAF0EF",
    borderRadius: 7,
    justifyContent: "center",
    minHeight: 31,
    paddingHorizontal: 10,
  },
  categorySelected: { backgroundColor: colors.teal },
  categoryText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  categoryTextSelected: { color: colors.white },
  list: { gap: 8, padding: 15, paddingBottom: 24 },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 9,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 53,
    paddingHorizontal: 13,
  },
  cardCopy: { gap: 3 },
  categoryLabel: {
    color: colors.teal,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  skillName: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  chevron: { color: colors.tealDark, fontSize: 20 },
  details: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 10,
    padding: 12,
  },
  instructions: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  phase: {
    backgroundColor: colors.paper,
    borderRadius: 8,
    gap: 7,
    padding: 10,
  },
  phaseHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  phaseTitle: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  unvalidated: { color: colors.danger, fontSize: 8, fontWeight: "900" },
  imagePlaceholder: {
    alignItems: "center",
    backgroundColor: "#E7EEED",
    borderRadius: 6,
    gap: 4,
    justifyContent: "center",
    minHeight: 72,
    padding: 8,
  },
  imageLabel: {
    color: colors.tealDark,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  imageDescription: { color: colors.muted, fontSize: 10, textAlign: "center" },
  keyPointsTitle: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  keyPoint: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  managementNote: { color: colors.muted, fontSize: 10, lineHeight: 15 },
});
