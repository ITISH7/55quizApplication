import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Brain, Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, login, sendOtp } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    setLocation(user.isAdmin ? "/admin" : "/dashboard");
    return null;
  }

  const handleSendOtp = async () => {
    if (!email.endsWith("@fiftyfivetech.io")) {
      toast({
        title: "Invalid Email",
        description: "Only @fiftyfivetech.io emails are allowed",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendOtp(email);
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: "Check your email for the 6-digit code"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(email, otp);
      // Redirect will happen automatically via useAuth
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Live Quiz Showdown</h1>
            <p className="text-gray-600">Corporate Team Quiz Platform</p>
          </div>

          {step === "email" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@fiftyfivetech.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Only @fiftyfivetech.io emails are allowed</p>
              </div>
              <Button 
                onClick={handleSendOtp}
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                  Enter OTP
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-2 text-center text-xl font-mono"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Check your email for the 6-digit code</p>
              </div>
              <Button 
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 6}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Login
              </Button>
              <Button 
                variant="outline"
                onClick={handleSendOtp}
                disabled={isLoading}
                className="w-full"
              >
                Resend OTP
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
