import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/Button";
import { TextInput } from "../../../components/TextInput";
import { colors } from "../../../constants/colors";
import { useLogin } from "../hooks/useLogin";
import type { AuthMode, UserRole } from "../types";
import type { AuthFieldErrors } from "../validation";

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [role, setRole] = useState<UserRole>("student");
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const { submit, resetPassword, isLoading, error, notice, clearError } =
    useLogin();

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFieldErrors({});
    clearError();
  }

  async function handleSubmit() {
    const credentials = { email, password, role };
    const nextErrors =
      mode === "signUp"
        ? await submit({ ...credentials, name }, mode)
        : await submit(credentials, mode);
    setFieldErrors(nextErrors ?? {});
  }

  return (
    <View style={styles.form}>
      {mode === "signUp" && (
        <>
          <TextInput
            autoCapitalize="words"
            label="Name"
            onChangeText={setName}
            placeholder="Enter your name"
            value={name}
            error={fieldErrors.name}
          />
          <View
            style={[
              styles.roleSection,
              isRoleMenuOpen && styles.roleSectionOpen,
            ]}
          >
            <Text style={styles.label}>Select role</Text>
            <View
              style={[
                styles.rolePicker,
                isRoleMenuOpen && styles.rolePickerOpen,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select role, currently ${role}`}
                accessibilityState={{ expanded: isRoleMenuOpen }}
                onPress={() => setIsRoleMenuOpen((open) => !open)}
                style={styles.roleTrigger}
              >
                <Text style={styles.roleValue}>
                  {role === "student" ? "Student" : "Teacher"}
                </Text>
                <Text style={styles.roleChevron}>
                  {isRoleMenuOpen ? "⌃" : "⌄"}
                </Text>
              </Pressable>
              {isRoleMenuOpen && (
                <View style={styles.roleMenu}>
                  {(["student", "teacher"] as UserRole[]).map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: role === option }}
                      onPress={() => {
                        setRole(option);
                        setIsRoleMenuOpen(false);
                      }}
                      style={[
                        styles.roleOption,
                        role === option && styles.selectedRoleOption,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          role === option && styles.selectedRoleOptionText,
                        ]}
                      >
                        {option === "student" ? "Student" : "Teacher"}
                      </Text>
                      {role === option && (
                        <Text style={styles.selectedMark}>Selected</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </>
      )}

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@gmail.com"
        value={email}
        error={fieldErrors.email}
        textContentType="emailAddress"
      />
      <TextInput
        label="Password"
        onChangeText={setPassword}
        placeholder={
          mode === "signUp" ? "At least 6 characters" : "Enter your password"
        }
        secureTextEntry
        value={password}
        error={fieldErrors.password}
        textContentType={mode === "signUp" ? "newPassword" : "password"}
      />
      {mode === "signIn" && (
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => void resetPassword(email)}
        >
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>
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
      <Button
        label={mode === "signUp" ? "Create Account" : "Log in"}
        loading={isLoading}
        onPress={handleSubmit}
      />
      <View style={styles.accountPrompt}>
        <Text style={styles.promptLabel}>
          {mode === "signUp"
            ? "Already have an account?"
            : "Don't have an account?"}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => changeMode(mode === "signUp" ? "signIn" : "signUp")}
        >
          <Text style={styles.promptAction}>
            {mode === "signUp" ? "Log in" : "Create Account"}
          </Text>
        </Pressable>
      </View>
      {mode === "signUp" && (
        <Text style={styles.footnote}>
          By creating an account, you agree to follow your school's community
          guidelines.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 17 },
  roleSection: { gap: 8, zIndex: 1 },
  roleSectionOpen: { elevation: 10, zIndex: 10 },
  label: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  rolePicker: { position: "relative", zIndex: 2 },
  rolePickerOpen: { elevation: 10, zIndex: 10 },
  roleTrigger: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 15,
  },
  roleValue: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: "700" },
  roleChevron: { color: colors.tealDark, fontSize: 20, lineHeight: 22 },
  roleMenu: {
    elevation: 12,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
    top: 52,
    zIndex: 12,
  },
  roleOption: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: 15,
  },
  selectedRoleOption: { backgroundColor: "#EAF5F2" },
  roleOptionText: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  selectedRoleOptionText: { color: colors.tealDark, fontWeight: "700" },
  selectedMark: { color: colors.tealDark, fontSize: 11, fontWeight: "700" },
  forgot: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  notice: { color: colors.success, fontSize: 13, lineHeight: 19 },
  accountPrompt: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    justifyContent: "center",
    paddingVertical: 3,
  },
  promptLabel: { color: colors.muted, fontSize: 13 },
  promptAction: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: "800",
    padding: 3,
  },
  footnote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
