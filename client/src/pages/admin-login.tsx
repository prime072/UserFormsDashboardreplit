import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Admin credentials - fallback to defaults if env vars are missing
    const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || "admin";
    const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Store admin session
      sessionStorage.setItem("admin_session", JSON.stringify({
        isAdmin: true,
        loginTime: new Date().toISOString()
      }));
      
      toast({
        title: "Login Successful",
        description: "Welcome Admin!",
      });
      
      setTimeout(() => setLocation("/admin/dashboard"), 500);
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid credentials",
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Admin Portal</CardTitle>
          <CardDescription>Sign in to manage users and settings</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                data-testid="input-admin-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                data-testid="input-admin-password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              data-testid="button-admin-login"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            Admin login only. Unauthorized access is prohibited.
          </p>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600 text-center mb-3">
              Not an admin?
            </p>
            <Link href="/auth">
              <a className="block w-full px-4 py-2 text-center text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors" data-testid="link-user-login">
                Go to User Login
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
