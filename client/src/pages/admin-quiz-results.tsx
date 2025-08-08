import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaderboard } from "@/components/leaderboard";
import { 
  ArrowLeft, 
  Download, 
  Users, 
  Trophy, 
  Target, 
  Clock, 
  FileSpreadsheet,
  BarChart3,
  Calendar,
  CheckCircle
} from "lucide-react";
import * as XLSX from 'xlsx';
import fiftyfiveLogo from "@/assets/fiftyfive-logo.png";

export default function AdminQuizResults() {
  const [, setLocation] = useLocation();
  const { id: quizId } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

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

  const { data: sessionsData } = useQuery({
    queryKey: ["/api/quizzes", quizId, "sessions"],
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/${quizId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
    enabled: !!quizId
  });

  const quiz = quizData?.quiz;
  const leaderboard = leaderboardData?.leaderboard || [];
  const sessions = sessionsData?.sessions || [];

  const exportToExcel = async () => {
    if (!quiz || leaderboard.length === 0) {
      toast({
        title: "Export Failed",
        description: "No data available to export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    
    try {
      // Prepare detailed data for export
      const exportData = leaderboard.map((entry: any, index: number) => ({
        'Rank': entry.rank,
        'Participant Name': entry.email.split('@')[0],
        'Email': entry.email,
        'Total Score': entry.totalScore,
        'Correct Answers': entry.correctAnswers,
        'Total Answers': entry.totalAnswers,
        'Accuracy (%)': entry.totalAnswers > 0 ? Math.round((entry.correctAnswers / entry.totalAnswers) * 100) : 0,
        'Performance Level': entry.rank === 1 ? 'Outstanding' : entry.rank <= 3 ? 'Excellent' : entry.rank <= Math.ceil(leaderboard.length * 0.5) ? 'Good' : 'Average',
        'Quiz Title': quiz.title,
        'Completion Status': 'Completed'
      }));

      // Create summary data
      const summaryData = [{
        'Quiz Title': quiz.title,
        'Total Participants': leaderboard.length,
        'Quiz Status': quiz.status,
        'Average Score': leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum: number, entry: any) => sum + entry.totalScore, 0) / leaderboard.length) : 0,
        'Highest Score': leaderboard.length > 0 ? Math.max(...leaderboard.map((entry: any) => entry.totalScore)) : 0,
        'Lowest Score': leaderboard.length > 0 ? Math.min(...leaderboard.map((entry: any) => entry.totalScore)) : 0,
        'Export Date': new Date().toLocaleDateString(),
        'Export Time': new Date().toLocaleTimeString()
      }];

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Quiz Summary');
      
      // Detailed results sheet
      const resultsSheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Detailed Results');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
      const filename = `${quiz.title.replace(/[^a-zA-Z0-9]/g, '_')}_Results_${timestamp}.xlsx`;
      
      // Download file
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Export Successful",
        description: `Quiz results exported as ${filename}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export quiz results",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const calculateStats = () => {
    if (leaderboard.length === 0) return null;
    
    const totalScore = leaderboard.reduce((sum: number, entry: any) => sum + entry.totalScore, 0);
    const averageScore = Math.round(totalScore / leaderboard.length);
    const highestScore = Math.max(...leaderboard.map((entry: any) => entry.totalScore));
    const lowestScore = Math.min(...leaderboard.map((entry: any) => entry.totalScore));
    
    return { averageScore, highestScore, lowestScore };
  };

  const stats = calculateStats();

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Loading Quiz Results...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => setLocation("/admin")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center">
                <img src={fiftyfiveLogo} alt="FiftyFive Technologies" className="h-6 w-auto mr-3" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Quiz Results</h1>
                  <p className="text-sm text-gray-600">{quiz.title}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant={quiz.status === "completed" ? "default" : "secondary"}>
                {quiz.status === "completed" ? "Completed" : quiz.status}
              </Badge>
              <Button
                onClick={exportToExcel}
                disabled={isExporting || leaderboard.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Quiz Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Participants</p>
                  <p className="text-2xl font-bold text-gray-900">{leaderboard.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {stats && (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Average Score</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Trophy className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Highest Score</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.highestScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-red-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Lowest Score</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.lowestScore}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quiz Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Quiz Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Quiz Title</p>
                <p className="text-lg font-semibold text-gray-900">{quiz.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Scoring Type</p>
                <p className="text-lg text-gray-900 capitalize">{quiz.scoringType || 'Standard'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Time Per Question</p>
                <p className="text-lg text-gray-900">{quiz.defaultTimePerQuestion}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
                Final Leaderboard
              </CardTitle>
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={isExporting || leaderboard.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Leaderboard 
              leaderboard={leaderboard}
              showExport={false}
              maxEntries={undefined} // Show all entries
            />
          </CardContent>
        </Card>

        {leaderboard.length === 0 && (
          <Card className="mt-8">
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Participants Yet</h3>
              <p className="text-gray-600">Results will appear here once participants complete the quiz.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}