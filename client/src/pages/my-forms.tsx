import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, ExternalLink, Share2, MoreHorizontal, Trash2, FileText, Globe, Lock } from "lucide-react";
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
import { AlertCircle } from "lucide-react";

export default function MyForms() {
  const { forms, deleteForm } = useForms();
  const { user, isSuspended } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [responseStats, setResponseStats] = useState<Record<string, number>>({});

  if (isSuspended) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center py-16 space-y-4">
            <Lock className="w-16 h-16 text-red-600 mx-auto" />
            <h1 className="text-3xl font-display font-bold text-slate-900">Account Suspended</h1>
            <p className="text-slate-600 max-w-md mx-auto">
              Your account has been suspended by the administrator. You cannot access the forms section. 
              Please contact the admin for assistance.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-slate-500">You can still:</p>
              <p className="text-sm font-medium text-slate-700">• View and download form responses</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    if (user?.id) {
      refreshResponseCounts();
    }
  }, [user?.id, forms]);

  const refreshResponseCounts = async () => {
    if (!user?.id) return;
    try {
      const stats: Record<string, number> = {};
      for (const form of forms) {
        const response = await fetch(`/api/forms/${form.id}/stats`, {
          headers: { "x-user-id": user.id },
        });
        if (response.ok) {
          const data = await response.json();
          stats[form.id] = data.responseCount || 0;
        }
      }
      setResponseStats(stats);
    } catch (error) {
      console.error("Error fetching response stats:", error);
    }
  };

  const adminUserMetrics = JSON.parse(sessionStorage.getItem("admin_users_metrics") || "[]");
  const userMetrics = adminUserMetrics.find((m: any) => m.userId === user?.id);
  const formLimit = userMetrics?.formLimit || 10;
  const canCreateForm = forms.length < formLimit;
  const formsOverLimit = Math.max(0, forms.length - formLimit);

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
      <div className="max-w-6xl mx-auto space-y-8">
        
        {formsOverLimit > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" data-testid="icon-form-limit-alert" />
            <AlertDescription>
              You have {formsOverLimit} form(s) over your limit of {formLimit}. Only delete operations are allowed.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-8 h-8" />
              My Forms
            </h1>
            <p className="text-slate-500 mt-1">Manage all your forms in one place</p>
            <p className="text-sm text-slate-600 mt-2">Forms: {forms.length}/{formLimit}</p>
          </div>
          {canCreateForm ? (
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

        {forms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center space-y-4">
              <FileText className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">No forms yet</h3>
                <p className="text-slate-500 mt-1">Create your first form to get started</p>
              </div>
              <Link href="/forms/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Form
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <Card 
                key={form.id} 
                className="group hover:border-primary/50 transition-colors cursor-pointer flex flex-col"
                onClick={() => setLocation(`/forms/${form.id}/edit`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        form.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {form.status}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                        form.visibility === "public" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {form.visibility === "public" ? (
                          <>
                            <Globe className="w-3 h-3" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            Private
                          </>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2 text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/forms/${form.id}/edit`); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit Form
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/forms/${form.id}/responses`); }}>
                          <Plus className="w-4 h-4 mr-2" /> View Responses
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleShare(e, form.id)}>
                          <Share2 className="w-4 h-4 mr-2" /> Share Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/s/${form.id}`, '_blank'); }}>
                          <ExternalLink className="w-4 h-4 mr-2" /> View Live
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={(e) => handleDelete(e, form.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">{form.title}</CardTitle>
                  <CardDescription>{responseStats[form.id] || 0} responses collected</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(responseStats[form.id] || 0, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4">
                    Updated {formatDistanceToNow(new Date(form.lastUpdated || new Date()), { addSuffix: true })}
                  </p>
                </CardContent>
                <CardFooter className="pt-0 gap-2 border-t bg-slate-50/50 p-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); setLocation(`/forms/${form.id}/edit`); }}>
                    <Edit className="w-3 h-3 mr-2" /> Edit
                  </Button>
                  <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); window.open(`/s/${form.id}`, '_blank'); }}>
                    <ExternalLink className="w-3 h-3 mr-2" /> View
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
