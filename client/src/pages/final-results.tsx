import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Download, Share, ArrowLeft } from "lucide-react";

export default function FinalResults() {
  const [, setLocation] = useLocation();
  const { id: quizId } = useParams<{ id: string }>();
  const { user, token } = useAuth();

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

  const { data: leaderboardData } = useQuery({
    queryKey: ["/api/quizzes", quizId, "leaderboard"],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/${quizId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
    enabled: !!quizId
  });

  const quiz = quizData?.quiz;
  const leaderboard = leaderboardData?.leaderboard || [];
  const myResult = leaderboard.find((entry: any) => entry.userId === user.id);

  const handleReturnToDashboard = () => {
    setLocation(user.isAdmin ? "/admin" : "/dashboard");
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return rank.toString();
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "from-yellow-400 to-yellow-500";
      case 2: return "from-gray-400 to-gray-500";
      case 3: return "from-orange-400 to-orange-500";
      default: return "from-blue-400 to-blue-500";
    }
  };

  const getPerformanceBadge = (rank: number, totalParticipants: number) => {
    const percentage = (rank / totalParticipants) * 100;
    if (percentage <= 10) return { text: "Outstanding Performance!", color: "bg-gradient-to-r from-yellow-500 to-yellow-600" };
    if (percentage <= 25) return { text: "Excellent Performance!", color: "bg-gradient-to-r from-green-500 to-green-600" };
    if (percentage <= 50) return { text: "Good Performance!", color: "bg-gradient-to-r from-blue-500 to-blue-600" };
    return { text: "Keep Practicing!", color: "bg-gradient-to-r from-purple-500 to-purple-600" };
  };

  if (!quiz || !myResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success-50 to-success-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Loading Results...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  const performance = getPerformanceBadge(myResult.rank, leaderboard.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 to-success-100">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleReturnToDashboard}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Celebration Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-success-600 rounded-full mb-6">
            <Trophy className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Quiz Complete!</h1>
          <p className="text-xl text-gray-600">{quiz.title}</p>
        </div>

        {/* User Results Card */}
        <Card className="mb-8 shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${getRankColor(myResult.rank)} rounded-full mb-4`}>
                <span className="text-3xl font-bold text-white">
                  {getRankEmoji(myResult.rank)}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Congratulations!</h2>
              <p className="text-lg text-gray-600">
                You finished in <strong className="text-warning-700">
                  {myResult.rank === 1 ? "1st place" : 
                   myResult.rank === 2 ? "2nd place" : 
                   myResult.rank === 3 ? "3rd place" : 
                   `${myResult.rank}th place`}
                </strong> out of {leaderboard.length} participants
              </p>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-primary-50 rounded-xl">
                <div className="text-3xl font-bold text-primary-600 mb-2">{myResult.totalScore}</div>
                <div className="text-sm text-gray-600">Total Score</div>
              </div>
              <div className="text-center p-6 bg-success-50 rounded-xl">
                <div className="text-3xl font-bold text-success-600 mb-2">{myResult.correctAnswers}</div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">{myResult.totalAnswers}</div>
                <div className="text-sm text-gray-600">Total Attempts</div>
              </div>
            </div>

            {/* Performance Badge */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center px-6 py-3 ${performance.color} text-white rounded-full text-lg font-semibold`}>
                <Trophy className="mr-2 h-5 w-5" />
                {performance.text}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final Leaderboard */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-0">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Final Leaderboard</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {leaderboard.map((entry: any, index: number) => {
                const isCurrentUser = entry.userId === user.id;
                const isTopThree = index < 3;
                
                return (
                  <div 
                    key={entry.userId}
                    className={`p-6 flex items-center justify-between ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500' 
                        : isTopThree 
                          ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' 
                          : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {getRankEmoji(entry.rank)}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {isCurrentUser ? "You" : entry.email.split('@')[0]}
                        </p>
                        <p className="text-sm text-gray-600">
                          {entry.correctAnswers}/{entry.totalAnswers} correct
                          {entry.totalAnswers > 0 && (
                            <span className="ml-2">
                              ({Math.round((entry.correctAnswers / entry.totalAnswers) * 100)}% accuracy)
                            </span>
                          )}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700 border-blue-200">
                            This is you
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{entry.totalScore}</p>
                      <p className="text-sm text-gray-600">
                        {index === 0 ? "Champion" :
                         index === 1 ? "Runner-up" :
                         index === 2 ? "Third Place" :
                         `${entry.rank}th Place`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <Button 
            onClick={handleReturnToDashboard}
            size="lg"
            className="px-8"
          >
            Back to Dashboard
          </Button>
          <div className="flex justify-center space-x-4">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `Quiz Results - ${quiz.title}`,
                    text: `I scored ${myResult.totalScore} points and finished in ${myResult.rank}th place!`,
                  });
                }
              }}
            >
              <Share className="h-4 w-4 mr-2" />
              Share Results
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                // In a real app, this would generate and download a certificate
                toast({
                  title: "Feature Coming Soon",
                  description: "Certificate download will be available soon!"
                });
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Certificate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
