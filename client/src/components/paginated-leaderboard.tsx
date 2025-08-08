import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, ChevronLeft, ChevronRight, Users } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  email: string;
  totalScore: number;
  correctAnswers: number;
  totalAnswers: number;
  rank: number;
  totalTime?: string;
}

interface PaginatedLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  itemsPerPage?: number;
  title?: string;
}

export function PaginatedLeaderboard({ 
  leaderboard, 
  currentUserId,
  itemsPerPage = 10,
  title = "Live Leaderboard"
}: PaginatedLeaderboardProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(leaderboard.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = leaderboard.slice(startIndex, endIndex);

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
    return email.split('@')[0];
  };

  const calculateAccuracy = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Auto-navigate to current user's page if they exist
  const findCurrentUserPage = () => {
    if (!currentUserId) return 1;
    
    const userIndex = leaderboard.findIndex(entry => entry.userId === currentUserId);
    if (userIndex === -1) return 1;
    
    return Math.ceil((userIndex + 1) / itemsPerPage);
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
            {title}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{leaderboard.length} participants</span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {currentEntries.map((entry, index) => {
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, leaderboard.length)} of {leaderboard.length} participants
              </div>
              
              <div className="flex items-center space-x-2">
                {currentUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(findCurrentUserPage())}
                    className="text-xs"
                  >
                    Find Me
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="w-8 h-8 p-0 text-xs"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}