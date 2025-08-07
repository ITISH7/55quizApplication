import { 
  type User, 
  type InsertUser,
  type Quiz,
  type InsertQuiz,
  type Question,
  type InsertQuestion,
  type QuizSession,
  type InsertQuizSession,
  type Answer,
  type InsertAnswer,
  type OtpCode,
  type InsertOtp,
  type QuizWithQuestions,
  type SessionWithAnswers,
  type LeaderboardEntry
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSession(userId: string, sessionId: string | null): Promise<void>;

  // OTP operations
  createOtp(otp: InsertOtp): Promise<OtpCode>;
  getValidOtp(email: string, code: string): Promise<OtpCode | undefined>;
  markOtpAsUsed(otpId: string): Promise<void>;

  // Quiz operations
  createQuiz(quiz: InsertQuiz & { createdBy: string }): Promise<Quiz>;
  getQuiz(id: string): Promise<Quiz | undefined>;
  getQuizWithQuestions(id: string): Promise<QuizWithQuestions | undefined>;
  updateQuizStatus(id: string, status: string, timestamp?: Date): Promise<void>;
  getUserQuizzes(isAdmin: boolean): Promise<Quiz[]>;

  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuizQuestions(quizId: string): Promise<Question[]>;
  updateQuestionReveal(questionId: string, isRevealed: boolean): Promise<void>;
  getCurrentQuestion(quizId: string): Promise<Question | undefined>;

  // Session operations
  createQuizSession(session: InsertQuizSession): Promise<QuizSession>;
  getQuizSession(sessionId: string): Promise<QuizSession | undefined>;
  getUserQuizSession(userId: string, quizId: string): Promise<QuizSession | undefined>;
  updateSessionScore(sessionId: string, score: number): Promise<void>;
  updateSessionQuestion(sessionId: string, questionNumber: number): Promise<void>;
  getActiveSessionsForQuiz(quizId: string): Promise<SessionWithAnswers[]>;

  // Answer operations
  createAnswer(answer: InsertAnswer & { isCorrect: boolean; points: number; timeToAnswer?: number; answerOrder?: number }): Promise<Answer>;
  getSessionAnswers(sessionId: string): Promise<Answer[]>;
  getQuestionAnswerCount(questionId: string): Promise<number>;

  // Leaderboard operations
  getQuizLeaderboard(quizId: string): Promise<LeaderboardEntry[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private quizzes: Map<string, Quiz> = new Map();
  private questions: Map<string, Question> = new Map();
  private quizSessions: Map<string, QuizSession> = new Map();
  private answers: Map<string, Answer> = new Map();
  private otpCodes: Map<string, OtpCode> = new Map();

  constructor() {
    // Create admin users
    this.createUser({ email: "nishant.gandhi@fiftyfivetech.io", isAdmin: true });
    this.createUser({ email: "itish.jain@fiftyfivetech.io", isAdmin: true });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      isAdmin: insertUser.isAdmin || false,
      currentSessionId: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserSession(userId: string, sessionId: string | null): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.currentSessionId = sessionId;
      this.users.set(userId, user);
    }
  }

  async createOtp(insertOtp: InsertOtp): Promise<OtpCode> {
    const id = randomUUID();
    const otp: OtpCode = {
      ...insertOtp,
      id,
      isUsed: false,
      createdAt: new Date()
    };
    this.otpCodes.set(id, otp);
    return otp;
  }

  async getValidOtp(email: string, code: string): Promise<OtpCode | undefined> {
    return Array.from(this.otpCodes.values()).find(
      otp => otp.email === email && 
             otp.code === code && 
             !otp.isUsed && 
             otp.expiresAt > new Date()
    );
  }

  async markOtpAsUsed(otpId: string): Promise<void> {
    const otp = this.otpCodes.get(otpId);
    if (otp) {
      otp.isUsed = true;
      this.otpCodes.set(otpId, otp);
    }
  }

  async createQuiz(quiz: InsertQuiz & { createdBy: string }): Promise<Quiz> {
    const id = randomUUID();
    const newQuiz: Quiz = {
      ...quiz,
      id,
      defaultTimePerQuestion: quiz.defaultTimePerQuestion || 45,
      scoringType: quiz.scoringType || "speed",
      speedScoringConfig: quiz.speedScoringConfig || null,
      status: "draft",
      createdAt: new Date(),
      startedAt: null,
      completedAt: null
    };
    this.quizzes.set(id, newQuiz);
    return newQuiz;
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    return this.quizzes.get(id);
  }

  async getQuizWithQuestions(id: string): Promise<QuizWithQuestions | undefined> {
    const quiz = this.quizzes.get(id);
    if (!quiz) return undefined;

    const questions = Array.from(this.questions.values())
      .filter(q => q.quizId === id)
      .sort((a, b) => a.questionNumber - b.questionNumber);

    const participantCount = Array.from(this.quizSessions.values())
      .filter(s => s.quizId === id && s.isActive).length;

    return {
      ...quiz,
      questions,
      participantCount
    };
  }

  async updateQuizStatus(id: string, status: string, timestamp?: Date): Promise<void> {
    const quiz = this.quizzes.get(id);
    if (quiz) {
      quiz.status = status;
      if (status === "active" && timestamp) {
        quiz.startedAt = timestamp;
      }
      if (status === "completed" && timestamp) {
        quiz.completedAt = timestamp;
      }
      this.quizzes.set(id, quiz);
    }
  }

  async getUserQuizzes(isAdmin: boolean): Promise<Quiz[]> {
    const quizzes = Array.from(this.quizzes.values());
    if (isAdmin) {
      return quizzes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return quizzes.filter(q => q.status === "active" || q.status === "completed")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = randomUUID();
    const newQuestion: Question = {
      ...question,
      id,
      isBonus: question.isBonus || false,
      timeLimit: question.timeLimit || 45,
      points: question.points || 10,
      isRevealed: false,
      revealedAt: null
    };
    this.questions.set(id, newQuestion);
    return newQuestion;
  }

  async getQuizQuestions(quizId: string): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter(q => q.quizId === quizId)
      .sort((a, b) => a.questionNumber - b.questionNumber);
  }

  async updateQuestionReveal(questionId: string, isRevealed: boolean): Promise<void> {
    const question = this.questions.get(questionId);
    if (question) {
      question.isRevealed = isRevealed;
      question.revealedAt = isRevealed ? new Date() : null;
      this.questions.set(questionId, question);
    }
  }

  async getCurrentQuestion(quizId: string): Promise<Question | undefined> {
    return Array.from(this.questions.values())
      .find(q => q.quizId === quizId && q.isRevealed);
  }

  async createQuizSession(session: InsertQuizSession): Promise<QuizSession> {
    const id = randomUUID();
    const newSession: QuizSession = {
      ...session,
      id,
      joinedAt: new Date(),
      totalScore: 0,
      currentQuestionNumber: 0,
      isActive: true
    };
    this.quizSessions.set(id, newSession);
    return newSession;
  }

  async getQuizSession(sessionId: string): Promise<QuizSession | undefined> {
    return this.quizSessions.get(sessionId);
  }

  async getUserQuizSession(userId: string, quizId: string): Promise<QuizSession | undefined> {
    return Array.from(this.quizSessions.values())
      .find(s => s.userId === userId && s.quizId === quizId && s.isActive);
  }

  async updateSessionScore(sessionId: string, score: number): Promise<void> {
    const session = this.quizSessions.get(sessionId);
    if (session) {
      session.totalScore = score;
      this.quizSessions.set(sessionId, session);
    }
  }

  async updateSessionQuestion(sessionId: string, questionNumber: number): Promise<void> {
    const session = this.quizSessions.get(sessionId);
    if (session) {
      session.currentQuestionNumber = questionNumber;
      this.quizSessions.set(sessionId, session);
    }
  }

  async getActiveSessionsForQuiz(quizId: string): Promise<SessionWithAnswers[]> {
    const sessions = Array.from(this.quizSessions.values())
      .filter(s => s.quizId === quizId && s.isActive);

    return sessions.map(session => {
      const answers = Array.from(this.answers.values())
        .filter(a => a.sessionId === session.id);
      const user = this.users.get(session.userId)!;
      
      return {
        ...session,
        answers,
        user
      };
    });
  }

  async createAnswer(answer: InsertAnswer & { isCorrect: boolean; points: number; timeToAnswer: number; answerOrder?: number }): Promise<Answer> {
    const id = randomUUID();
    const newAnswer: Answer = {
      ...answer,
      id,
      selectedAnswer: answer.selectedAnswer || null,
      answerOrder: answer.answerOrder || null,
      submittedAt: new Date()
    };
    this.answers.set(id, newAnswer);
    return newAnswer;
  }

  async getSessionAnswers(sessionId: string): Promise<Answer[]> {
    return Array.from(this.answers.values())
      .filter(a => a.sessionId === sessionId)
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  }

  async getQuestionAnswerCount(questionId: string): Promise<number> {
    return Array.from(this.answers.values())
      .filter(a => a.questionId === questionId).length;
  }

  async getQuizLeaderboard(quizId: string): Promise<LeaderboardEntry[]> {
    const sessions = Array.from(this.quizSessions.values())
      .filter(s => s.quizId === quizId && s.isActive);

    const leaderboard = sessions.map(session => {
      const user = this.users.get(session.userId)!;
      const answers = Array.from(this.answers.values())
        .filter(a => a.sessionId === session.id);
      
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      
      return {
        userId: session.userId,
        email: user.email,
        totalScore: session.totalScore,
        correctAnswers,
        totalAnswers: answers.length,
        rank: 0 // Will be calculated below
      };
    });

    // Sort by score and assign ranks
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard;
  }
}

import { MongoStorage } from './mongo-storage';

export const storage = new MongoStorage();
