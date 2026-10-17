import type { UserRole } from "../auth/types";

export type Profile = {
  user_id: string;
  role: UserRole;
  full_name: string;
  grade: string;
  section: string;
  created_at: unknown;
};

export type ProfileInput = Omit<Profile, "user_id" | "created_at">;
