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
import mongoose from 'mongoose';
import { IStorage } from './storage';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://itish:Itish123@55techdatabase.igw6d5s.mongodb.net/?retryWrites=true&w=majority&appName=55techdatabase';

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  _id: String,
  email: { type: String, required: true, unique: true },
  isAdmin: { type: Boolean, default: false },
  currentSessionId: String,
  createdAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema({
  _id: String,
  title: { type: String, required: true },
  passkey: { type: String, required: true },
  status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
  defaultTimePerQuestion: { type: Number, default: 45 },
  scoringType: { type: String, enum: ['standard', 'speed', 'negative'], default: 'speed' },
  speedScoringConfig: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
  currentQuestionIndex: { type: Number, default: 0 }
});

const questionSchema = new mongoose.Schema({
  _id: String,
  quizId: { type: String, required: true },
  questionNumber: { type: Number, required: true },
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  isBonus: { type: Boolean, default: false },
  timeLimit: { type: Number, default: 45 },
  points: { type: Number, default: 10 },
  isRevealed: { type: Boolean, default: false }
});

const quizSessionSchema = new mongoose.Schema({
  _id: String,
  userId: { type: String, required: true },
  quizId: { type: String, required: true },
  score: { type: Number, default: 0 },
  currentQuestionNumber: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  joinedAt: { type: Date, default: Date.now },
  completedAt: Date
});

const answerSchema = new mongoose.Schema({
  _id: String,
  sessionId: { type: String, required: true },
  questionId: { type: String, required: true },
  selectedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  points: { type: Number, required: true },
  timeToAnswer: { type: Number, required: true },
  answerOrder: Number,
  submittedAt: { type: Date, default: Date.now }
});

const otpSchema = new mongoose.Schema({
  _id: String,
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// MongoDB Models
const UserModel = mongoose.model('User', userSchema);
const QuizModel = mongoose.model('Quiz', quizSchema);
const QuestionModel = mongoose.model('Question', questionSchema);
const QuizSessionModel = mongoose.model('QuizSession', quizSessionSchema);
const AnswerModel = mongoose.model('Answer', answerSchema);
const OtpModel = mongoose.model('OTP', otpSchema);

export class MongoStorage implements IStorage {
  private connected = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    if (this.connected) return;
    
    try {
      await mongoose.connect(MONGODB_URI);
      this.connected = true;
      console.log('Connected to MongoDB Atlas');
      
      // Create admin users if they don't exist
      await this.ensureAdminUsers();
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  private async ensureAdminUsers() {
    const adminEmails = ["nishant.gandhi@fiftyfivetech.io", "itish.jain@fiftyfivetech.io"];
    
    for (const email of adminEmails) {
      try {
        const existingUser = await UserModel.findOne({ email });
        if (!existingUser) {
          const userId = randomUUID();
          await UserModel.create({
            _id: userId,
            email,
            isAdmin: true
          });
          console.log(`Created admin user: ${email}`);
        }
      } catch (error) {
        // User already exists, ignore duplicate key error
        if ((error as any).code !== 11000) {
          console.error(`Error creating admin user ${email}:`, error);
        }
      }
    }
  }

  private async ensureConnection() {
    if (!this.connected) {
      await this.connect();
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    await this.ensureConnection();
    const user = await UserModel.findById(id);
    return user ? this.mongoToUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureConnection();
    const user = await UserModel.findOne({ email });
    return user ? this.mongoToUser(user) : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.ensureConnection();
    const id = randomUUID();
    const newUser = await UserModel.create({
      _id: id,
      ...user
    });
    return this.mongoToUser(newUser);
  }

  async updateUserSession(userId: string, sessionId: string | null): Promise<void> {
    await this.ensureConnection();
    await UserModel.findByIdAndUpdate(userId, { currentSessionId: sessionId });
  }

  async createOtp(otp: InsertOtp): Promise<OtpCode> {
    await this.ensureConnection();
    const id = randomUUID();
    const newOtp = await OtpModel.create({
      _id: id,
      ...otp
    });
    return this.mongoToOtp(newOtp);
  }

  async getValidOtp(email: string, code: string): Promise<OtpCode | undefined> {
    await this.ensureConnection();
    const otp = await OtpModel.findOne({
      email,
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
    return otp ? this.mongoToOtp(otp) : undefined;
  }

  async markOtpAsUsed(otpId: string): Promise<void> {
    await this.ensureConnection();
    await OtpModel.findByIdAndUpdate(otpId, { isUsed: true });
  }

  async createQuiz(quiz: InsertQuiz & { createdBy: string }): Promise<Quiz> {
    await this.ensureConnection();
    const id = randomUUID();
    const newQuiz = await QuizModel.create({
      _id: id,
      ...quiz
    });
    return this.mongoToQuiz(newQuiz);
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    await this.ensureConnection();
    const quiz = await QuizModel.findById(id);
    return quiz ? this.mongoToQuiz(quiz) : undefined;
  }

  async getQuizWithQuestions(id: string): Promise<QuizWithQuestions | undefined> {
    await this.ensureConnection();
    const quiz = await QuizModel.findById(id);
    if (!quiz) return undefined;

    const questions = await QuestionModel.find({ quizId: id }).sort({ questionNumber: 1 });
    
    return {
      ...this.mongoToQuiz(quiz),
      questions: questions.map(q => this.mongoToQuestion(q))
    };
  }

  async updateQuizStatus(id: string, status: string, timestamp?: Date): Promise<void> {
    await this.ensureConnection();
    const updateData: any = { status };
    if (status === 'active' && timestamp) updateData.startedAt = timestamp;
    if (status === 'completed' && timestamp) updateData.completedAt = timestamp;
    
    await QuizModel.findByIdAndUpdate(id, updateData);
  }

  async getUserQuizzes(isAdmin: boolean): Promise<Quiz[]> {
    await this.ensureConnection();
    const quizzes = await QuizModel.find().sort({ createdAt: -1 });
    return quizzes.map(q => this.mongoToQuiz(q));
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    await this.ensureConnection();
    const id = randomUUID();
    const newQuestion = await QuestionModel.create({
      _id: id,
      ...question
    });
    return this.mongoToQuestion(newQuestion);
  }

  async getQuizQuestions(quizId: string): Promise<Question[]> {
    await this.ensureConnection();
    const questions = await QuestionModel.find({ quizId }).sort({ questionNumber: 1 });
    return questions.map(q => this.mongoToQuestion(q));
  }

  async updateQuestionReveal(questionId: string, isRevealed: boolean): Promise<void> {
    await this.ensureConnection();
    await QuestionModel.findByIdAndUpdate(questionId, { isRevealed });
  }

  async getCurrentQuestion(quizId: string): Promise<Question | undefined> {
    await this.ensureConnection();
    const quiz = await QuizModel.findById(quizId);
    if (!quiz) return undefined;

    const question = await QuestionModel.findOne({
      quizId,
      questionNumber: quiz.currentQuestionIndex + 1
    });
    
    return question ? this.mongoToQuestion(question) : undefined;
  }

  async createQuizSession(session: InsertQuizSession): Promise<QuizSession> {
    await this.ensureConnection();
    const id = randomUUID();
    const newSession = await QuizSessionModel.create({
      _id: id,
      score: 0,
      currentQuestionNumber: 0,
      isActive: true,
      joinedAt: new Date(),
      ...session
    });
    return this.mongoToQuizSession(newSession);
  }

  async getQuizSession(sessionId: string): Promise<QuizSession | undefined> {
    await this.ensureConnection();
    const session = await QuizSessionModel.findById(sessionId);
    return session ? this.mongoToQuizSession(session) : undefined;
  }

  async getUserQuizSession(userId: string, quizId: string): Promise<QuizSession | undefined> {
    await this.ensureConnection();
    const session = await QuizSessionModel.findOne({ userId, quizId });
    return session ? this.mongoToQuizSession(session) : undefined;
  }

  async updateSessionScore(sessionId: string, score: number): Promise<void> {
    await this.ensureConnection();
    await QuizSessionModel.findByIdAndUpdate(sessionId, { score });
  }

  async updateSessionQuestion(sessionId: string, questionNumber: number): Promise<void> {
    await this.ensureConnection();
    await QuizSessionModel.findByIdAndUpdate(sessionId, { currentQuestionNumber: questionNumber });
  }

  async getActiveSessionsForQuiz(quizId: string): Promise<SessionWithAnswers[]> {
    await this.ensureConnection();
    const sessions = await QuizSessionModel.find({ quizId, isActive: true });
    
    const sessionsWithAnswers: SessionWithAnswers[] = [];
    
    for (const session of sessions) {
      const user = await UserModel.findById(session.userId);
      const answers = await AnswerModel.find({ sessionId: session._id });
      
      if (user) {
        sessionsWithAnswers.push({
          ...this.mongoToQuizSession(session),
          user: this.mongoToUser(user),
          answers: answers.map(a => this.mongoToAnswer(a))
        });
      }
    }
    
    return sessionsWithAnswers;
  }

  async createAnswer(answer: InsertAnswer & { isCorrect: boolean; points: number; answerOrder?: number }): Promise<Answer> {
    await this.ensureConnection();
    const id = randomUUID();
    const newAnswer = await AnswerModel.create({
      _id: id,
      ...answer
    });
    return this.mongoToAnswer(newAnswer);
  }

  async getSessionAnswers(sessionId: string): Promise<Answer[]> {
    await this.ensureConnection();
    const answers = await AnswerModel.find({ sessionId }).sort({ submittedAt: 1 });
    return answers.map(a => this.mongoToAnswer(a));
  }

  async getQuestionAnswerCount(questionId: string): Promise<number> {
    await this.ensureConnection();
    return await AnswerModel.countDocuments({ questionId });
  }

  async getQuizLeaderboard(quizId: string): Promise<LeaderboardEntry[]> {
    await this.ensureConnection();
    const sessions = await QuizSessionModel.find({ quizId }).sort({ score: -1 });
    
    const leaderboard: LeaderboardEntry[] = [];
    
    for (const session of sessions) {
      const user = await UserModel.findById(session.userId);
      if (user) {
        const answers = await AnswerModel.find({ sessionId: session._id });
        const correctAnswers = answers.filter(a => a.isCorrect).length;
        
        leaderboard.push({
          userId: session.userId,
          email: user.email,
          totalScore: session.score,
          correctAnswers,
          totalAnswers: answers.length,
          rank: leaderboard.length + 1
        });
      }
    }
    
    return leaderboard;
  }

  // Helper conversion methods
  private mongoToUser(doc: any): User {
    return {
      id: doc._id,
      email: doc.email,
      isAdmin: doc.isAdmin,
      currentSessionId: doc.currentSessionId,
      createdAt: doc.createdAt
    };
  }

  private mongoToQuiz(doc: any): Quiz {
    return {
      id: doc._id,
      title: doc.title,
      passkey: doc.passkey,
      status: doc.status,
      defaultTimePerQuestion: doc.defaultTimePerQuestion,
      scoringType: doc.scoringType,
      speedScoringConfig: doc.speedScoringConfig,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt
    };
  }

  private mongoToQuestion(doc: any): Question {
    return {
      id: doc._id,
      quizId: doc.quizId,
      questionNumber: doc.questionNumber,
      text: doc.text,
      options: doc.options,
      correctAnswer: doc.correctAnswer,
      isBonus: doc.isBonus,
      timeLimit: doc.timeLimit,
      points: doc.points || 10,
      isRevealed: doc.isRevealed,
      revealedAt: doc.revealedAt || null
    };
  }

  private mongoToQuizSession(doc: any): QuizSession {
    return {
      id: doc._id,
      userId: doc.userId,
      quizId: doc.quizId,
      totalScore: doc.score,
      currentQuestionNumber: doc.currentQuestionNumber,
      isActive: doc.isActive,
      joinedAt: doc.joinedAt
    };
  }

  private mongoToAnswer(doc: any): Answer {
    return {
      id: doc._id,
      sessionId: doc.sessionId,
      questionId: doc.questionId,
      selectedAnswer: doc.selectedAnswer,
      isCorrect: doc.isCorrect,
      points: doc.points,
      answerOrder: doc.answerOrder || null,
      submittedAt: doc.submittedAt
    };
  }

  private mongoToOtp(doc: any): OtpCode {
    return {
      id: doc._id,
      email: doc.email,
      code: doc.code,
      expiresAt: doc.expiresAt,
      isUsed: doc.isUsed,
      createdAt: doc.createdAt
    };
  }
}