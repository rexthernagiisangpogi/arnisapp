import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import rubricData from "../../../../assets/data/rubric.json";
import { colors } from "../../../constants/colors";

type Criterion = { id: string; name: string; focus: string };
type Area = { id: string; name: string; criteria: Criterion[] };
const rubric = rubricData as {
  draft_notice: string;
  rounding_rule: string;
  levels: Record<string, string>;
  descriptor_templates: Record<string, string>;
  areas: Area[];
};

export function RubricScreen() {
  const [expanded, setExpanded] = useState<string | null>(
    rubric.areas[0]?.id ?? null,
  );
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Draft rubric</Text>
        <Text style={styles.noticeText}>{rubric.draft_notice}</Text>
      </View>
      <Text style={styles.rounding}>{rubric.rounding_rule}</Text>
      {rubric.areas.map((area) => {
        const open = expanded === area.id;
        return (
          <View key={area.id} style={styles.area}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setExpanded(open ? null : area.id)}
              style={styles.areaHeader}
            >
              <Text style={styles.areaTitle}>{area.name}</Text>
              <Text style={styles.areaChevron}>{open ? "−" : "+"}</Text>
            </Pressable>
            {open && (
              <View style={styles.criteria}>
                {area.criteria.map((criterion) => (
                  <View key={criterion.id} style={styles.criterion}>
                    <Text style={styles.criterionTitle}>{criterion.name}</Text>
                    {["4", "3", "2", "1"].map((level) => (
                      <View key={level} style={styles.descriptorRow}>
                        <Text style={styles.level}>
                          {level} · {rubric.levels[level]}
                        </Text>
                        <Text style={styles.descriptor}>
                          {rubric.descriptor_templates[level].replace(
                            "{focus}",
                            criterion.focus,
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 9, padding: 15, paddingBottom: 26 },
  notice: { backgroundColor: "#FFF0D0", borderRadius: 8, gap: 5, padding: 12 },
  noticeTitle: { color: "#70440F", fontSize: 12, fontWeight: "900" },
  noticeText: { color: "#70440F", fontSize: 10, lineHeight: 15 },
  rounding: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 2,
  },
  area: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 9,
    borderWidth: 1,
    overflow: "hidden",
  },
  areaHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 13,
  },
  areaTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  areaChevron: { color: colors.tealDark, fontSize: 20 },
  criteria: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingHorizontal: 12,
  },
  criterion: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    gap: 6,
    paddingVertical: 10,
  },
  criterionTitle: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  descriptorRow: { flexDirection: "row", gap: 8 },
  level: { color: colors.tealDark, fontSize: 9, fontWeight: "800", width: 82 },
  descriptor: { color: colors.muted, flex: 1, fontSize: 9, lineHeight: 14 },
});
