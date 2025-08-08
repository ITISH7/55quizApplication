import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QuizTimer } from "@/components/quiz-timer";
import { Leaderboard } from "@/components/leaderboard";
import {
  Check,
  SkipForward,
  Users,
  Trophy,
  LogOut,
  AlertCircle,
  Clock,
  Brain,
  Home,
  HelpCircle,
} from "lucide-react";

export default function LiveQuiz() {
  const [, setLocation] = useLocation();
  const { id: quizId } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const { toast } = useToast();

  // Local state
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [userSession, setUserSession] = useState<any>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [questionTimeLimit, setQuestionTimeLimit] = useState<number>(45);
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now()
  );
  const [quizEnded, setQuizEnded] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [manualSessionCheck, setManualSessionCheck] = useState<any>(null);
  const [manualCheckError, setManualCheckError] = useState<string>("");

  // Redirect if not logged in
  if (!user) {
    setLocation("/login");
    return null;
  }

  // Automatic session check on page load
  useEffect(() => {
    if (quizId && token && user) {
      const checkSession = async () => {
        try {
          const response = await fetch(
            `/api/user/session?quizId=${quizId}&auto=${Date.now()}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Cache-Control": "no-store",
              },
            }
          );
          const data = await response.json();

          if (response.ok) {
            setUserSession({ id: data.session.id });
            toast({
              title: "Session Found!",
              description: "Welcome to the live quiz!",
            });
          } else {
          }
        } catch (error) {}
      };

      // Small delay to ensure everything is loaded
      setTimeout(checkSession, 500);
    }
  }, [quizId, token, user?.id]);

  const { data: quizData } = useQuery({
    queryKey: ["/api/quizzes", quizId],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch quiz");
      return response.json();
    },
    enabled: !!quizId,
  });

  const { data: leaderboardData, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["/api/quizzes", quizId, "leaderboard"],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/${quizId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
    enabled: !!quizId,
    refetchInterval: 5000,
  });

  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket(token, quizId);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "question_revealed") {
        const isNewQuestion =
          lastMessage.question &&
          lastMessage.question.id !== currentQuestion?.id;

        setCurrentQuestion(lastMessage.question);
        setSelectedAnswer("");

        // Check if this question was already answered
        const wasAnswered = submittedQuestions.has(lastMessage.question.id);
        setIsAnswerSubmitted(wasAnswered);

        // Reset timer state for new questions
        if (isNewQuestion) {
          setQuestionStartTime(Date.now());
          const questionTime = lastMessage.question?.timeLimit || 45;
          setTimeRemaining(questionTime);
          setQuestionTimeLimit(questionTime);
        }
      } else if (lastMessage.type === "answer_submitted") {
        refetchLeaderboard();
      } else if (lastMessage.type === "quiz_ended") {
        setQuizEnded(true);
      }
    }
  }, [lastMessage, refetchLeaderboard, currentQuestion?.id]);

  const submitAnswerMutation = useMutation({
    mutationFn: async ({
      sessionId,
      questionId,
      selectedAnswer,
    }: {
      sessionId: string;
      questionId: string;
      selectedAnswer: string | null;
    }) => {
      const answerTime = (Date.now() - questionStartTime) / 1000; // Time in seconds
      const response = await apiRequest("POST", "/api/answers", {
        sessionId,
        questionId,
        selectedAnswer,
        answerTime,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setIsAnswerSubmitted(true);
      setSubmittedQuestions(
        (prev) => new Set([...Array.from(prev), variables.questionId])
      );
      refetchLeaderboard();

      // Handle different answer scenarios
      if (variables.selectedAnswer === null) {
        toast({
          title: "Time's Up!",
          description: "No answer was submitted for this question.",
          variant: "default",
        });
      } else {
        toast({
          title: data.isCorrect ? "Correct!" : "Incorrect",
          description: data.isCorrect
            ? `You earned ${data.points} points!`
            : "Better luck next time!",
          variant: data.isCorrect ? "default" : "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Submit Answer",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmitAnswer = () => {
    if (!userSession || !displayQuestion) {
      toast({
        title: "Unable to Submit",
        description: "Session not found. Please rejoin the quiz.",
        variant: "destructive",
      });
      return;
    }

    // Convert frontend option format (A,B,C,D) to backend format (Option A, Option B, etc)
    const backendAnswer = selectedAnswer ? `Option ${selectedAnswer}` : null;
    submitAnswerMutation.mutate({
      sessionId: userSession.id,
      questionId: displayQuestion.id,
      selectedAnswer: backendAnswer,
    });
  };

  const handleSkipQuestion = () => {
    if (!userSession || !displayQuestion) return;

    submitAnswerMutation.mutate({
      sessionId: userSession.id,
      questionId: displayQuestion.id,
      selectedAnswer: null,
    });
  };

  const handleExitQuiz = () => {
    if (
      confirm(
        "Are you sure you want to exit the quiz? Your progress will be saved."
      )
    ) {
      setLocation("/dashboard");
    }
  };

  // Get user session from API call when joining quiz
  const {
    data: sessionData,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["/api/user/session", quizId, forceRefresh], // Include forceRefresh to bypass cache
    queryFn: async () => {
      const url = `/api/user/session?quizId=${quizId}&t=${Date.now()}`; // Add timestamp to bypass any caching

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || "Failed to fetch session");
      }

      const data = await response.json();

      return data;
    },
    enabled: !!quizId && !!token,
    retry: false, // Don't retry - if it fails, show error immediately
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache at all
  });

  // Initialize timer for existing revealed questions (on page load/refresh)
  useEffect(() => {
    const revealedQuestions =
      quizData?.quiz?.questions?.filter((q: any) => q.isRevealed) || [];
    const currentRevealedQuestion =
      revealedQuestions[revealedQuestions.length - 1];

    if (
      currentRevealedQuestion &&
      !currentQuestion &&
      currentRevealedQuestion.id
    ) {
      const questionTime = currentRevealedQuestion.timeLimit || 45;
      setQuestionTimeLimit(questionTime);
      setTimeRemaining(questionTime);
      setQuestionStartTime(Date.now());
    }
  }, [quizData?.quiz?.questions, currentQuestion]);

  useEffect(() => {
    if (sessionData?.session) {
      setUserSession({ id: sessionData.session.id });

      // Clear any existing error toasts
      toast({
        title: "Quiz Session Found!",
        description: "Welcome to the live quiz!",
        variant: "default",
      });
    } else if (sessionError) {
      // Show user-friendly error message if no session found
      toast({
        title: "Session Not Found",
        description:
          "You need to join the quiz first. Redirecting to dashboard...",
        variant: "destructive",
      });
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        setLocation("/dashboard");
      }, 3000);
    }
  }, [sessionData, sessionError, setLocation, token, user, quizId, toast]);

  // Show loading state while checking session OR if we have a manual session but React Query hasn't caught up
  if ((!sessionData && !sessionError) || (manualSessionCheck && !userSession)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Loading Quiz Session...
            </h2>
            <p className="text-gray-600">
              Please wait while we connect you to the quiz.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              <p>Quiz: {quizId}</p>
              <p>User: {user?.email}</p>
              <p>Token: {token ? "Present" : "Missing"}</p>
              {manualSessionCheck && (
                <div className="bg-green-100 p-2 rounded mt-2">
                  <p className="text-green-800 text-xs">
                    Manual Check: SUCCESS
                  </p>
                  <p className="text-green-700 text-xs">
                    Session: {manualSessionCheck.session?.id}
                  </p>
                </div>
              )}
              {manualCheckError && (
                <div className="bg-red-100 p-2 rounded mt-2">
                  <p className="text-red-800 text-xs">
                    Manual Check: {manualCheckError}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForceRefresh((prev) => prev + 1);
                    refetchSession();
                  }}
                  className="mt-2"
                >
                  Retry Connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/dashboard")}
                  className="mt-2"
                >
                  Back to Dashboard
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch(
                        `/api/user/session?quizId=${quizId}&manual=${Date.now()}`,
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Cache-Control": "no-store",
                          },
                        }
                      );
                      const data = await response.json();

                      if (response.ok) {
                        setManualSessionCheck(data);
                        setManualCheckError("");
                        setUserSession({ id: data.session.id });
                      } else {
                        setManualCheckError(
                          `${response.status}: ${data.error}`
                        );
                      }
                    } catch (error) {
                      setManualCheckError(`Network Error: ${error}`);
                    }
                  }}
                  className="mt-2"
                >
                  Manual Check
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if no session is found - but allow retry
  // Skip if we have a manual session check that succeeded
  if (sessionError && !userSession && !manualSessionCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
                <HelpCircle className="h-10 w-10 text-yellow-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Join Quiz First
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                You need to join this quiz from your dashboard using the correct
                passkey.
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => setLocation("/dashboard")}
                size="lg"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  How to join:
                </p>
                <ol className="text-sm text-blue-700 text-left space-y-1">
                  <li>1. Go to your dashboard</li>
                  <li>2. Find the quiz you want to join</li>
                  <li>3. Enter the passkey provided by your admin</li>
                  <li>4. Click "Join Quiz"</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get quiz data and calculate display logic here BEFORE any conditional returns
  const quiz = quizData?.quiz;
  const leaderboard = leaderboardData?.leaderboard || [];
  const myLeaderboardEntry = leaderboard.find(
    (entry: any) => entry.userId === user.id
  );

  // Display revealed questions for users
  const revealedQuestions =
    quiz?.questions?.filter((q: any) => q.isRevealed) || [];
  const currentRevealedQuestion =
    revealedQuestions[revealedQuestions.length - 1];

  // If no current question from WebSocket, use the latest revealed question from API
  const displayQuestion = currentQuestion || currentRevealedQuestion;

  // Quiz ended state
  if (quizEnded || quiz?.status === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <Trophy className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Quiz Completed!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Thank you for participating in "{quiz?.title || "the quiz"}"
              </p>
            </div>

            {myLeaderboardEntry && (
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Your Final Results
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary-600">
                      {myLeaderboardEntry.totalScore}
                    </p>
                    <p className="text-sm text-gray-600">Total Score</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning-700">
                      #{myLeaderboardEntry.rank}
                    </p>
                    <p className="text-sm text-gray-600">Final Rank</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => setLocation("/dashboard")}
              size="lg"
              className="w-full"
            >
              <Home className="h-5 w-5 mr-2" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Waiting for quiz to start or question to be revealed
  if (!quiz || !displayQuestion) {
    const isQuizActive = quiz?.status === "active";

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-4">
                {isQuizActive ? (
                  <Clock className="h-10 w-10 text-primary-600 animate-pulse" />
                ) : (
                  <Brain className="h-10 w-10 text-primary-600" />
                )}
              </div>

              {isQuizActive ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Get Ready!
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    Quiz "{quiz.title}" is active. Waiting for admin to reveal
                    the next question.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Quiz is live - Question coming soon...</span>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Waiting for Quiz to Start
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    {quiz
                      ? `"${quiz.title}" hasn't started yet.`
                      : "Loading quiz details..."}
                  </p>
                  <p className="text-sm text-gray-500">
                    The quiz admin will start the quiz when ready.
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setLocation("/dashboard")}
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestionNumber = displayQuestion.questionNumber || 1;
  const totalQuestions = quiz.questions?.length || 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Quiz Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionNumber} of {totalQuestions}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Your Score</p>
                <p className="text-xl font-bold text-primary-600">
                  {myLeaderboardEntry?.totalScore || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Rank</p>
                <p className="text-xl font-bold text-warning-700">
                  #{myLeaderboardEntry?.rank || "-"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitQuiz}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Exit Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Timer Bar */}
        <div className="mb-8">
          <QuizTimer
            key={displayQuestion?.id || "no-question"} // Force timer reset for new questions
            duration={questionTimeLimit}
            isRunning={!isAnswerSubmitted}
            onComplete={() => {
              if (!isAnswerSubmitted) {
                handleSkipQuestion();
              }
            }}
          />
        </div>

        {/* Question Card */}
        <Card className="mb-6 shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <span className="text-2xl font-bold text-primary-600">
                  {currentQuestionNumber}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {displayQuestion.text}
              </h2>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <span>
                  <Users className="inline h-4 w-4 mr-1" />
                  {leaderboard.length} participants
                </span>
                {displayQuestion.isBonus && (
                  <Badge
                    variant="outline"
                    className="bg-warning-50 text-warning-700 border-warning-200"
                  >
                    ⭐ Bonus Question
                  </Badge>
                )}
              </div>
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {displayQuestion.options.map((option: string, index: number) => {
                const optionLetter = String.fromCharCode(65 + index);
                const isSelected = selectedAnswer === optionLetter;
                // Convert frontend option (A,B,C,D) to backend format (Option A, Option B, etc)
                const backendOptionFormat = `Option ${optionLetter}`;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!isAnswerSubmitted) {
                        setSelectedAnswer(optionLetter);
                      }
                    }}
                    disabled={isAnswerSubmitted}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? "bg-primary-50 border-primary-500"
                        : "bg-gray-50 hover:bg-primary-25 border-gray-200 hover:border-primary-300"
                    } ${
                      isAnswerSubmitted
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-primary-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        <span className="text-lg font-bold">
                          {optionLetter}
                        </span>
                      </div>
                      <span className="text-lg text-gray-900">{option}</span>
                      {isSelected && !isAnswerSubmitted && (
                        <Check className="ml-auto h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                onClick={handleSkipQuestion}
                disabled={isAnswerSubmitted || submitAnswerMutation.isPending}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip Question
              </Button>
              <Button
                onClick={handleSubmitAnswer}
                disabled={
                  !selectedAnswer ||
                  selectedAnswer === "" ||
                  isAnswerSubmitted ||
                  submitAnswerMutation.isPending
                }
                size="lg"
                className="min-w-[140px]"
                title={`Debug: selectedAnswer=${selectedAnswer}, isAnswerSubmitted=${isAnswerSubmitted}, pending=${submitAnswerMutation.isPending}`}
              >
                {submitAnswerMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : isAnswerSubmitted ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submitted
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit Answer
                  </>
                )}
              </Button>
            </div>

            {isAnswerSubmitted && (
              <div className="mt-6 text-center">
                <p className="text-success-600 font-medium">
                  Answer submitted! Waiting for next question...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini Leaderboard */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Trophy className="text-warning-700 mr-2" />
              Live Leaderboard
            </h3>
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((entry: any, index: number) => {
                const isCurrentUser = entry.userId === user.id;

                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isCurrentUser
                        ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : index === 1
                            ? "bg-gray-400 text-white"
                            : index === 2
                            ? "bg-orange-500 text-white"
                            : "bg-gray-300 text-gray-700"
                        }`}
                      >
                        {entry.rank}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isCurrentUser ? "You" : entry.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.correctAnswers}/{entry.totalAnswers} correct
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {entry.totalScore}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
