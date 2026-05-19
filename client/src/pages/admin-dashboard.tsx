import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Users, HardDrive, FileText, Edit2, Save, X, Moon, Sun, Monitor, Lock, Unlock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForms } from "@/lib/form-context";
import { User } from "@/lib/auth-context";
import { useTheme } from "next-themes";

interface UserMetrics extends User {
  formsCount: number;
  storageUsed: number;
  formLimit: number;
  storageLimit: number;
  status?: "active" | "suspended";
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { forms, responses } = useForms();
  const { theme, setTheme } = useTheme();
  const [users, setUsers] = useState<UserMetrics[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<UserMetrics>>({});
  const [selectedUser, setSelectedUser] = useState<UserMetrics | null>(null);

  const fetchUsersFromMongoDB = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", {
        headers: { "x-admin-session": sessionStorage.getItem("admin_session") || "" },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const allUsers = await response.json();
      const formsByUser = new Map<string, number>();
      const responsesByUser = new Map<string, number>();
      const storageByUser = new Map<string, number>();

      for (const form of forms) {
        formsByUser.set(form.userId, (formsByUser.get(form.userId) || 0) + 1);
      }
      for (const form of forms) {
        const count = responses.filter((response) => response.formId === form.id).length;
        responsesByUser.set(form.userId, (responsesByUser.get(form.userId) || 0) + count);
        const existing = storageByUser.get(form.userId) || 0;
        storageByUser.set(form.userId, existing + JSON.stringify(form).length / 1024);
      }

      const updatedUsers: UserMetrics[] = allUsers.map((user: any) => ({
        ...user,
        formsCount: formsByUser.get(user.id) || 0,
        storageUsed: Math.round(storageByUser.get(user.id) || 0),
        totalForms: formsByUser.get(user.id) || 0,
        totalResponses: responsesByUser.get(user.id) || 0,
        formLimit: 10,
        storageLimit: 10240,
      }));
      setUsers(updatedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  }, [forms, responses]);

  useEffect(() => {
    fetchUsersFromMongoDB();
    const interval = window.setInterval(fetchUsersFromMongoDB, 15000);
    return () => window.clearInterval(interval);
  }, [fetchUsersFromMongoDB]);

  const stats = useMemo(() => ({
    totalUsers: users.length,
    totalForms: forms.length,
    totalResponses: responses.length,
    totalStorageUsed: users.reduce((sum, u) => sum + u.storageUsed, 0)
  }), [users, forms, responses]);

  const handleEditUser = (user: UserMetrics) => {
    setEditingUserId(user.id);
    setEditData({ ...user });
  };

  const handleSaveUser = async (userId: string) => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-session": sessionStorage.getItem("admin_session") || "",
      },
      body: JSON.stringify({
        status: editData.status,
        totalForms: editData.totalForms,
        totalResponses: editData.totalResponses,
      }),
    });
    if (!response.ok) {
      toast({ title: "Update failed", description: "Could not update user", variant: "destructive" });
      return;
    }
    await fetchUsersFromMongoDB();
    setEditingUserId(null);
    toast({ title: "User Updated", description: `Limits updated for ${editData.firstName} ${editData.lastName}` });
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_session");
    toast({ title: "Logged Out", description: "Admin session ended" });
    setLocation("/admin/login");
  };

  const handleSuspendUser = async (userId: string) => {
    const current = users.find((u) => u.id === userId);
    const nextStatus = current?.status === "suspended" ? "active" : "suspended";
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-session": sessionStorage.getItem("admin_session") || "",
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      toast({ title: "Update failed", description: "Could not change user status", variant: "destructive" });
      return;
    }
    await fetchUsersFromMongoDB();
    toast({ title: nextStatus === "suspended" ? "User Suspended" : "User Activated", description: `${current?.firstName} ${current?.lastName} is now ${nextStatus}.` });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure? This will delete the user and all their data.")) return;
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: { "x-admin-session": sessionStorage.getItem("admin_session") || "" },
    });
    if (!response.ok) {
      toast({ title: "Delete failed", description: "Could not delete user", variant: "destructive" });
      return;
    }
    await fetchUsersFromMongoDB();
    toast({ title: "User Deleted", description: "User has been removed.", variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <div>
              <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage users and system settings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Button size="icon" variant={theme === "light" ? "default" : "ghost"} onClick={() => setTheme("light")} className="h-8 w-8" title="Light mode"><Sun className="w-4 h-4" /></Button>
              <Button size="icon" variant={theme === "dark" ? "default" : "ghost"} onClick={() => setTheme("dark")} className="h-8 w-8" title="Dark mode"><Moon className="w-4 h-4" /></Button>
              <Button size="icon" variant={theme === "system" ? "default" : "ghost"} onClick={() => setTheme("system")} className="h-8 w-8" title="System default"><Monitor className="w-4 h-4" /></Button>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 dark:border-slate-700 dark:hover:bg-slate-800" data-testid="button-admin-logout"><LogOut className="w-4 h-4" />Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-6 flex items-center gap-4"><div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900"><Users className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</p></div></CardContent></Card>
          <Card className="dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-6 flex items-center gap-4"><div className="p-3 rounded-xl bg-green-100 dark:bg-green-900"><FileText className="w-6 h-6 text-green-600 dark:text-green-400" /></div><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Forms</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalForms}</p></div></CardContent></Card>
          <Card className="dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-6 flex items-center gap-4"><div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900"><FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Responses</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalResponses}</p></div></CardContent></Card>
          <Card className="dark:border-slate-800 dark:bg-slate-900"><CardContent className="p-6 flex items-center gap-4"><div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900"><HardDrive className="w-6 h-6 text-orange-600 dark:text-orange-400" /></div><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Storage Used</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{(stats.totalStorageUsed / 1024).toFixed(2)} MB</p></div></CardContent></Card>
        </div>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader><CardTitle className="dark:text-white">User Management & Control Center</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-slate-800">
                    <TableHead className="dark:text-slate-300">First Name</TableHead><TableHead className="dark:text-slate-300">Last Name</TableHead><TableHead className="dark:text-slate-300">Email</TableHead><TableHead className="dark:text-slate-300">Status</TableHead><TableHead className="dark:text-slate-300">Forms</TableHead><TableHead className="dark:text-slate-300">Storage</TableHead><TableHead className="dark:text-slate-300">Form Limit</TableHead><TableHead className="dark:text-slate-300">Storage Limit</TableHead><TableHead className="text-right dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-500 dark:text-slate-400">No users yet. Users will appear here when they sign up.</TableCell></TableRow>
                  ) : users.map(user => {
                    const isEditing = editingUserId === user.id;
                    const isUserSuspended = user.status === "suspended";
                    return (
                      <TableRow key={user.id} className={`dark:border-slate-800 ${isUserSuspended ? 'opacity-60' : ''}`}>
                        <TableCell className="font-medium dark:text-white">{user.firstName}</TableCell>
                        <TableCell className="dark:text-slate-300">{user.lastName || "-"}</TableCell>
                        <TableCell className="text-sm dark:text-slate-300">{user.email}</TableCell>
                        <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${isUserSuspended ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'}`}>{isUserSuspended ? 'Suspended' : 'Active'}</span></TableCell>
                        <TableCell className="font-medium dark:text-white">{user.formsCount}</TableCell>
                        <TableCell className="dark:text-slate-300">{(user.storageUsed / 1024).toFixed(2)} MB</TableCell>
                        <TableCell className="dark:text-slate-300">{isEditing ? <Input type="number" value={editData.formLimit || user.formLimit} onChange={(e) => setEditData({ ...editData, formLimit: parseInt(e.target.value) })} className="w-20 dark:bg-slate-800 dark:border-slate-700 dark:text-white" data-testid={`input-form-limit-${user.id}`} /> : user.formLimit}</TableCell>
                        <TableCell className="dark:text-slate-300">{isEditing ? <Input type="number" value={editData.storageLimit ? editData.storageLimit / 1024 : user.storageLimit / 1024} onChange={(e) => setEditData({ ...editData, storageLimit: parseInt(e.target.value) * 1024 })} className="w-24 dark:bg-slate-800 dark:border-slate-700 dark:text-white" data-testid={`input-storage-limit-${user.id}`} /> : (user.storageLimit / 1024).toFixed(1)}</TableCell>
                        <TableCell className="text-right">{isEditing ? <div className="flex gap-2 justify-end"><Button size="sm" onClick={() => handleSaveUser(user.id)} className="gap-1" data-testid={`button-save-user-${user.id}`}><Save className="w-3 h-3" /> Save</Button><Button size="sm" variant="outline" onClick={() => setEditingUserId(null)} className="gap-1 dark:border-slate-700 dark:hover:bg-slate-800" data-testid={`button-cancel-user-${user.id}`}><X className="w-3 h-3" /> Cancel</Button></div> : <div className="flex gap-2 justify-end"><Button size="sm" variant="outline" onClick={() => handleEditUser(user)} className="gap-1 dark:border-slate-700 dark:hover:bg-slate-800" data-testid={`button-edit-user-${user.id}`}><Edit2 className="w-3 h-3" /> Edit</Button><Button size="sm" variant={isUserSuspended ? "default" : "outline"} onClick={() => handleSuspendUser(user.id)} className={`gap-1 ${isUserSuspended ? '' : 'dark:border-slate-700 dark:hover:bg-slate-800'}`} data-testid={`button-suspend-user-${user.id}`}>{isUserSuspended ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}{isUserSuspended ? 'Activate' : 'Suspend'}</Button><Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)} className="gap-1" data-testid={`button-delete-user-${user.id}`}><Trash2 className="w-3 h-3" /> Delete</Button></div>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
