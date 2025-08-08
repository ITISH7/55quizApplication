import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Play,
  Users,
  Clock,
  HelpCircle,
  Trophy,
  LogOut,
  Calendar,
} from "lucide-react";

export default function UserDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [passkeys, setPasskeys] = useState<Record<string, string>>({});

  // Redirect if not logged in or is admin using useEffect
  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (user.isAdmin) {
      setLocation("/admin");
    }
  }, [user, setLocation]);

  const { data: quizzesData } = useQuery({
    queryKey: ["/api/quizzes"],
    queryFn: async () => {
      const response = await fetch("/api/quizzes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch quizzes");
      return response.json();
    },
    enabled: !!user && !user.isAdmin, // Only run query when we have a valid non-admin user
  });

  // Don't render anything if redirecting
  if (!user || user.isAdmin) {
    return null;
  }

  const joinQuizMutation = useMutation({
    mutationFn: async ({
      quizId,
      passkey,
    }: {
      quizId: string;
      passkey: string;
    }) => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/join`, {
        passkey,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch session cache to force fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/user/session"] });
      queryClient.removeQueries({ queryKey: ["/api/user/session"] });

      toast({
        title: "Success!",
        description: "Joined quiz successfully. Redirecting...",
        variant: "default",
      });

      // Redirect immediately since backend confirms success
      setLocation(`/quiz/${variables.quizId}`);
    },
    onError: (error: any) => {
      const errorMessage =
        error.message || error.error || "Failed to join quiz";
      toast({
        title: "Unable to Join Quiz",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleJoinQuiz = (quizId: string) => {
    const passkey = passkeys[quizId];

    if (!passkey) {
      toast({
        title: "Error",
        description: "Please enter the passkey",
        variant: "destructive",
      });
      return;
    }

    joinQuizMutation.mutate({ quizId, passkey });
  };

  const quizzes = quizzesData?.quizzes || [];
  const activeQuizzes = quizzes.filter((quiz: any) => quiz.status === "active");
  const upcomingQuizzes = quizzes.filter(
    (quiz: any) => quiz.status === "draft"
  );

  return (
    <div className="min-h-screen hero-tri-color indian-pattern-bg">
      {/* Navigation Header */}
      <nav className="indian-navbar tri-color-glow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-white" />
              <h1 className="ml-4 text-xl navbar-title">
                🏆 Live Quiz Showdown
              </h1>
              <div className="indian-flag">
                <div className="flag-stripes"></div>
              </div>
              <span className="independence-sparkle">✨</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/90 font-medium">{user.email?.split('@')[0]}</span>
              <Button
                className="logout-btn-indian"
                onClick={() => {
                  logout();
                  setLocation("/login");
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="quiz-card tri-color-glow p-8 max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold quiz-question mb-4">
              🇮🇳 Welcome to Live Quiz Showdown! 🎉
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join exciting Independence Day quizzes and test your knowledge about our incredible nation! 
              Compete with colleagues and celebrate our heritage together.
            </p>
            <div className="flex justify-center mt-4 space-x-2">
              <span className="animate-bounce">🏆</span>
              <span className="animate-bounce delay-100">🎯</span>
              <span className="animate-bounce delay-200">⭐</span>
            </div>
          </div>
        </div>

        {/* Active Quizzes */}
        {activeQuizzes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Play className="text-success-600 mr-2" />
              Active Quizzes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeQuizzes.map((quiz: any) => (
                <Card
                  key={quiz.id}
                  className="border-l-4 border-success-500 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {quiz.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Test your knowledge
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">0</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          <HelpCircle className="inline h-4 w-4 mr-1" />?
                          Questions
                        </span>
                        <span>
                          <Clock className="inline h-4 w-4 mr-1" />
                          {quiz.defaultTimePerQuestion}s each
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <div className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse"></div>
                        <span className="text-success-600 font-medium">
                          Live Now
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Input
                        placeholder="Enter passkey..."
                        value={passkeys[quiz.id] || ""}
                        onChange={(e) =>
                          setPasskeys({
                            ...passkeys,
                            [quiz.id]: e.target.value,
                          })
                        }
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleJoinQuiz(quiz.id)}
                        disabled={joinQuizMutation.isPending}
                        className="min-w-[100px]"
                      >
                        {joinQuizMutation.isPending
                          ? "Joining..."
                          : "Join Quiz"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Quizzes */}
        {upcomingQuizzes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="text-primary-600 mr-2" />
              Upcoming Quizzes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingQuizzes.map((quiz: any) => (
                <Card key={quiz.id} className="border-l-4 border-primary-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {quiz.title}
                        </h4>
                        <p className="text-sm text-gray-500">Coming soon</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Scheduled</p>
                        <p className="text-sm font-medium text-primary-600">
                          TBD
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          <HelpCircle className="inline h-4 w-4 mr-1" />?
                          Questions
                        </span>
                        <span>
                          <Clock className="inline h-4 w-4 mr-1" />
                          {quiz.defaultTimePerQuestion}s each
                        </span>
                      </div>
                    </div>
                    <Button disabled className="w-full" variant="outline">
                      <Clock className="h-4 w-4 mr-2" />
                      Waiting to Start
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeQuizzes.length === 0 && upcomingQuizzes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Quizzes Available
              </h3>
              <p className="text-gray-600">
                Check back later for new quiz announcements!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Results Placeholder */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Trophy className="text-warning-700 mr-2" />
            Recent Results
          </h3>
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                No quiz results yet. Join a quiz to see your performance!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
