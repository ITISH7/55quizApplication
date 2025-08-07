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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Plus, Upload, Play, Edit, Trash, BarChart3, LogOut, FileText, Users, Clock, Activity, Download, HelpCircle } from "lucide-react";
import { Leaderboard } from "@/components/leaderboard";

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
    speedScoringConfig: [
      { maxTime: 0, points: 20 }, // 1st place
      { maxTime: 0, points: 15 }, // 2nd place  
      { maxTime: 0, points: 10 }, // 3rd place
      { maxTime: 0, points: 5 }   // All others
    ],
    excelFile: null as File | null
  });

  const [showManualQuiz, setShowManualQuiz] = useState(false);
  const [manualQuestions, setManualQuestions] = useState([
    {
      text: "",
      options: ["", "", "", ""],
      correctAnswer: "Option A",
      isBonus: false,
      timeLimit: 45,
      points: 10
    }
  ]);


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
      // Reset form
      setNewQuiz({
        title: "",
        passkey: "",
        defaultTimePerQuestion: "45",
        scoringType: "speed",
        speedScoringConfig: [
          { maxTime: 0, points: 20 }, // 1st place
          { maxTime: 0, points: 15 }, // 2nd place  
          { maxTime: 0, points: 10 }, // 3rd place
          { maxTime: 0, points: 5 }   // All others
        ],
        excelFile: null
      });
      // Reset manual questions
      setManualQuestions([{
        text: "",
        options: ["", "", "", ""],
        correctAnswer: "Option A",
        isBonus: false,
        timeLimit: 45,
        points: 10
      }]);
      setShowManualQuiz(false);
      
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
      const response = await fetch(`/api/quizzes/${quizId}/start`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start quiz");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({
        title: "Success",
        description: "Quiz started successfully"
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

  const handleCreateQuiz = () => {
    if (!newQuiz.title || !newQuiz.passkey) {
      toast({
        title: "Error",
        description: "Please fill title and passkey",
        variant: "destructive"
      });
      return;
    }

    // Filter out empty questions for validation
    const validQuestions = manualQuestions.filter(q => 
      q.text.trim() && 
      q.options.every(opt => opt.trim()) &&
      q.options.length === 4
    );

    if (!newQuiz.excelFile && validQuestions.length === 0) {
      toast({
        title: "Error", 
        description: "Please either upload an Excel file or add manual questions",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", newQuiz.title);
    formData.append("passkey", newQuiz.passkey);
    formData.append("defaultTimePerQuestion", newQuiz.defaultTimePerQuestion);
    formData.append("scoringType", newQuiz.scoringType);
    if (newQuiz.scoringType === 'speed') {
      formData.append('speedScoringConfig', JSON.stringify(newQuiz.speedScoringConfig));
    }
    
    if (newQuiz.excelFile) {
      formData.append("excelFile", newQuiz.excelFile);
    } else if (validQuestions.length > 0) {
      // Send manual questions as JSON
      formData.append("questions", JSON.stringify(validQuestions));
    }

    createQuizMutation.mutate(formData);
  };

  const addQuestion = () => {
    setManualQuestions([...manualQuestions, {
      text: "",
      options: ["", "", "", ""],
      correctAnswer: "Option A", 
      isBonus: false,
      timeLimit: 45,
      points: 10
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...manualQuestions];
    if (field === 'options') {
      updated[index].options[value.index] = value.value;
    } else {
      (updated[index] as any)[field] = value;
    }
    setManualQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setManualQuestions(manualQuestions.filter((_, i) => i !== index));
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch("/api/quiz-template", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to download template");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'quiz-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Template downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download template",
        variant: "destructive"
      });
    }
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
              <Button variant="ghost" size="sm" onClick={() => {
                logout();
                setLocation("/login");
              }}>
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
                <div className="flex items-center justify-between mb-4">
                  <Label>Questions</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Excel Template
                    </Button>
                    <Dialog open={showManualQuiz} onOpenChange={setShowManualQuiz}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Manual Questions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Questions Manually</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          {manualQuestions.map((question, index) => (
                            <Card key={index} className="p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium">Question {index + 1}</h4>
                                {manualQuestions.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeQuestion(index)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <Label>Question Text</Label>
                                  <Textarea
                                    placeholder="Enter your question here..."
                                    value={question.text}
                                    onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  {question.options.map((option, optIndex) => (
                                    <div key={optIndex}>
                                      <Label>Option {String.fromCharCode(65 + optIndex)}</Label>
                                      <Input
                                        placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                        value={option}
                                        onChange={(e) => updateQuestion(index, 'options', { index: optIndex, value: e.target.value })}
                                        className="mt-2"
                                      />
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="grid grid-cols-4 gap-4">
                                  <div>
                                    <Label>Correct Answer</Label>
                                    <Select
                                      value={question.correctAnswer}
                                      onValueChange={(value) => updateQuestion(index, 'correctAnswer', value)}
                                    >
                                      <SelectTrigger className="mt-2">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Option A">Option A</SelectItem>
                                        <SelectItem value="Option B">Option B</SelectItem>
                                        <SelectItem value="Option C">Option C</SelectItem>
                                        <SelectItem value="Option D">Option D</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <Label>Time Limit (seconds)</Label>
                                    <Input
                                      type="number"
                                      value={question.timeLimit}
                                      onChange={(e) => updateQuestion(index, 'timeLimit', parseInt(e.target.value) || 45)}
                                      className="mt-2"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label>Points</Label>
                                    <Input
                                      type="number"
                                      value={question.points}
                                      onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 10)}
                                      className="mt-2"
                                      min="1"
                                      max="100"
                                    />
                                  </div>
                                  
                                  <div className="flex items-center space-x-2 mt-8">
                                    <input
                                      type="checkbox"
                                      id={`bonus-${index}`}
                                      checked={question.isBonus}
                                      onChange={(e) => updateQuestion(index, 'isBonus', e.target.checked)}
                                    />
                                    <Label htmlFor={`bonus-${index}`}>Bonus Question</Label>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                          
                          <div className="flex justify-between">
                            <Button variant="outline" onClick={addQuestion}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Another Question
                            </Button>
                            <Button onClick={() => setShowManualQuiz(false)}>
                              Done
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-600 mb-2">Upload Excel file OR use manual questions</p>
                  <p className="text-xs text-gray-500 mb-3">Supports .xlsx format with questions, options, and answers</p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setNewQuiz({ ...newQuiz, excelFile: e.target.files?.[0] || null })}
                    className="hidden"
                    id="excel-upload"
                  />
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('excel-upload')?.click()}
                    >
                      Choose Excel File
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                  {newQuiz.excelFile && (
                    <p className="mt-2 text-sm text-green-600">Selected: {newQuiz.excelFile.name}</p>
                  )}
                  {manualQuestions.some(q => q.text.trim()) && (
                    <p className="mt-2 text-sm text-blue-600">
                      {manualQuestions.filter(q => q.text.trim()).length} manual questions added
                    </p>
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
                    <SelectItem value="speed">Speed-based (Position-based Points)</SelectItem>
                    <SelectItem value="negative">With Negative Marking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Speed Scoring Configuration */}
              {newQuiz.scoringType === "speed" && (
                <div className="lg:col-span-2">
                  <Label>Position-Based Scoring Configuration</Label>
                  <div className="mt-2 space-y-3 p-4 border border-gray-200 rounded-lg bg-blue-50">
                    <p className="text-sm text-gray-600 mb-3">Configure points based on answer position (1st, 2nd, 3rd, etc.)</p>
                    {newQuiz.speedScoringConfig.map((config, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-1">
                          <Label className="text-xs">Position</Label>
                          <div className="mt-1 p-2 bg-gray-100 rounded border text-sm font-medium">
                            {index === 0 ? "1st Place" : 
                             index === 1 ? "2nd Place" : 
                             index === 2 ? "3rd Place" : 
                             index === newQuiz.speedScoringConfig.length - 1 ? "All Others" :
                             `${index + 1}${index === 3 ? 'th' : index === 4 ? 'th' : 'th'} Place`}
                          </div>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Points awarded</Label>
                          <Input
                            type="number"
                            value={config.points}
                            onChange={(e) => {
                              const newConfig = [...newQuiz.speedScoringConfig];
                              newConfig[index].points = parseInt(e.target.value) || 0;
                              setNewQuiz({ ...newQuiz, speedScoringConfig: newConfig });
                            }}
                            className="mt-1"
                          />
                        </div>
                        {index < newQuiz.speedScoringConfig.length - 1 && newQuiz.speedScoringConfig.length > 2 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newConfig = newQuiz.speedScoringConfig.filter((_, i) => i !== index);
                              setNewQuiz({ ...newQuiz, speedScoringConfig: newConfig });
                            }}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                    {newQuiz.speedScoringConfig.length < 6 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newConfig = [...newQuiz.speedScoringConfig];
                          const newPosition = newConfig.length;
                          newConfig.splice(-1, 0, { maxTime: 0, points: Math.max(5, newConfig[newConfig.length - 2]?.points - 5 || 5) });
                          setNewQuiz({ ...newQuiz, speedScoringConfig: newConfig });
                        }}
                      >
                        + Add Position
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              <div className="lg:col-span-2">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-2 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Excel Template Format
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Required columns:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>Question:</strong> The question text</li>
                      <li><strong>Option A, Option B, Option C, Option D:</strong> Multiple choice options</li>
                      <li><strong>Correct Answer:</strong> Must be "Option A", "Option B", "Option C", or "Option D"</li>
                      <li><strong>Points:</strong> Number of points (optional, defaults to 10)</li>
                      <li><strong>Is Bonus:</strong> "Yes" or "No" (optional, defaults to "No")</li>
                      <li><strong>Time Limit (seconds):</strong> Number of seconds (optional, uses default time)</li>
                    </ul>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCreateQuiz}
                  disabled={createQuizMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createQuizMutation.isPending ? "Creating..." : "Create Quiz"}
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
                          onClick={() => setLocation(`/admin/quiz/${quiz.id}/results`)}
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
