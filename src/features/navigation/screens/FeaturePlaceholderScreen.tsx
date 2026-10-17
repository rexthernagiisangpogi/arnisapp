import { StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { colors } from "../../../constants/colors";

type Props = { title: string; description: string };

export function FeaturePlaceholderScreen({ title, description }: Props) {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.kicker}>ARNIS-ASSESS</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Coming up next</Text>
          <Text style={styles.emptyDescription}>
            This area is ready for class content and activity.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 12, padding: 24, paddingTop: 36 },
  kicker: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: { color: colors.ink, fontSize: 27, fontWeight: "800" },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  emptyState: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 14,
    padding: 18,
  },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  emptyDescription: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});
