export type StudentRosterRecord = {
  id: string;
  created_by: string;
  email: string;
  full_name: string;
  grade: string;
  section: string;
  status: "active" | "archived";
  created_at: unknown;
  updated_at: unknown;
  linked_user_id?: string;
};

export type StudentRosterInput = Omit<
  StudentRosterRecord,
  "id" | "created_by" | "status" | "created_at" | "updated_at"
>;
