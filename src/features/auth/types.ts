export type UserRole = "teacher" | "student";
export type User = { id: string; name: string; email: string; role: UserRole };
export type LoginCredentials = {
  email: string;
  password: string;
  role: UserRole;
};
export type SignUpCredentials = LoginCredentials & { name: string };
export type AuthMode = "signIn" | "signUp";
