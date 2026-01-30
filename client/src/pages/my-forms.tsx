import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, ExternalLink, Share2, MoreHorizontal, Trash2, FileText, Globe, Lock, FolderPlus, ChevronRight, ChevronDown } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MyForms() {
  const { forms, deleteForm } = useForms();
  const { user, isSuspended } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [responseStats, setResponseStats] = useState<Record<string, number>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchProjects();
      refreshResponseCounts();
    }
  }, [user?.id, forms]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects", {
        headers: { "x-user-id": user?.id || "" }
      });
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error(e); }
  };

  const createProject = async () => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "" 
        },
        body: JSON.stringify({ name: newProjectName })
      });
      if (res.ok) {
        setNewProjectName("");
        setIsCreatingProject(false);
        fetchProjects();
        toast({ title: "Project Created", description: "Your project has been created successfully." });
      }
    } catch (e) { console.error(e); }
  };

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const formsByProject = (projectId: string | null) => {
    return forms.filter(f => {
      // In the database/context, projectId might be null, undefined, or empty string for unassigned forms
      if (projectId === null) return !f.projectId || f.projectId === "";
      return f.projectId === projectId;
    });
  };

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
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {formsOverLimit > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {formsOverLimit} form(s) over your limit of {formLimit}.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-8 h-8" />
              My Projects & Forms
            </h1>
            <p className="text-slate-500 mt-1">Manage your forms organized by projects</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreatingProject} onOpenChange={setIsCreatingProject}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="w-4 h-4 mr-2" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. Sales Q1" />
                  </div>
                  <Button onClick={createProject} className="w-full">Create Project</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={() => setLocation("/forms/new")} disabled={!canCreateForm}>
              <Plus className="w-4 h-4 mr-2" /> New Form
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {projects.map(project => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 py-3 flex flex-row items-center justify-between cursor-pointer" onClick={() => toggleProject(project.id)}>
                <div className="flex items-center gap-2">
                  {expandedProjects[project.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full border">
                    {formsByProject(project.id).length} forms
                  </span>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                   <Button variant="ghost" size="sm" onClick={() => setLocation(`/forms/new?projectId=${project.id}`)} disabled={!canCreateForm}>
                      <Plus className="w-4 h-4 mr-1" /> Add Form
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => setLocation(`/project/${project.id}/users`)}>
                      <Lock className="w-4 h-4 mr-1" /> Private Users
                   </Button>
                </div>
              </CardHeader>
              {expandedProjects[project.id] && (
                <CardContent className="p-0">
                  <div className="divide-y">
                    {formsByProject(project.id).length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground italic">No forms in this project</div>
                    ) : (
                      formsByProject(project.id).map(form => (
                        <div key={form.id} className="flex items-center justify-between p-4 hover:bg-slate-50 group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {form.title.charAt(0)}
                            </div>
                            <div>
                              <Link href={`/s/${form.id}`} className="font-medium hover:underline">{form.title}</Link>
                              <div className="text-xs text-muted-foreground">
                                {responseStats[form.id] || 0} responses • Updated {formatDistanceToNow(new Date(form.updatedAt), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setLocation(`/forms/${form.id}/edit`)}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => setLocation(`/forms/${form.id}/responses`)}>Data</Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => handleShare(e, form.id)}>Share Link</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={(e) => handleDelete(e, form.id)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          <div className="pt-4">
            <Label className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Unassigned Forms</Label>
            {formsByProject(null).length === 0 ? (
              <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground italic">
                No unassigned forms
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {formsByProject(null).map(form => (
                  <Card key={form.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/forms/${form.id}/edit`)}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {form.title.charAt(0)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setLocation(`/forms/${form.id}/edit`)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocation(`/forms/${form.id}/responses`)}>Responses</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => handleDelete(e as any, form.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-lg truncate">{form.title}</CardTitle>
                      <CardDescription>{responseStats[form.id] || 0} responses</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
