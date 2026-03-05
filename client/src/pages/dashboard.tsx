import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, FileCheck, TrendingUp, Edit, ExternalLink, Share2, MoreHorizontal, Trash2, AlertCircle, Lock, Database } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useForms } from "@/lib/form-context";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function Dashboard() {
  const { forms, responses, deleteForm } = useForms();
  const { user, isSuspended, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  const privateUserSession = sessionStorage.getItem("private_user");
  const privateUser = privateUserSession ? JSON.parse(privateUserSession) : null;

  const { toast } = useToast();
  // ... rest of the code
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(isSuspended);
  const [liveResponses, setLiveResponses] = useState(0);

  // Fetch live total responses from MongoDB
  const fetchLiveResponses = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/user/total-responses", {
        headers: { "x-user-id": user.id },
      });
      if (response.ok) {
        const data = await response.json();
        setLiveResponses(data.totalResponses);
      }
    } catch (error) {
      console.error("Error fetching live responses:", error);
    }
  };

  useEffect(() => {
    fetchLiveResponses();
  }, [user?.id]);

  // Use cached metrics from user object
  const cachedTotalForms = user?.totalForms || forms.length;

  // Get form limit from admin settings
  const adminUserMetrics = JSON.parse(sessionStorage.getItem("admin_users_metrics") || "[]");
  const userMetrics = adminUserMetrics.find((m: any) => m.userId === user?.id);
  const formLimit = userMetrics?.formLimit || 10;
  const canCreateForm = forms.length < formLimit && !isSuspended;
  const formsOverLimit = Math.max(0, forms.length - formLimit);

  const handleSuspensionDialogClose = () => {
    setShowSuspensionDialog(false);
  };

  const totalFormsStat = { 
    label: "Total Forms", 
    value: cachedTotalForms.toString(), 
    icon: FileCheck, 
    color: "text-blue-600", 
    bg: "bg-blue-100" 
  };
  
  const totalResponsesStat = {
    label: "Total Responses",
    value: liveResponses.toString(),
    icon: Users,
    color: "text-purple-600",
    bg: "bg-purple-100"
  };

  const displayStats = [totalFormsStat, totalResponsesStat];

  const handleShare = (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/s/${formId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Form link copied to clipboard!",
    });
  };

  const handleDelete = (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this form?")) {
      deleteForm(formId);
      toast({
        title: "Form Deleted",
        description: "The form has been removed.",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <AlertDialog open={showSuspensionDialog} onOpenChange={setShowSuspensionDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              Account Suspended
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 mt-4">
              <p>Your account has been suspended by the administrator.</p>
              <p className="font-semibold">Reason: Please contact the admin for details.</p>
              <p className="text-sm text-slate-600">You can still download your form responses, but cannot create or edit forms.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuspensionDialogClose}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Suspension Alert */}
        {isSuspended && (
          <Alert variant="destructive" className="border-red-300 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your account is suspended. You can view and download responses, but cannot create or edit forms. Please contact the administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* Over Limit Alert */}
        {formsOverLimit > 0 && !isSuspended && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {formsOverLimit} form(s) over your limit of {formLimit}. Only delete operations are allowed. Please delete some forms to create new ones.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 mt-1">Overview of your form performance</p>
            <p className="text-sm text-slate-600 mt-2">Forms: {forms.length}/{formLimit}</p>
          </div>
          {isSuspended ? (
            <Button 
              className="shadow-lg hover:shadow-xl transition-all"
              disabled
              data-testid="button-create-form"
            >
              <Lock className="w-4 h-4 mr-2" />
              Account Suspended
            </Button>
          ) : canCreateForm ? (
            <Link href="/forms/new">
              <Button 
                className="shadow-lg hover:shadow-xl transition-all"
                data-testid="button-create-form"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Form
              </Button>
            </Link>
          ) : (
            <Button 
              className="shadow-lg hover:shadow-xl transition-all"
              disabled
              data-testid="button-create-form"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Form
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayStats.map((stat) => (
            <Card key={stat.label} className="border-slate-100 shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started quickly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/forms/new">
                <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-create-form-card">
                  <Plus className="w-4 h-4" />
                  Create New Form
                </Button>
              </Link>
              <Link href="/responses">
                <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-view-responses-card">
                  <Users className="w-4 h-4" />
                  View All Responses
                </Button>
              </Link>
              <Link href="/forms">
                <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-view-forms-card">
                  <FileCheck className="w-4 h-4" />
                  Browse All Forms
                </Button>
              </Link>
              <Link href="/databases">
                <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-view-databases-card">
                  <Database className="w-4 h-4" />
                  Manage Databases
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
              <CardDescription>Your FormFlow status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Forms Created</p>
                <p className="text-2xl font-bold">{forms.length}/{formLimit}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Total Responses</p>
                <p className="text-2xl font-bold">{liveResponses}</p>
              </div>
              <div className="text-xs text-slate-500">
                {canCreateForm ? "You can create more forms" : "You've reached your form limit"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
