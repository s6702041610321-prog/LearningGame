export type UserRole = "student" | "admin";

export type LearningStatus = "not_started" | "learning" | "completed";

export interface StudentProgress {
  id: string;
  name: string;
  role: UserRole;
  learningStatus: LearningStatus;
  preTestScore: number | null;
  postTestScore: number | null;
  developmentResult: string; // e.g., "Excellent", "Improved", "No Post-test yet", "Retake improved"
  lastActive: string; // ISO string
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answerIndex: number; // 0-indexed
  explanation: string;
}

export interface MatchCard {
  id: string;
  text: string;
  type: "term" | "definition";
  matchId: string; // the term and definition will share this matchId
}

export interface SheetLogPayload {
  action: "login" | "logout" | "save_pre_test" | "save_post_test" | "update_status" | "get_leaderboard";
  id: string;
  name: string;
  role: UserRole;
  learningStatus: LearningStatus;
  preTestScore: string; // e.g. "5/5" or "-"
  postTestScore: string; // e.g. "5/5" or "-"
  developmentResult: string;
  timestamp: string;
}

export interface LeaderboardRecord {
  rank: number;
  name: string;
  role: string;
  status: string;
  preScore: string;
  postScore: string;
  devResult: string;
  timestamp: string;
}
