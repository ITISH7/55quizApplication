import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Upload, Play, Edit, Trash, BarChart3, LogOut, FileText, Users, Clock, Activity } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newQuiz, setNewQuiz] = useState({
    title: "",
    passkey: "",
    defaultTimePerQuestion: "45",
    scoringType: "speed",
    excelFile: null as File | null
  });

  // Redirect if not admin
  if (!user?.isAdmin) {
    setLocation("/login");
    return null;
  }

  const { data: quizzesData } = useQuery({
    queryKey: ["/api/quizzes"],
    queryFn: async () => {
      const response = await fetch("/api/quizzes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch quizzes");
      return response.json();
    }
  });

  const createQuizMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create quiz");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      setNewQuiz({
        title: "",
        passkey: "",
        defaultTimePerQuestion: "45",
        scoringType: "speed",
        excelFile: null
      });
      toast({
        title: "Success",
        description: "Quiz created successfully"
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

  const startQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/start`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({
        title: "Success",
        description: "Quiz started successfully"
      });
    }
  });

  const handleCreateQuiz = () => {
    if (!newQuiz.title || !newQuiz.passkey || !newQuiz.excelFile) {
      toast({
        title: "Error",
        description: "Please fill all fields and upload an Excel file",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", newQuiz.title);
    formData.append("passkey", newQuiz.passkey);
    formData.append("defaultTimePerQuestion", newQuiz.defaultTimePerQuestion);
    formData.append("scoringType", newQuiz.scoringType);
    formData.append("excelFile", newQuiz.excelFile);

    createQuizMutation.mutate(formData);
  };

  const quizzes = quizzesData?.quizzes || [];
  const stats = {
    totalQuizzes: quizzes.length,
    activeQuizzes: quizzes.filter((q: any) => q.status === "active").length,
    draftQuizzes: quizzes.filter((q: any) => q.status === "draft").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-primary-600" />
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Quiz Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-primary-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Play className="h-8 w-8 text-success-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeQuizzes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Edit className="h-8 w-8 text-warning-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Draft Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.draftQuizzes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Participants</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create New Quiz Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Quiz</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  placeholder="Technology Quiz - Week 1"
                  value={newQuiz.title}
                  onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="passkey">Passkey</Label>
                <Input
                  id="passkey"
                  placeholder="TECH2024"
                  value={newQuiz.passkey}
                  onChange={(e) => setNewQuiz({ ...newQuiz, passkey: e.target.value })}
                  className="mt-2"
                />
              </div>
              
              <div className="lg:col-span-2">
                <Label htmlFor="excel">Upload Excel File</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-600 mb-2">Drop your Excel file here or click to browse</p>
                  <p className="text-xs text-gray-500 mb-3">Supports .xlsx format with questions, options, and answers</p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setNewQuiz({ ...newQuiz, excelFile: e.target.files?.[0] || null })}
                    className="hidden"
                    id="excel-upload"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('excel-upload')?.click()}
                  >
                    Choose File
                  </Button>
                  {newQuiz.excelFile && (
                    <p className="mt-2 text-sm text-green-600">Selected: {newQuiz.excelFile.name}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="time">Default Time per Question (seconds)</Label>
                <Select value={newQuiz.defaultTimePerQuestion} onValueChange={(value) => setNewQuiz({ ...newQuiz, defaultTimePerQuestion: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="45">45 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="scoring">Scoring Type</Label>
                <Select value={newQuiz.scoringType} onValueChange={(value) => setNewQuiz({ ...newQuiz, scoringType: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (10 points)</SelectItem>
                    <SelectItem value="speed">Speed-based (15/10/5 for 1st/2nd/3rd)</SelectItem>
                    <SelectItem value="negative">With Negative Marking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="lg:col-span-2">
                <Button 
                  onClick={handleCreateQuiz}
                  disabled={createQuizMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quiz
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Management Table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Quiz Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizzes.map((quiz: any) => (
                    <tr key={quiz.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{quiz.title}</div>
                          <div className="text-sm text-gray-500">Passkey: {quiz.passkey}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={quiz.status === "active" ? "default" : quiz.status === "completed" ? "secondary" : "outline"}
                        >
                          {quiz.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {quiz.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => startQuizMutation.mutate(quiz.id)}
                            disabled={startQuizMutation.isPending}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {quiz.status === "active" && (
                          <Button
                            size="sm"
                            onClick={() => setLocation(`/admin/quiz/${quiz.id}/control`)}
                          >
                            <Activity className="h-3 w-3 mr-1" />
                            Control
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/quiz/${quiz.id}/results`)}
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Results
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
