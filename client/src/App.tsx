import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import QuizControl from "@/pages/quiz-control";
import UserDashboard from "@/pages/user-dashboard";
import LiveQuiz from "@/pages/live-quiz";
import FinalResults from "@/pages/final-results";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/quiz/:id/control" component={QuizControl} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/quiz/:id" component={LiveQuiz} />
      <Route path="/quiz/:id/results" component={FinalResults} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
