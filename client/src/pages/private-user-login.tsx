import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PrivateUserLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ userId: "", password: "" });

  const handleLogin = async () => {
    setError(null);
    if (!credentials.userId || !credentials.password) {
      setError("Please enter your user ID and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/private-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Login failed");
        return;
      }

      const user = await response.json();
      sessionStorage.setItem("private_user", JSON.stringify(user));
      toast({ title: "Success", description: "Login successful" });
      setLocation("/dashboard");
    } catch (error) {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-100">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Private Access</CardTitle>
          <CardDescription>Enter your credentials to access private forms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              placeholder="Your user ID"
              value={credentials.userId}
              onChange={(e) => setCredentials({ ...credentials, userId: e.target.value })}
              data-testid="input-private-user-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              data-testid="input-private-password"
            />
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
            data-testid="button-private-login"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
