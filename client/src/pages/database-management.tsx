import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Table, Loader2, Plus, Users, FileText, Upload, Trash2 } from "lucide-react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function UserDatabaseCard({ db }: { db: any }) {
  const { toast } = useToast();
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

  return (
    <Card key={db.id} data-testid={`card-user-db-${db.id}`} className="shadow-md hover:shadow-lg transition-shadow">
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
        <CardDescription>{db.description || "Uploaded database"}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Table className="mr-2 h-4 w-4" />
            <span>{Array.isArray(db.data) ? db.data.length : 0} Records</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <FileText className="mr-2 h-4 w-4" />
            <span>{Object.keys(db.config?.columns || {}).length} Columns</span>
          </div>
        </div>
        <Button variant="outline" className="w-full">
          Manage Data
        </Button>
      </CardContent>
    </Card>
  );
}

function FormDatabaseCard({ form }: { form: any }) {
  const { user } = useAuth();
  const [responseCount, setResponseCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/forms/${form.id}/stats`, {
          headers: { "x-user-id": user?.id || "" }
        });
        if (res.ok) {
          const data = await res.json();
          setResponseCount(data.responseCount);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    if (user?.id) fetchStats();
  }, [form.id, user?.id]);

  return (
    <Card key={form.id} data-testid={`card-form-db-${form.id}`} className="border-primary/20 bg-primary/5 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Table className="h-6 w-6 text-primary" />
          </div>
          <div className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            Form Database
          </div>
        </div>
        <CardTitle className="mt-4">{form.title}</CardTitle>
        <CardDescription>Automatic database for form submissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Database className="mr-2 h-4 w-4" />
            <span>Responses database</span>
          </div>
          <div className="flex items-center text-sm font-medium text-primary">
            <Users className="mr-2 h-4 w-4" />
            <span>{responseCount !== null ? responseCount : "..."} Submissions</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <FileText className="mr-2 h-4 w-4" />
            <span>{form.fields?.length || 0} Columns (Fields)</span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={() => window.location.href = `/forms/${form.id}/responses`}>
          Manage Data
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DatabaseManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [dbName, setDbName] = useState("");

  const { data: formDatabases, isLoading: isLoadingForms } = useQuery<any[]>({
    queryKey: ["/api/forms-database"],
    queryFn: async () => {
      const res = await fetch("/api/forms-database", {
        headers: { "x-user-id": user?.id || "" }
      });
      if (!res.ok) throw new Error("Failed to fetch forms");
      return res.json();
    },
    enabled: !!user?.id
  });

  const { data: userDatabases, isLoading: isLoadingUserDbs } = useQuery<any[]>({
    queryKey: ["/api/user-databases"],
    queryFn: async () => {
      const res = await fetch("/api/user-databases", {
        headers: { "x-user-id": user?.id || "" }
      });
      if (!res.ok) throw new Error("Failed to fetch user databases");
      return res.json();
    },
    enabled: !!user?.id
  });

  const createDbMutation = useMutation({
    mutationFn: async (newDb: any) => {
      const res = await fetch("/api/user-databases", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify(newDb),
      });
      if (!res.ok) throw new Error("Failed to create database");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-databases"] });
      setIsUploadOpen(false);
      setDbName("");
      toast({ title: "Success", description: "Database created from Excel" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
      if (rows.length < 2) return;

      const headers = rows[0].map((header) => String(header || "").trim()).filter(Boolean);
      const data = rows.slice(1)
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim() !== ""))
        .map((row) => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] ?? "";
          });
          return obj;
        });

      if (headers.length > 0 && data.length > 0) {
        const config = {
          columns: headers.reduce((acc: any, header) => {
            acc[header] = { type: "text" };
            return acc;
          }, {})
        };

        createDbMutation.mutate({
          name: dbName || file.name.replace(/\.[^/.]+$/, ""),
          description: `Uploaded from ${file.name}`,
          config,
          data,
          columnNames: headers,
          sourceType: "excel"
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  if (isLoadingForms || isLoadingUserDbs) {
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
            <p className="text-muted-foreground">Manage your form and uploaded databases.</p>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" /> Upload Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Excel Database</DialogTitle>
                <DialogDescription>
                  Upload an Excel file to create a new database. The first row will be used as column names.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="dbName">Database Name (Optional)</Label>
                  <Input 
                    id="dbName" 
                    placeholder="Auto-generated if empty" 
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Select Excel File</Label>
                  <Input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileUpload}
                    disabled={createDbMutation.isPending}
                  />
                </div>
              </div>
              {createDbMutation.isPending && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Processing file...</span>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userDatabases?.map((db) => (
            <UserDatabaseCard key={db.id} db={db} />
          ))}
          {formDatabases?.map((form) => (
            <FormDatabaseCard key={form.id} form={form} />
          ))}
          {(!formDatabases || formDatabases.length === 0) && (!userDatabases || userDatabases.length === 0) && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
              <Database className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No form databases found</h3>
              <p className="text-muted-foreground">Create a form first to see its database here.</p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => window.location.href = "/forms/new"}
              >
                <Plus className="mr-2 h-4 w-4" /> Create New Form
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
