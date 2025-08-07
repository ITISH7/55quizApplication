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
      console.log('No token provided in request');
      return res.status(401).json({ error: "No token provided" });
    }

    try {
      // Simple token format: userId (in production, use proper JWT)
      const user = await storage.getUser(token);
      console.log('Token validation:', token.substring(0, 20) + '...', 'User found:', user ? user.email : 'NOT FOUND');
      if (!user) {
        console.log('User not found for token, checking if token is email...');
        // Check if someone is using email as token incorrectly
        if (token.includes('@fiftyfivetech.io')) {
          console.log('ERROR: Token appears to be email, not user ID!');
        }
        return res.status(401).json({ error: "Invalid token" });
      }
      req.user = user;
      next();
    } catch (error) {
      console.log('Auth error:', error);
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
        // Check if this email should be an admin
        const isAdmin = email === "nishant.gandhi@fiftyfivetech.io" || 
                       email === "itish.jain@fiftyfivetech.io" ||
                       email === "admin@fiftyfivetech.io";
        
        user = await storage.createUser({ 
          email, 
          isAdmin 
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
      const { title, passkey, defaultTimePerQuestion, scoringType, questions, speedScoringConfig } = req.body;
      
      // Create quiz
      const quiz = await storage.createQuiz({
        title,
        passkey,
        defaultTimePerQuestion: parseInt(defaultTimePerQuestion) || 45,
        scoringType: scoringType || "speed",
        speedScoringConfig: speedScoringConfig ? JSON.parse(speedScoringConfig) : null,
        createdBy: req.user.id
      });

      // Handle manual questions or Excel file
      if (questions) {
        // Manual questions from form
        console.log('Creating manual questions:', questions);
        const parsedQuestions = JSON.parse(questions);
        console.log('Parsed questions:', parsedQuestions);
        
        for (let i = 0; i < parsedQuestions.length; i++) {
          const q = parsedQuestions[i];
          console.log(`Creating question ${i + 1}:`, q);
          
          const newQuestion = await storage.createQuestion({
            quizId: quiz.id,
            questionNumber: i + 1,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            isBonus: q.isBonus || false,
            timeLimit: q.timeLimit || parseInt(defaultTimePerQuestion) || 45,
            points: q.points || 10
          });
          console.log('Created question:', newQuestion);
        }
      } else if (req.file) {
        // Excel file upload
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Create questions from Excel
        console.log('Creating Excel questions, data length:', data.length);
        for (let i = 0; i < data.length; i++) {
          const row = data[i] as any;
          const newQuestion = await storage.createQuestion({
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
            timeLimit: parseInt(row['Time Limit (seconds)'] || row.timeLimit) || parseInt(defaultTimePerQuestion) || 45,
            points: parseInt(row['Points'] || row.points) || 10
          });
          console.log('Created question from Excel:', newQuestion);
        }
      } else {
        return res.status(400).json({ error: "Either Excel file or manual questions are required" });
      }

      res.json({ quiz });
    } catch (error) {
      console.error('Quiz creation error:', error);
      res.status(500).json({ error: "Failed to create quiz" });
    }
  });

  // Download sample Excel template
  app.get("/api/quiz-template", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const sampleData = [
        {
          'Question': 'What is the capital of France?',
          'Option A': 'London',
          'Option B': 'Berlin', 
          'Option C': 'Paris',
          'Option D': 'Madrid',
          'Correct Answer': 'Option C',
          'Points': 10,
          'Is Bonus': 'No',
          'Time Limit (seconds)': 45
        },
        {
          'Question': 'Which planet is known as the Red Planet?',
          'Option A': 'Venus',
          'Option B': 'Mars',
          'Option C': 'Jupiter', 
          'Option D': 'Saturn',
          'Correct Answer': 'Option B',
          'Points': 15,
          'Is Bonus': 'No',
          'Time Limit (seconds)': 30
        },
        {
          'Question': 'BONUS: What is the chemical symbol for gold?',
          'Option A': 'Go',
          'Option B': 'Gd',
          'Option C': 'Au',
          'Option D': 'Ag',
          'Correct Answer': 'Option C',
          'Points': 20,
          'Is Bonus': 'Yes',
          'Time Limit (seconds)': 60
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Questions");
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', 'attachment; filename="quiz-template.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate template" });
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
      console.error('Error revealing question:', error);
      res.status(500).json({ error: "Failed to reveal question" });
    }
  });

  // End current question (Admin only)
  app.post("/api/quizzes/:quizId/questions/:questionId/end", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      // Broadcast question end to all participants
      broadcastToQuiz(req.params.quizId, {
        type: "question_ended",
        questionId: req.params.questionId
      });

      res.json({ message: "Question ended" });
    } catch (error) {
      console.error('Error ending question:', error);
      res.status(500).json({ error: "Failed to end question" });
    }
  });

  // Skip to next question (Admin only)
  app.post("/api/quizzes/:quizId/skip", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { questionIndex } = req.body;
      
      // Broadcast skip to next question
      broadcastToQuiz(req.params.quizId, {
        type: "question_skipped",
        nextQuestionIndex: questionIndex
      });

      res.json({ message: "Question skipped" });
    } catch (error) {
      console.error('Error skipping question:', error);
      res.status(500).json({ error: "Failed to skip question" });
    }
  });

  // End quiz (Admin only)
  app.post("/api/quizzes/:id/end", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.updateQuizStatus(req.params.id, "completed", new Date());
      
      // Broadcast quiz end to all connected clients
      broadcastToQuiz(req.params.id, {
        type: "quiz_ended",
        quizId: req.params.id
      });

      res.json({ message: "Quiz ended" });
    } catch (error) {
      console.error('Error ending quiz:', error);
      res.status(500).json({ error: "Failed to end quiz" });
    }
  });

  // Join quiz
  app.post("/api/quizzes/:id/join", requireAuth, async (req: any, res) => {
    try {
      const { passkey } = req.body;
      console.log(`Join quiz attempt - User: ${req.user.email}, Quiz: ${req.params.id}, Passkey: ${passkey}`);
      
      const quiz = await storage.getQuiz(req.params.id);
      if (!quiz) {
        console.log('Quiz not found:', req.params.id);
        return res.status(404).json({ error: "Quiz not found" });
      }

      console.log(`Quiz found - Title: ${quiz.title}, Status: ${quiz.status}, Expected passkey: ${quiz.passkey}`);

      if (quiz.passkey !== passkey) {
        console.log('Invalid passkey provided');
        return res.status(400).json({ error: "Invalid passkey" });
      }

      if (quiz.status !== "active") {
        console.log('Quiz is not active, status:', quiz.status);
        return res.status(400).json({ error: "Quiz is not active" });
      }

      // Check if user already has a session
      console.log('Checking for existing session...');
      let session = await storage.getUserQuizSession(req.user.id, req.params.id);
      if (!session) {
        console.log('Creating new session...');
        session = await storage.createQuizSession({
          quizId: req.params.id,
          userId: req.user.id
        });
        console.log('Session created:', session.id);
      } else {
        console.log('Existing session found:', session.id);
      }

      console.log('Updating user session...');
      await storage.updateUserSession(req.user.id, session.id);
      console.log('Join quiz successful');

      res.json({ session });
    } catch (error: any) {
      console.error('Join quiz error details:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: "Failed to join quiz", details: error.message });
    }
  });

  // Submit answer
  app.post("/api/answers", requireAuth, async (req: any, res) => {
    try {
      const { sessionId, questionId, selectedAnswer, answerTime } = req.body;
      console.log('Answer submission request:', { sessionId, questionId, selectedAnswer, userId: req.user.id });

      const session = await storage.getQuizSession(sessionId);
      console.log('Session lookup:', session);
      if (!session || session.userId !== req.user.id) {
        console.log('Session validation failed:', { sessionExists: !!session, sessionUserId: session?.userId, reqUserId: req.user.id });
        return res.status(403).json({ error: "Invalid session" });
      }

      const questions = await storage.getQuizQuestions(session.quizId);
      const question = questions.find(q => q.id === questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      // Debug logging for answer validation
      console.log('=== ANSWER VALIDATION DEBUG ===');
      console.log('Question ID:', questionId);
      console.log('Question data:', JSON.stringify(question, null, 2));
      console.log('Selected answer from frontend:', selectedAnswer);
      console.log('Correct answer from DB:', question.correctAnswer);

      // Normalize answer formats for comparison
      // Handle both "A"/"B"/"C"/"D" and "Option A"/"Option B"/"Option C"/"Option D" formats
      const normalizeAnswer = (answer: string): string => {
        if (!answer) return '';
        // If it's already in "Option X" format, extract just the letter
        if (answer.startsWith('Option ')) {
          return answer.replace('Option ', '');
        }
        // If it's already just the letter, return as is
        return answer;
      };

      const normalizedSelected = normalizeAnswer(selectedAnswer);
      const normalizedCorrect = normalizeAnswer(question.correctAnswer);
      
      console.log('Normalized selected:', normalizedSelected);
      console.log('Normalized correct:', normalizedCorrect);
      console.log('Are they equal?', normalizedSelected === normalizedCorrect);
      console.log('=== END DEBUG ===');

      const isCorrect = normalizedSelected === normalizedCorrect;
      let points = 0;
      let answerOrder;

      if (isCorrect) {
        const answerCount = await storage.getQuestionAnswerCount(questionId);
        answerOrder = answerCount + 1;

        // Calculate points based on scoring type
        const quiz = await storage.getQuiz(session.quizId);
        if (quiz?.scoringType === "speed" && quiz.speedScoringConfig) {
          // Position-based scoring with custom configuration
          const speedConfig = Array.isArray(quiz.speedScoringConfig) ? quiz.speedScoringConfig : (quiz.speedScoringConfig as any)?.timeThresholds || [];
          
          if (speedConfig.length > 0 && answerOrder <= speedConfig.length) {
            // Use custom points for this position (1st, 2nd, 3rd, etc.)
            points = speedConfig[answerOrder - 1]?.points || speedConfig[speedConfig.length - 1]?.points || 5;
          } else {
            // Default position-based scoring
            if (answerOrder === 1) points = 20;
            else if (answerOrder === 2) points = 15;
            else if (answerOrder === 3) points = 10;
            else points = 5;
          }
        } else if (quiz?.scoringType === "speed") {
          // Standard position-based scoring
          if (answerOrder === 1) points = 20;
          else if (answerOrder === 2) points = 15;
          else if (answerOrder === 3) points = 10;
          else points = 5;
        } else {
          points = question.points || 10;
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
        answerOrder,
        timeToAnswer: answerTime || 0 // Ensure timeToAnswer is never undefined
      });

      // Update session score
      const currentAnswers = await storage.getSessionAnswers(sessionId);
      const totalScore = currentAnswers.reduce((sum, a) => sum + (a.points || 0), 0) + points;
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
      console.error('Submit answer error:', error);
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

  // Get user's current session
  app.get("/api/user/session", requireAuth, async (req: any, res) => {
    try {
      const { quizId } = req.query;
      console.log('=== GET SESSION REQUEST ===');
      console.log('User:', req.user.email, 'User ID:', req.user.id);
      console.log('Quiz ID:', quizId);
      console.log('Timestamp:', new Date().toISOString());
      
      if (!quizId) {
        return res.status(400).json({ error: "Quiz ID is required" });
      }
      
      const session = await storage.getUserQuizSession(req.user.id, quizId);
      console.log('Session lookup result:', session ? `Session ID: ${session.id}, Quiz: ${session.quizId}, User: ${session.userId}` : 'No session found');
      
      if (!session) {
        console.log('=== SESSION NOT FOUND - DEBUGGING ===');
        // Let's check all sessions for this user to debug
        const allUserSessions = await storage.getAllUserSessions(req.user.id);
        console.log('All user sessions:', allUserSessions?.length || 0, 'sessions found');
        if (allUserSessions && allUserSessions.length > 0) {
          allUserSessions.forEach((s: any, i: number) => {
            console.log(`Session ${i + 1}:`, { id: s.id, quizId: s.quizId, joinedAt: s.joinedAt });
          });
        }
        return res.status(404).json({ error: "No active session found for this quiz" });
      }
      
      console.log('=== SESSION FOUND - SUCCESS ===');
      res.json({ session });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws: WebSocket, req) => {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const quizId = url.searchParams.get('quizId');

      console.log('WebSocket connection attempt:', { token: token ? 'present' : 'missing', quizId });

      if (!token) {
        console.log('WebSocket: No token provided');
        ws.close(1008, 'No token provided');
        return;
      }

      // Validate token
      const user = await storage.getUser(token);
      if (!user) {
        console.log('WebSocket: Invalid token');
        ws.close(1008, 'Invalid token');
        return;
      }

      console.log('WebSocket: User authenticated:', user.email);

      // Store connection
      connections.set(token, ws);

      // Join quiz room if specified
      if (quizId) {
        if (!quizRooms.has(quizId)) {
          quizRooms.set(quizId, new Set());
        }
        quizRooms.get(quizId)!.add(token);
        console.log(`User ${user.email} joined quiz room ${quizId}`);
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
        console.log(`WebSocket disconnected for user: ${user.email}`);
        connections.delete(token);
        
        // Remove from quiz rooms
        quizRooms.forEach((users, roomId) => {
          users.delete(token);
          if (users.size === 0) {
            quizRooms.delete(roomId);
          }
        });
      });

      // Send welcome message
      ws.send(JSON.stringify({ 
        type: 'connected', 
        message: 'WebSocket connected successfully',
        user: user.email 
      }));

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  function broadcastToQuiz(quizId: string, message: any) {
    const room = quizRooms.get(quizId);
    if (room) {
      room.forEach((token) => {
        const ws = connections.get(token);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  return httpServer;
}
