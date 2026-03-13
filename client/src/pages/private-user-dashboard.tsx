import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { useForms } from "@/lib/form-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface PrivateUser {
  id: string;
  name: string;
  email: string;
  accessibleForms: string[];
}

export default function PrivateUserDashboard() {
  const { user } = useAuth();
  const { forms } = useForms();
  const { toast } = useToast();
  
  const privateUserSession = sessionStorage.getItem("private_user");
  const privateUser = privateUserSession ? JSON.parse(privateUserSession) : null;
  
  const [privateUsers, setPrivateUsers] = useState<PrivateUser[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
  const [selectedUserAccess, setSelectedUserAccess] = useState<{ [key: string]: string[] }>({});
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) fetchPrivateUsers();
    if (privateUser?.id) fetchPrivateUserResponses();
  }, [user?.id, privateUser?.id]);

  const fetchPrivateUsers = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/private-users", {
        headers: { "x-user-id": user.id },
      });
      if (response.ok) {
        const data = await response.json();
        setPrivateUsers(data);
        const accessMap: { [key: string]: string[] } = {};
        data.forEach((pu: PrivateUser) => {
          accessMap[pu.id] = pu.accessibleForms || [];
        });
        setSelectedUserAccess(accessMap);
      }
    } catch (error) {
      console.error("Error fetching private users:", error);
    }
  };

  const fetchPrivateUserResponses = async () => {
    if (!privateUser?.id) return;
    try {
      const response = await fetch("/api/private-user/responses", {
        headers: { "x-private-user-id": privateUser.id },
      });
      if (!response.ok) {
        console.error("Failed to fetch responses:", response.status);
        return;
      }
      const data = await response.json();
      setResponses(data || []);
    } catch (error) {
      console.error("Error fetching private user responses:", error);
    }
  };

  const createPrivateUser = async () => {
    if (!user?.id || !newUser.name || !newUser.email || !newUser.password) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch("/api/private-users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Private user created" });
        setNewUser({ name: "", email: "", password: "" });
        fetchPrivateUsers();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create private user", variant: "destructive" });
    }
  };

  const updateAccess = async (privateUserId: string) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/private-users/${privateUserId}/access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ formIds: selectedUserAccess[privateUserId] || [] }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Access updated" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update access", variant: "destructive" });
    }
  };

  const deletePrivateUser = async (privateUserId: string) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/private-users/${privateUserId}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      });

      if (response.ok) {
        toast({ title: "Success", description: "Private user deleted" });
        fetchPrivateUsers();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete private user", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Private Users</h1>
          <p className="text-slate-600 mt-1">Manage private users and their form access</p>
        </div>

        {/* Create Private User */}
        <Card>
          <CardHeader>
            <CardTitle>Create Private User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              data-testid="input-private-user-name"
            />
            <Input
              placeholder="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              data-testid="input-private-user-email"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                data-testid="input-private-user-password"
              />
              <Button variant="outline" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={createPrivateUser} className="w-full" data-testid="button-create-private-user">
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </CardContent>
        </Card>

        {/* Private Users List */}
        <div className="space-y-4">
          {privateUsers.map((privateUser) => (
            <Card key={privateUser.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{privateUser.name}</p>
                    <p className="text-sm text-slate-600">{privateUser.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePrivateUser(privateUser.id)}
                    data-testid={`button-delete-private-user-${privateUser.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Form Access</p>
                  <div className="space-y-2">
                    {forms.length === 0 ? (
                      <p className="text-sm text-slate-500">No forms available</p>
                    ) : (
                      forms.map((form) => (
                        <div key={form.id}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={selectedUserAccess[privateUser.id]?.includes(form.id) || false}
                              onCheckedChange={(checked) => {
                                const current = selectedUserAccess[privateUser.id] || [];
                                setSelectedUserAccess({
                                  ...selectedUserAccess,
                                  [privateUser.id]: checked
                                    ? [...current, form.id]
                                    : current.filter((id) => id !== form.id),
                                });
                              }}
                              data-testid={`checkbox-form-${form.id}-${privateUser.id}`}
                            />
                            <span className="text-sm">{form.title}</span>
                          </label>
                          {selectedUserAccess[privateUser.id]?.includes(form.id) && (
                            <span className="text-[10px] text-muted-foreground ml-6 mt-1 block">(Responses accessible to private users when enabled in form settings)</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => updateAccess(privateUser.id)}
                  className="w-full"
                  data-testid={`button-save-access-${privateUser.id}`}
                >
                  Save Access
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
