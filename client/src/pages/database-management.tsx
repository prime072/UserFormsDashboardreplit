import { useQuery, useMutation } from "@tanstack/react-query";
import { UserDatabase } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Database, Table, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/layout";

export default function DatabaseManagement() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: databases, isLoading } = useQuery<UserDatabase[]>({
    queryKey: ["/api/user-databases"],
  });

  const createMutation = useMutation({
    mutationFn: async (newDb: { name: string; description: string; config: any; data: any[] }) => {
      const res = await fetch("/api/user-databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDb),
      });
      if (!res.ok) throw new Error("Failed to create database");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-databases"] });
      setIsCreateOpen(false);
      setNewName("");
      setNewDescription("");
      toast({ title: "Success", description: "Database created successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/user-databases/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete database");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-databases"] });
      toast({ title: "Success", description: "Database deleted successfully" });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
            <p className="text-muted-foreground">Create and manage your custom data stores.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-db">
                <Plus className="mr-2 h-4 w-4" /> New Database
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Database</DialogTitle>
                <DialogDescription>
                  Give your database a name and description to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Employee Directory"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What is this database for?"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  data-testid="button-save-db"
                  onClick={() => createMutation.mutate({
                    name: newName,
                    description: newDescription,
                    config: { columns: [] },
                    data: []
                  })}
                  disabled={!newName || createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Database
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {databases?.map((db) => (
            <Card key={db.id} data-testid={`card-db-${db.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteMutation.mutate(db.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="mt-4">{db.name}</CardTitle>
                <CardDescription>{db.description || "No description provided"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Table className="mr-2 h-4 w-4" />
                  {Array.isArray(db.data) ? db.data.length : 0} Records
                </div>
                <Button variant="outline" className="w-full mt-6" data-testid={`button-manage-db-${db.id}`}>
                  Manage Data
                </Button>
              </CardContent>
            </Card>
          ))}

          {databases?.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
              <Database className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No databases found</h3>
              <p className="text-muted-foreground">Create your first database to start organizing data.</p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> New Database
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
