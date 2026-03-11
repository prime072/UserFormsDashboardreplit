import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function PrivateUserResponses() {
  const [match, params] = useRoute("/private/forms/:id/responses");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const formId = params?.id;
  const privateUserSession = sessionStorage.getItem("private_user");
  const privateUser = privateUserSession ? JSON.parse(privateUserSession) : null;

  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!privateUser?.id) {
      setLocation("/private-login");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch form
        const formRes = await fetch(`/api/forms/${formId}`);
        if (formRes.ok) {
          setForm(await formRes.json());
        }

        // Fetch responses
        const respRes = await fetch(`/api/private-user/forms/${formId}/responses`, {
          headers: { "x-private-user-id": privateUser.id },
        });
        if (respRes.ok) {
          setResponses(await respRes.json());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "Failed to load responses", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (formId) fetchData();
  }, [formId, privateUser, setLocation]);

  const deleteResponse = async (responseId: string) => {
    try {
      const res = await fetch(`/api/responses/${responseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setResponses(responses.filter((r) => r.id !== responseId));
        toast({ title: "Success", description: "Response deleted" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete response", variant: "destructive" });
    }
  };

  const filteredResponses = responses.filter((r) =>
    JSON.stringify(r.data).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Layout><div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setLocation("/private-users")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{form?.title || "Form"} Responses</h1>
            <p className="text-slate-600">Total: {filteredResponses.length} response(s)</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by any field..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {filteredResponses.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center">
              <p className="text-slate-500">No responses found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredResponses.map((response) => (
              <Card key={response.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-slate-500">
                        Submitted: {new Date(response.submittedAt).toLocaleString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteResponse(response.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {Object.entries(response.data).map(([key, value]) => (
                        <div key={key} className="border-t pt-2">
                          <p className="text-sm font-semibold text-slate-700">{key}</p>
                          <p className="text-slate-600 break-words">
                            {Array.isArray(value) ? JSON.stringify(value, null, 2) : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
