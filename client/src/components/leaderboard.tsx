import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Download } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  email: string;
  totalScore: number;
  correctAnswers: number;
  totalAnswers: number;
  rank: number;
  totalTime?: string;
}

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
  showExport?: boolean;
  onExport?: () => void;
  maxEntries?: number;
  currentUserId?: string;
}

export function Leaderboard({ 
  leaderboard, 
  showExport = false, 
  onExport, 
  maxEntries,
  currentUserId 
}: LeaderboardProps) {
  const displayEntries = maxEntries ? leaderboard.slice(0, maxEntries) : leaderboard;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500 text-white";
      case 2:
        return "bg-gray-400 text-white";
      case 3:
        return "bg-orange-500 text-white";
      default:
        return "bg-primary-600 text-white";
    }
  };

  const getRowBackground = (entry: LeaderboardEntry) => {
    if (entry.userId === currentUserId) {
      return "bg-gradient-to-r from-primary-50 to-primary-100 border-l-4 border-primary-500";
    }
    if (entry.rank <= 3) {
      return "bg-gradient-to-r from-yellow-50 to-yellow-100";
    }
    return "bg-gray-50";
  };

  const formatEmail = (email: string) => {
    // Show just the username part for better privacy
    return email.split('@')[0];
  };

  const calculateAccuracy = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Participants Yet</h3>
          <p className="text-gray-600">Leaderboard will update as participants join and answer questions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Trophy className="text-warning-700 mr-2 h-5 w-5" />
            Live Leaderboard
          </h3>
          {showExport && onExport && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
        
        <div className="divide-y divide-gray-200">
          {displayEntries.map((entry, index) => {
            const isCurrentUser = entry.userId === currentUserId;
            const accuracy = calculateAccuracy(entry.correctAnswers, entry.totalAnswers);
            
            return (
              <div 
                key={entry.userId}
                className={`p-4 flex items-center justify-between transition-colors hover:bg-gray-25 ${getRowBackground(entry)}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeColor(entry.rank)}`}>
                    {entry.rank <= 3 ? getRankIcon(entry.rank) : entry.rank}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {isCurrentUser ? "You" : formatEmail(entry.email)}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200 text-xs">
                          You
                        </Badge>
                      )}
                      {entry.rank === 1 && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                          Leader
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      <span>{entry.correctAnswers}/{entry.totalAnswers} correct</span>
                      {entry.totalAnswers > 0 && (
                        <span>({accuracy}% accuracy)</span>
                      )}
                      {entry.totalTime && (
                        <span>Time: {entry.totalTime}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{entry.totalScore}</p>
                  <p className="text-xs text-gray-500">
                    {entry.rank === 1 ? "Champion" :
                     entry.rank === 2 ? "Runner-up" :
                     entry.rank === 3 ? "Third" :
                     `${entry.rank}th place`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {maxEntries && leaderboard.length > maxEntries && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Showing top {maxEntries} of {leaderboard.length} participants
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}