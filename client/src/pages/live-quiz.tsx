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
import { Check, SkipForward, Users, Trophy } from "lucide-react";

export default function LiveQuiz() {
  const [, setLocation] = useLocation();
  const { id: quizId } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [userSession, setUserSession] = useState<any>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  // Redirect if not logged in
  if (!user) {
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
    refetchInterval: 5000
  });

  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket(token, quizId);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === "question_revealed") {
        setCurrentQuestion(lastMessage.question);
        setSelectedAnswer("");
        setIsAnswerSubmitted(false);
      } else if (lastMessage.type === "answer_submitted") {
        refetchLeaderboard();
      }
    }
  }, [lastMessage, refetchLeaderboard]);

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ sessionId, questionId, selectedAnswer }: { 
      sessionId: string; 
      questionId: string; 
      selectedAnswer: string | null 
    }) => {
      const response = await apiRequest("POST", "/api/answers", {
        sessionId,
        questionId,
        selectedAnswer
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsAnswerSubmitted(true);
      refetchLeaderboard();
      toast({
        title: data.isCorrect ? "Correct!" : "Incorrect",
        description: data.isCorrect 
          ? `You earned ${data.points} points!` 
          : "Better luck next time!",
        variant: data.isCorrect ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmitAnswer = () => {
    if (!userSession || !currentQuestion) return;
    
    submitAnswerMutation.mutate({
      sessionId: userSession.id,
      questionId: currentQuestion.id,
      selectedAnswer
    });
  };

  const handleSkipQuestion = () => {
    if (!userSession || !currentQuestion) return;
    
    submitAnswerMutation.mutate({
      sessionId: userSession.id,
      questionId: currentQuestion.id,
      selectedAnswer: null
    });
  };

  const quiz = quizData?.quiz;
  const leaderboard = leaderboardData?.leaderboard || [];
  const myLeaderboardEntry = leaderboard.find((entry: any) => entry.userId === user.id);

  // Get user session from local storage or context
  useEffect(() => {
    const sessionId = user.currentSessionId;
    if (sessionId) {
      setUserSession({ id: sessionId });
    }
  }, [user]);

  if (!quiz || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Waiting for Quiz to Start</h2>
            <p className="text-gray-600">The quiz admin will reveal questions when ready.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestionNumber = currentQuestion.questionNumber || 1;
  const totalQuestions = quiz.questions?.length || 10;
  const timeRemaining = currentQuestion.timeLimit || 45;

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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Timer Bar */}
        <div className="mb-8">
          <QuizTimer
            duration={timeRemaining}
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
                <span className="text-2xl font-bold text-primary-600">{currentQuestionNumber}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentQuestion.text}
              </h2>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <span>
                  <Users className="inline h-4 w-4 mr-1" />
                  {leaderboard.length} participants
                </span>
                {currentQuestion.isBonus && (
                  <Badge variant="outline" className="bg-warning-50 text-warning-700 border-warning-200">
                    ⭐ Bonus Question
                  </Badge>
                )}
              </div>
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {currentQuestion.options.map((option: string, index: number) => {
                const optionLetter = String.fromCharCode(65 + index);
                const isSelected = selectedAnswer === optionLetter;
                
                return (
                  <button
                    key={index}
                    onClick={() => !isAnswerSubmitted && setSelectedAnswer(optionLetter)}
                    disabled={isAnswerSubmitted}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'bg-primary-50 border-primary-500'
                        : 'bg-gray-50 hover:bg-primary-25 border-gray-200 hover:border-primary-300'
                    } ${isAnswerSubmitted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        <span className="text-lg font-bold">{optionLetter}</span>
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
                disabled={!selectedAnswer || isAnswerSubmitted || submitAnswerMutation.isPending}
                size="lg"
              >
                <Check className="h-4 w-4 mr-2" />
                Submit Answer
              </Button>
            </div>

            {isAnswerSubmitted && (
              <div className="mt-6 text-center">
                <p className="text-success-600 font-medium">Answer submitted! Waiting for next question...</p>
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
                        ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-gray-300 text-gray-700'
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isCurrentUser ? 'You' : entry.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.correctAnswers}/{entry.totalAnswers} correct
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{entry.totalScore}</p>
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
