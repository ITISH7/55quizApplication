import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertQuizSchema, insertQuestionSchema, insertOtpSchema, insertAnswerSchema } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// WebSocket connections
const connections = new Map<string, WebSocket>();
const quizRooms = new Map<string, Set<string>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    try {
      // Simple token format: userId (in production, use proper JWT)
      const user = await storage.getUser(token);
      if (!user) {
        return res.status(401).json({ error: "Invalid token" });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Generate and send OTP
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Validate email domain
      if (!email.endsWith("@fiftyfivetech.io")) {
        return res.status(400).json({ error: "Only @fiftyfivetech.io emails are allowed" });
      }

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createOtp({ email, code, expiresAt });

      // In production, send email with Nodemailer
      console.log(`OTP for ${email}: ${code}`);

      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP and login
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, code } = req.body;

      const otp = await storage.getValidOtp(email, code);
      if (!otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      await storage.markOtpAsUsed(otp.id);

      // Get or create user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({ 
          email, 
          isAdmin: email === "admin@fiftyfivetech.io" 
        });
      }

      // Return user ID as token (in production, use proper JWT)
      res.json({ 
        token: user.id, 
        user: { 
          id: user.id, 
          email: user.email, 
          isAdmin: user.isAdmin 
        } 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    res.json({ 
      user: { 
        id: req.user.id, 
        email: req.user.email, 
        isAdmin: req.user.isAdmin 
      } 
    });
  });

  // Create quiz (Admin only)
  app.post("/api/quizzes", requireAuth, requireAdmin, upload.single('excelFile'), async (req: any, res) => {
    try {
      const { title, passkey, defaultTimePerQuestion, scoringType } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: "Excel file is required" });
      }

      // Create quiz
      const quiz = await storage.createQuiz({
        title,
        passkey,
        defaultTimePerQuestion: parseInt(defaultTimePerQuestion) || 45,
        scoringType: scoringType || "speed",
        createdBy: req.user.id
      });

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Create questions
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        await storage.createQuestion({
          quizId: quiz.id,
          questionNumber: i + 1,
          text: row.Question || row.question,
          options: [
            row['Option A'] || row.optionA,
            row['Option B'] || row.optionB,
            row['Option C'] || row.optionC,
            row['Option D'] || row.optionD
          ],
          correctAnswer: row['Correct Answer'] || row.correctAnswer,
          isBonus: (row['Is Bonus'] || row.isBonus) === 'Yes' || (row['Is Bonus'] || row.isBonus) === true,
          timeLimit: parseInt(row['Time Limit (seconds)'] || row.timeLimit) || defaultTimePerQuestion || 45
        });
      }

      res.json({ quiz });
    } catch (error) {
      console.error('Quiz creation error:', error);
      res.status(500).json({ error: "Failed to create quiz" });
    }
  });

  // Get quizzes
  app.get("/api/quizzes", requireAuth, async (req: any, res) => {
    try {
      const quizzes = await storage.getUserQuizzes(req.user.isAdmin);
      res.json({ quizzes });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  // Get quiz details
  app.get("/api/quizzes/:id", requireAuth, async (req: any, res) => {
    try {
      const quiz = await storage.getQuizWithQuestions(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      res.json({ quiz });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quiz" });
    }
  });

  // Start quiz (Admin only)
  app.post("/api/quizzes/:id/start", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.updateQuizStatus(req.params.id, "active", new Date());
      
      // Broadcast quiz start to all connected clients
      broadcastToQuiz(req.params.id, {
        type: "quiz_started",
        quizId: req.params.id
      });

      res.json({ message: "Quiz started" });
    } catch (error) {
      res.status(500).json({ error: "Failed to start quiz" });
    }
  });

  // Reveal question (Admin only)
  app.post("/api/quizzes/:quizId/questions/:questionId/reveal", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.updateQuestionReveal(req.params.questionId, true);
      
      const question = await storage.getQuizQuestions(req.params.quizId);
      const currentQ = question.find(q => q.id === req.params.questionId);

      if (currentQ) {
        broadcastToQuiz(req.params.quizId, {
          type: "question_revealed",
          question: currentQ
        });
      }

      res.json({ message: "Question revealed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reveal question" });
    }
  });

  // Join quiz
  app.post("/api/quizzes/:id/join", requireAuth, async (req: any, res) => {
    try {
      const { passkey } = req.body;
      
      const quiz = await storage.getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      if (quiz.passkey !== passkey) {
        return res.status(400).json({ error: "Invalid passkey" });
      }

      if (quiz.status !== "active") {
        return res.status(400).json({ error: "Quiz is not active" });
      }

      // Check if user already has a session
      let session = await storage.getUserQuizSession(req.user.id, req.params.id);
      if (!session) {
        session = await storage.createQuizSession({
          quizId: req.params.id,
          userId: req.user.id
        });
      }

      await storage.updateUserSession(req.user.id, session.id);

      res.json({ session });
    } catch (error) {
      res.status(500).json({ error: "Failed to join quiz" });
    }
  });

  // Submit answer
  app.post("/api/answers", requireAuth, async (req: any, res) => {
    try {
      const { sessionId, questionId, selectedAnswer } = req.body;

      const session = await storage.getQuizSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({ error: "Invalid session" });
      }

      const questions = await storage.getQuizQuestions(session.quizId);
      const question = questions.find(q => q.id === questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const isCorrect = selectedAnswer === question.correctAnswer;
      let points = 0;
      let answerOrder;

      if (isCorrect) {
        const answerCount = await storage.getQuestionAnswerCount(questionId);
        answerOrder = answerCount + 1;

        // Calculate points based on scoring type
        const quiz = await storage.getQuiz(session.quizId);
        if (quiz?.scoringType === "speed") {
          if (answerOrder === 1) points = 15;
          else if (answerOrder === 2) points = 10;
          else if (answerOrder === 3) points = 5;
          else points = 3;
        } else {
          points = 10;
        }

        if (question.isBonus) {
          points *= 2;
        }
      }

      const answer = await storage.createAnswer({
        sessionId,
        questionId,
        selectedAnswer: selectedAnswer || null,
        isCorrect,
        points,
        answerOrder
      });

      // Update session score
      const currentAnswers = await storage.getSessionAnswers(sessionId);
      const totalScore = currentAnswers.reduce((sum, a) => sum + a.points, 0) + points;
      await storage.updateSessionScore(sessionId, totalScore);

      // Broadcast answer to quiz room
      broadcastToQuiz(session.quizId, {
        type: "answer_submitted",
        userId: req.user.id,
        email: req.user.email,
        questionId,
        selectedAnswer,
        isCorrect,
        points
      });

      res.json({ answer, points, isCorrect });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  // Get leaderboard
  app.get("/api/quizzes/:id/leaderboard", requireAuth, async (req: any, res) => {
    try {
      const leaderboard = await storage.getQuizLeaderboard(req.params.id);
      res.json({ leaderboard });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Get quiz sessions (Admin only)
  app.get("/api/quizzes/:id/sessions", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const sessions = await storage.getActiveSessionsForQuiz(req.params.id);
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const quizId = url.searchParams.get('quizId');

    if (!token) {
      ws.close(1008, 'No token provided');
      return;
    }

    // Store connection
    connections.set(token, ws);

    // Join quiz room if specified
    if (quizId) {
      if (!quizRooms.has(quizId)) {
        quizRooms.set(quizId, new Set());
      }
      quizRooms.get(quizId)!.add(token);
    }

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      connections.delete(token);
      
      // Remove from quiz rooms
      for (const [roomId, users] of quizRooms.entries()) {
        users.delete(token);
        if (users.size === 0) {
          quizRooms.delete(roomId);
        }
      }
    });
  });

  function broadcastToQuiz(quizId: string, message: any) {
    const room = quizRooms.get(quizId);
    if (room) {
      room.forEach(token => {
        const ws = connections.get(token);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  return httpServer;
}
