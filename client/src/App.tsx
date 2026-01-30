import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { FormProvider } from "@/lib/form-context";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import MyForms from "@/pages/my-forms";
import FormBuilder from "@/pages/form-builder";
import PublicFormPage from "@/pages/public-form";
import SubmissionConfirmation from "@/pages/submission-confirmation";
import ResponsesView from "@/pages/responses-view";
import ResponsesAnalytics from "@/pages/responses-analytics";
import ResponsesDashboard from "@/pages/responses-dashboard";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import PrivateUserDashboard from "@/pages/private-user-dashboard";
import PrivateUserLogin from "@/pages/private-user-login";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import { ReactNode } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Call hooks first, then conditionally render
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    // Use effect pattern to navigate without early return
    setTimeout(() => setLocation("/auth"), 0);
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  return <Component />;
}

function AdminProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const adminSession = sessionStorage.getItem("admin_session");

  // All hooks called first, then conditional render
  if (!adminSession) {
    setTimeout(() => setLocation("/admin/login"), 0);
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/forms/new">
        <ProtectedRoute component={FormBuilder} />
      </Route>
      <Route path="/forms/:id/edit">
        <ProtectedRoute component={FormBuilder} />
      </Route>
      <Route path="/forms/:id/responses">
        <ProtectedRoute component={ResponsesView} />
      </Route>
      <Route path="/forms/:id/analytics">
        <ProtectedRoute component={ResponsesAnalytics} />
      </Route>
      <Route path="/responses">
        <ProtectedRoute component={ResponsesDashboard} />
      </Route>
      <Route path="/forms">
        <ProtectedRoute component={MyForms} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard">
        <AdminProtectedRoute component={AdminDashboard} />
      </Route>

      {/* Private User Routes */}
      <Route path="/private-login" component={PrivateUserLogin} />
      <Route path="/private-users">
        <ProtectedRoute component={PrivateUserDashboard} />
      </Route>
      
      {/* Public Route - No Protection needed */}
      <Route path="/s/:id" component={PublicFormPage} />
      <Route path="/s/:id/confirmation/:submissionId" component={SubmissionConfirmation} />

      {/* Default Route */}

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FormProvider>
          <Toaster />
          <Router />
        </FormProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
