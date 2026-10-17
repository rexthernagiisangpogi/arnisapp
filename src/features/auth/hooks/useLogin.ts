import { useState } from "react";
import {
    getAuthErrorMessage,
    login,
    sendPasswordReset,
    signUp,
} from "../services/authService";
import { authStore } from "../store/authStore";
import type { AuthMode, LoginCredentials, SignUpCredentials } from "../types";
import { validateCredentials } from "../validation";

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(
    credentials: LoginCredentials | SignUpCredentials,
    mode: AuthMode,
  ) {
    const errors = validateCredentials(credentials, mode);
    if (Object.keys(errors).length) return errors;
    setError(null);
    setNotice(null);
    setIsLoading(true);
    try {
      const result =
        mode === "signUp"
          ? await signUp(credentials as SignUpCredentials)
          : await login(credentials as LoginCredentials);
      authStore.setUser(result.user);
      return null;
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function resetPassword(email: string) {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address first.");
      return;
    }
    setError(null);
    setNotice(null);
    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setNotice("Password reset instructions have been sent.");
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }

  return {
    submit,
    resetPassword,
    isLoading,
    error,
    notice,
    clearError: () => setError(null),
  };
}
