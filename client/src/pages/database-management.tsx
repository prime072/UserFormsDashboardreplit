import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Table, Loader2, Plus } from "lucide-react";
import Layout from "@/components/layout";

export default function DatabaseManagement() {
  const { data: formDatabases, isLoading: isLoadingForms } = useQuery<any[]>({
    queryKey: ["/api/forms-database"],
  });

  if (isLoadingForms) {
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
            <p className="text-muted-foreground">Manage your form databases.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Existing Form Databases */}
          {formDatabases?.map((form) => (
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
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <Database className="mr-2 h-4 w-4" />
                  Manage submissions and data for this form.
                </div>
                <Button variant="outline" className="w-full" onClick={() => window.location.href = `/forms/${form.id}/responses`}>
                  View Data
                </Button>
              </CardContent>
            </Card>
          ))}

          {(!formDatabases || formDatabases.length === 0) && !isLoadingForms && (
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
