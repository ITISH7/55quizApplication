import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

interface QuizTimerProps {
  duration: number; // in seconds
  isRunning: boolean;
  onComplete?: () => void;
}

export function QuizTimer({ duration, isRunning, onComplete }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Reset timer when duration changes (new question)
  useEffect(() => {
    console.log('Timer: Resetting for new question, duration:', duration);
    setTimeLeft(duration);
    setHasCompleted(false);
  }, [duration]);

  // Reset timer when isRunning changes from false to true
  useEffect(() => {
    if (isRunning && timeLeft !== duration) {
      console.log('Timer: Starting timer, resetting timeLeft to duration:', duration);
      setTimeLeft(duration);
      setHasCompleted(false);
    }
  }, [isRunning, duration]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0 || hasCompleted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          console.log('Timer: Time up! Calling onComplete');
          setHasCompleted(true);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onComplete, hasCompleted]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progress = ((duration - timeLeft) / duration) * 100;

  const getTimeColor = () => {
    if (timeLeft <= 10) return "text-red-600";
    if (timeLeft <= 30) return "text-orange-600";
    return "text-primary-600";
  };

  const getProgressColor = () => {
    if (timeLeft <= 10) return "bg-red-500";
    if (timeLeft <= 30) return "bg-orange-500";
    return "bg-primary-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Time Remaining
        </span>
        <span className={`text-2xl font-bold ${getTimeColor()} ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>
          {timeString}
        </span>
      </div>
      <div className="w-full bg-gray-300 rounded-full h-3 shadow-inner">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ${getProgressColor()}`}
          style={{ width: `${100 - progress}%` }}
        />
      </div>
      {timeLeft <= 10 && timeLeft > 0 && (
        <p className="text-center text-red-600 font-medium mt-2 animate-pulse">
          Time running out!
        </p>
      )}
    </div>
  );
}