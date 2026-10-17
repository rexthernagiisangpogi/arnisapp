import type { AuthMode, LoginCredentials, SignUpCredentials } from "./types";

export type AuthFieldErrors = Partial<
  Record<"name" | "email" | "password", string>
>;

export function validateCredentials(
  credentials: LoginCredentials | SignUpCredentials,
  mode: AuthMode,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (
    mode === "signUp" &&
    (!("name" in credentials) || !credentials.name.trim())
  ) {
    errors.name = "Enter your name.";
  }
  if (!credentials.email.trim()) errors.email = "Email is required.";
  else if (!/^\S+@\S+\.\S+$/.test(credentials.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!credentials.password) errors.password = "Password is required.";
  else if (credentials.password.length < 6) {
    errors.password = "Use at least 6 characters.";
  }
  return errors;
}
