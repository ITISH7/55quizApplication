import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://itish:Itish123@55techdatabase.igw6d5s.mongodb.net/?retryWrites=true&w=majority&appName=55techdatabase';

export async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Quiz Schema
const quizSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  passkey: { type: String, required: true },
  status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
  defaultTimePerQuestion: { type: Number, default: 45 },
  scoringType: { type: String, enum: ['standard', 'speed', 'negative'], default: 'speed' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  currentQuestionIndex: { type: Number, default: 0 }
});

// Question Schema
const questionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  quizId: { type: String, required: true },
  questionNumber: { type: Number, required: true },
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  isBonus: { type: Boolean, default: false },
  timeLimit: { type: Number, default: 45 }
});

// Quiz Session Schema
const quizSessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  quizId: { type: String, required: true },
  userId: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Answer Schema
const answerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  quizId: { type: String, required: true },
  questionId: { type: String, required: true },
  userId: { type: String, required: true },
  selectedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  timeToAnswer: { type: Number, required: true },
  points: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
});

// OTP Schema
const otpSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const Quiz = mongoose.model('Quiz', quizSchema);
export const Question = mongoose.model('Question', questionSchema);
export const QuizSession = mongoose.model('QuizSession', quizSessionSchema);
export const Answer = mongoose.model('Answer', answerSchema);
export const OTP = mongoose.model('OTP', otpSchema);