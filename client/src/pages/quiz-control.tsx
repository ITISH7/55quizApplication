import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QuizTimer } from "@/components/quiz-timer";
import { PaginatedLeaderboard } from "@/components/paginated-leaderboard";
import { ArrowLeft, Play, Eye, SkipForward, ArrowRight, Users, Download, X, Gift, Trophy } from "lucide-react";

export default function QuizControl() {
  const [, setLocation] = useLocation();
  const { id: quizId } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Redirect if not admin
  if (!user?.isAdmin) {
    setLocation("/login");
    return null;
  }

  const { data: quizData } = useQuery({
    queryKey: ["/api/quizzes", quizId],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch quiz");
      return response.json();
    },
    enabled: !!quizId
  });

  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ["/api/quizzes", quizId, "sessions"],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/${quizId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
    enabled: !!quizId,
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const { data: leaderboardData, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["/api/quizzes", quizId, "leaderboard"],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/${quizId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
    enabled: !!quizId,
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  // Extract quiz data first so we can use currentQuestion
  const quiz = quizData?.quiz;
  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const sessions = sessionsData?.sessions || [];
  const leaderboard = leaderboardData?.leaderboard || [];

  // Debug the query conditions
  console.log('🐛 Query Debug:', {
    quizId,
    currentQuestionId: currentQuestion?.id,
    isRevealed: currentQuestion?.isRevealed,
    enabled: !!quizId && !!currentQuestion?.id && currentQuestion?.isRevealed,
    currentQuestionIndex,
    totalQuestions: questions.length
  });

  // Get top 5 correct answerers for current question
  const { data: correctAnswerersData, refetch: refetchCorrectAnswerers, isLoading: isLoadingCorrectAnswerers, error: correctAnswerersError } = useQuery({
    queryKey: ["/api/quizzes", quizId, "questions", currentQuestion?.id, "correct-answers"],
    queryFn: async () => {
      console.log('🚀 Fetching correct answers for question:', currentQuestion?.id);
      const response = await fetch(`/api/quizzes/${quizId}/questions/${currentQuestion?.id}/correct-answers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        console.error('❌ API Error:', response.status, response.statusText);
        throw new Error(`Failed to fetch correct answers: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Correct answerers data:', data);
      return data;
    },
    enabled: !!quizId && !!currentQuestion?.id && currentQuestion?.isRevealed,
    refetchInterval: 2000 // Refresh every 2 seconds for real-time updates
  });

  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket(token, quizId);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "answer_submitted") {
        refetchSessions();
        refetchLeaderboard();
        refetchCorrectAnswerers();
      }
    }
  }, [lastMessage, refetchSessions, refetchLeaderboard, refetchCorrectAnswerers]);

  const revealQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/questions/${questionId}/reveal`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes", quizId] });
      toast({
        title: "Success",
        description: "Question revealed to participants"
      });
    }
  });


  const skipQuestionMutation = useMutation({
    mutationFn: async (nextIndex: number) => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/skip`, {
        questionIndex: nextIndex
      });
      return response.json();
    },
    onSuccess: () => {
      handleNextQuestion();
      toast({
        title: "Success",
        description: "Skipped to next question"
      });
    }
  });

  const endQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/end`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quiz ended successfully"
      });
      setLocation("/admin");
    }
  });

  const correctAnswerers = correctAnswerersData?.correctAnswerers || [];
  const totalCorrect = correctAnswerersData?.totalCorrect || 0;

  // Debug the correct answerers data
  console.log('🎯 Correct Answerers Debug:', {
    correctAnswerersData,
    correctAnswerers,
    totalCorrect,
    isLoadingCorrectAnswerers,
    correctAnswerersError: correctAnswerersError?.message
  });

  const handleRevealQuestion = () => {
    if (currentQuestion) {
      revealQuestionMutation.mutate(currentQuestion.id);
      setIsTimerRunning(true);
    }
  };


  const getNextUnrevealedBonusQuestion = () => {
    // Find next unrevealed bonus question
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].isBonus && !questions[i].isRevealed) {
        return i;
      }
    }
    return null;
  };

  const getNextUnrevealedNormalQuestion = () => {
    // Find next unrevealed normal (non-bonus) question
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].isBonus && !questions[i].isRevealed) {
        return i;
      }
    }
    return null;
  };

  const handleBonusQuestion = () => {
    const bonusIndex = getNextUnrevealedBonusQuestion();
    if (bonusIndex !== null) {
      setCurrentQuestionIndex(bonusIndex);
      setIsTimerRunning(false);
      toast({
        title: "Bonus Question Selected",
        description: `Switched to bonus question ${bonusIndex + 1}`
      });
    }
  };

  const handleNextQuestion = () => {
    const nextNormalIndex = getNextUnrevealedNormalQuestion();
    if (nextNormalIndex !== null) {
      setCurrentQuestionIndex(nextNormalIndex);
      setIsTimerRunning(false);
      toast({
        title: "Next Question",
        description: `Moved to question ${nextNormalIndex + 1}`
      });
    }
  };

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handleTimerComplete = () => {
    setIsTimerRunning(false);
    // Auto move to next question
    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleEndQuiz = () => {
    endQuizMutation.mutate();
  };

  if (!quiz) return <div>Loading...</div>;

  // Calculate progress based on revealed questions
  const revealedQuestions = questions.filter((q: any) => q.isRevealed);
  const progress = questions.length > 0 ? (revealedQuestions.length / questions.length) * 100 : 0;
  const activeParticipants = sessions.length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation("/admin")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-gray-600">Live Quiz Control Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Participants</p>
                <p className="text-xl font-bold text-primary-600">{activeParticipants}</p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setLocation(`/admin/quiz/${quizId}/results`)}
              >
                <Download className="h-4 w-4 mr-2" />
                View Results
              </Button>
              <Button 
                variant="destructive"
                onClick={handleEndQuiz}
                disabled={endQuizMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                End Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Question Control */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Question Control</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Question</span>
                    <span className="text-lg font-bold text-primary-600">{currentQuestionIndex + 1}</span>
                    <span className="text-sm text-gray-500">of</span>
                    <span className="text-lg font-bold text-gray-900">{questions.length}</span>
                    {currentQuestion?.isBonus && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        Bonus Question
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Questions Revealed ({revealedQuestions.length}/{questions.length})</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {currentQuestion && (
                  <>
                    {/* Question Display */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {currentQuestion.text}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentQuestion.options.map((option: string, index: number) => (
                          <div 
                            key={index}
                            className="flex items-center space-x-3 p-3 rounded-lg border bg-white border-gray-200"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium bg-primary-100 text-primary-600">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className="text-gray-900">{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Question Metadata */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center space-x-4">
                        <span>Time Limit: <strong>{currentQuestion.timeLimit}s</strong></span>
                        <span>Points: <strong>{currentQuestion.points || 10}</strong></span>
                        {currentQuestion.isBonus && (
                          <Badge variant="outline" className="bg-warning-50 text-warning-700 border-warning-200">
                            Bonus Question
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Question Controls */}
                    <div className="flex items-center space-x-3 flex-wrap">
                      <Button 
                        onClick={handleRevealQuestion}
                        disabled={revealQuestionMutation.isPending || currentQuestion.isRevealed}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {currentQuestion.isRevealed ? "Question Revealed" : "Reveal Question"}
                      </Button>
                      
                      <Button 
                        onClick={handleNextQuestion}
                        disabled={getNextUnrevealedNormalQuestion() === null}
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800"
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Next Normal Question
                      </Button>

                      <Button 
                        variant="outline"
                        onClick={handleBonusQuestion}
                        disabled={getNextUnrevealedBonusQuestion() === null}
                        className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-yellow-800"
                      >
                        <Gift className="mr-2 h-4 w-4" />
                        Show Bonus Question
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Candidate for This Question */}
            {currentQuestion?.isRevealed && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Trophy className="h-5 w-5 text-green-600 mr-2" />
                      Top 5 Candidate for This Question
                    </h3>
                    <div className="text-sm text-gray-600">
                      {isLoadingCorrectAnswerers ? 'Loading...' : `${totalCorrect} total correct`}
                    </div>
                  </div>
                  
                  {/* Debug Information */}
                  <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    Debug: Query enabled: {String(!!quizId && !!currentQuestion?.id && currentQuestion?.isRevealed)} | 
                    Question ID: {currentQuestion?.id} | 
                    Loading: {String(isLoadingCorrectAnswerers)} | 
                    Error: {correctAnswerersError?.message || 'None'}
                  </div>
                  
                  <div className="space-y-3">
                    {isLoadingCorrectAnswerers ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
                        <p className="text-gray-500">Loading correct answers...</p>
                      </div>
                    ) : correctAnswerersError ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">❌</span>
                        </div>
                        <p className="text-red-500">Error loading data</p>
                        <p className="text-xs text-gray-400 mt-1">{correctAnswerersError.message}</p>
                      </div>
                    ) : correctAnswerers.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Trophy className="h-8 w-8 text-yellow-600" />
                        </div>
                        <p className="text-gray-500">No correct answers yet</p>
                        <p className="text-xs text-gray-400 mt-1">Winners will appear here as they answer correctly</p>
                      </div>
                    ) : (
                      correctAnswerers.map((answerer: any, index: number) => (
                        <div key={answerer.userId} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              answerer.rank === 1 ? 'bg-yellow-500 text-white' :
                              answerer.rank === 2 ? 'bg-gray-400 text-white' :
                              answerer.rank === 3 ? 'bg-orange-500 text-white' :
                              'bg-green-600 text-white'
                            }`}>
                              {answerer.rank === 1 ? '🥇' :
                               answerer.rank === 2 ? '🥈' :
                               answerer.rank === 3 ? '🥉' : answerer.rank}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{answerer.displayName}</p>
                              <p className="text-xs text-gray-500">Answer: {answerer.selectedAnswer} • {answerer.answerTime}s</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Correct
                            </Badge>
                            <span className="text-xs text-gray-500">
                              #{answerer.rank}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Live Leaderboard */}
          <div className="space-y-6">
            <PaginatedLeaderboard 
              leaderboard={leaderboard} 
              currentUserId={user?.id}
              title="Live Leaderboard (Admin View)"
            />
            
            {/* Timer Display */}
            {currentQuestion && isTimerRunning && (
              <Card>
                <CardContent className="p-6">
                  <QuizTimer
                    duration={currentQuestion.timeLimit}
                    isRunning={isTimerRunning}
                    onComplete={handleTimerComplete}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
