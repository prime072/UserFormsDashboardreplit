import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Plus, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function ProjectUsers() {
  const [, params] = useRoute("/project/:id/users");
  const projectId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [project, setProject] = useState<any>(null);
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchUsers();
    }
  }, [projectId]);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects`, { headers: { "x-user-id": user?.id || "" } });
    if (res.ok) {
      const projects = await res.json();
      setProject(projects.find((p: any) => p.id === projectId));
    }
  };

  const fetchUsers = async () => {
    const res = await fetch(`/api/projects/${projectId}/users`, { headers: { "x-user-id": user?.id || "" } });
    if (res.ok) setProjectUsers(await res.json());
  };

  const addUser = async () => {
    const res = await fetch(`/api/projects/${projectId}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user?.id || "" },
      body: JSON.stringify({ userId: newUserId, password: newPassword })
    });
    if (res.ok) {
      setNewUserId("");
      setNewPassword("");
      fetchUsers();
      toast({ title: "User Added", description: "Private user added to project" });
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/forms")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">Project Users: {project?.name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader><CardTitle>Add Private User</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input value={newUserId} onChange={e => setNewUserId(e.target.value)} placeholder="e.g. user123" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <Button onClick={addUser} className="w-full"><UserPlus className="w-4 h-4 mr-2" /> Add User</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Existing Project Users</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectUsers.length === 0 ? (
                  <p className="text-muted-foreground italic text-center py-4">No private users yet</p>
                ) : (
                  projectUsers.map((u: any) => (
                    <div key={u.id} className="p-3 bg-slate-50 rounded border flex justify-between items-center">
                      <span className="font-medium">{u.userId}</span>
                      <span className="text-xs text-muted-foreground uppercase">{u.role}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
