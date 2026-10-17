import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { colors } from "./src/constants/colors";
import { LoginForm } from "./src/features/auth/components/LoginForm";
import {
    getFallbackProfile,
    logout,
    observeAuthState,
} from "./src/features/auth/services/authService";
import { authStore } from "./src/features/auth/store/authStore";
import type { User } from "./src/features/auth/types";
import { useConnectivity } from "./src/hooks/useConnectivity";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { getUserProfile } from "./src/services/firestore";


export default function App() {
  const [user, setUser] = useState<User | null>(authStore.getUser());
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const { isOffline } = useConnectivity();

  useEffect(() => {
    const unsubscribe = authStore.subscribe(setUser);
    let active = true;
    const stopObserving = observeAuthState((authUser) => {
      void (async () => {
        if (!authUser) {
          if (active) {
            authStore.setUser(null);
            setIsRestoringSession(false);
          }
          return;
        }
        let restoredUser = getFallbackProfile(authUser);
        try {
          const profile = await getUserProfile(authUser.uid);
          if (profile) restoredUser = { ...restoredUser, ...profile };
        } catch {
          // The persisted Auth session can still open the app without network access.
        }
        if (active) {
          authStore.setUser(restoredUser);
          setIsRestoringSession(false);
        }
      })();
    });
    return () => {
      active = false;
      unsubscribe();
      stopObserving();
    };
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.tealDark} />
      <View style={styles.root}>
        {isOffline && (
          <View accessibilityLiveRegion="polite" style={styles.offlineBanner}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>
              Offline mode · saved sessions work; new sign-ins need internet
            </Text>
          </View>
        )}
        {isRestoringSession ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.teal} size="large" />
            <Text style={styles.loadingText}>Checking your account…</Text>
          </View>
        ) : user ? (
          <RootNavigator
            onSignOut={() => {
              void logout().catch(() => undefined);
            }}
            user={user}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.loginScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <View style={styles.logoWrap}>
                <Image
                  source={require("./assets/arniss-logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.loginTitle}>Train with purpose.</Text>
              <Text style={styles.subtitle}>
                Build practical skills, track your progress, and stay connected
                to your class.
              </Text>
            </View>
            <View style={styles.formSection}>
              <LoginForm />
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.paper, flex: 1 },
  loginScroll: { flexGrow: 1, paddingBottom: 28 },
  hero: {
    backgroundColor: colors.tealDark,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 88,
    height: 88,
  },
  formSection: { paddingHorizontal: 26, paddingTop: 26, gap: 18 },
  offlineBanner: {
    alignItems: "center",
    backgroundColor: "#FFF0D0",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offlineDot: {
    backgroundColor: "#B96C1B",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  offlineText: { color: "#70440F", flex: 1, fontSize: 12, fontWeight: "700" },
  loading: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center" },
  loadingText: { color: colors.muted, fontSize: 14 },
  loginTitle: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 10,
  },
  subtitle: {
    color: "#D5E8E5",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 325,
  },
});
