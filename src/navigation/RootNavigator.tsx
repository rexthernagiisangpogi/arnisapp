import { NavigationContainer } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { colors } from "../constants/colors";
import type { User } from "../features/auth/types";
import { ProfileSetupScreen } from "../features/profile/components/ProfileSetupScreen";
import {
    createProfile,
    getProfile,
} from "../features/profile/services/profileService";
import type { Profile, ProfileInput } from "../features/profile/types";
import { MainTabs } from "./MainTabs";

export function RootNavigator({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackProfile: Profile = useMemo(
    () => ({
      user_id: user.id,
      role: user.role || "student",
      full_name: user.name || "Arnis member",
      grade: "",
      section: "",
      created_at: new Date(),
    }),
    [user.id, user.name, user.role],
  );

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextProfile = await getProfile(user.id);
      if (nextProfile) {
        setProfile(nextProfile);
        setError(null);
        return;
      }
      // If user has a name and role already set from auth, proceed with fallback profile
      if (user.name && user.name !== "Arnis member") {
        setProfile({
          user_id: user.id,
          role: user.role || "student",
          full_name: user.name,
          grade: "",
          section: "",
          created_at: new Date(),
        });
      } else {
        setProfile(null);
      }
      setError(null);
    } catch (cause) {
      console.warn("loadProfile error:", cause);
      setProfile({
        user_id: user.id,
        role: user.role || "student",
        full_name: user.name || "Arnis member",
        grade: "",
        section: "",
        created_at: new Date(),
      });
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.name, user.role]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function saveProfile(input: ProfileInput) {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await createProfile(user.id, input, user.email);
      setProfile(saved);
    } catch (cause) {
      console.warn("saveProfile error:", cause);
      setProfile({
        user_id: user.id,
        role: input.role,
        full_name: input.full_name.trim(),
        grade: input.grade.trim(),
        section: input.section.trim(),
        created_at: new Date(),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.teal} size="large" />
        <Text style={styles.stateText}>Loading your profile…</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>Profile unavailable</Text>
        <Text style={styles.stateText}>{error}</Text>
        <Button
          label="Continue to app"
          onPress={() => setProfile(fallbackProfile)}
        />
        <Button label="Try again" onPress={() => void loadProfile()} />
        <Text onPress={onSignOut} style={styles.signOut}>
          Sign out
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <ProfileSetupScreen
        initialName={user.name}
        initialRole={user.role}
        isSaving={isSaving}
        error={error}
        onSubmit={saveProfile}
      />
    );
  }

  return (
    <NavigationContainer>
      <MainTabs profile={profile} onSignOut={onSignOut} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "stretch",
    backgroundColor: colors.paper,
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 28,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  signOut: {
    color: colors.tealDark,
    fontSize: 14,
    fontWeight: "700",
    padding: 12,
    textAlign: "center",
  },
});
