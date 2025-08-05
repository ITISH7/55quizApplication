import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  currentSessionId: varchar("current_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  passkey: text("passkey").notNull(),
  status: text("status").notNull().default("draft"), // draft, active, completed
  defaultTimePerQuestion: integer("default_time_per_question").default(45).notNull(),
  scoringType: text("scoring_type").default("speed").notNull(), // standard, speed, negative
  speedScoringConfig: jsonb("speed_scoring_config"), // { timeThresholds: [{ maxTime: 10, points: 20 }, { maxTime: 20, points: 15 }] }
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").references(() => quizzes.id).notNull(),
  questionNumber: integer("question_number").notNull(),
  text: text("text").notNull(),
  options: jsonb("options").notNull(), // ["A", "B", "C", "D"]
  correctAnswer: text("correct_answer").notNull(),
  isBonus: boolean("is_bonus").default(false).notNull(),
  timeLimit: integer("time_limit").default(45).notNull(),
  points: integer("points").default(10).notNull(),
  isRevealed: boolean("is_revealed").default(false).notNull(),
  revealedAt: timestamp("revealed_at"),
});

export const quizSessions = pgTable("quiz_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").references(() => quizzes.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  totalScore: integer("total_score").default(0).notNull(),
  currentQuestionNumber: integer("current_question_number").default(0),
  isActive: boolean("is_active").default(true).notNull(),
});

export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => quizSessions.id).notNull(),
  questionId: varchar("question_id").references(() => questions.id).notNull(),
  selectedAnswer: text("selected_answer"), // null if skipped
  isCorrect: boolean("is_correct").default(false).notNull(),
  points: integer("points").default(0).notNull(),
  answerOrder: integer("answer_order"), // 1st, 2nd, 3rd correct answer
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  isAdmin: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).pick({
  title: true,
  passkey: true,
  defaultTimePerQuestion: true,
  scoringType: true,
  speedScoringConfig: true,
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  quizId: true,
  questionNumber: true,
  text: true,
  options: true,
  correctAnswer: true,
  isBonus: true,
  timeLimit: true,
  points: true,
});

export const insertQuizSessionSchema = createInsertSchema(quizSessions).pick({
  quizId: true,
  userId: true,
});

export const insertAnswerSchema = createInsertSchema(answers).pick({
  sessionId: true,
  questionId: true,
  selectedAnswer: true,
});

export const insertOtpSchema = createInsertSchema(otpCodes).pick({
  email: true,
  code: true,
  expiresAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtp = z.infer<typeof insertOtpSchema>;

// Extended types for API responses
export type QuizWithQuestions = Quiz & {
  questions: Question[];
  participantCount?: number;
};

export type SessionWithAnswers = QuizSession & {
  answers: Answer[];
  user: User;
};

export type LeaderboardEntry = {
  userId: string;
  email: string;
  totalScore: number;
  correctAnswers: number;
  totalAnswers: number;
  rank: number;
  totalTime?: string;
};
