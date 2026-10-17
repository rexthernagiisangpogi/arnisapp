import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../constants/colors";
type Props = { label: string; onPress: () => void; loading?: boolean };
export function Button({ label, onPress, loading }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 14,
    minHeight: 54,
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  label: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
