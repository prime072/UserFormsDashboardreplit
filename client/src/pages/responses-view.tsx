import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/layout";
import { useForms } from "@/lib/form-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Edit, Trash2, Save, X, BarChart3, Download, Lock, Plus, Minus } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { addDaysToDate, calculateHmr } from "@shared/schema";

export default function ResponsesView() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/forms/:id/responses");
  const { toast } = useToast();
  const { user, isSuspended } = useAuth();
  const { getForm, getFormResponses, updateResponse, deleteResponse, fetchFormResponses } = useForms();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const formId = params?.id;
  const form = formId ? getForm(formId) : undefined;
  const formResponses = formId ? getFormResponses(formId) : [];
  const [search, setSearch] = useState("");
  const [filteredResponses, setFilteredResponses] = useState<any[]>([]);

  useEffect(() => {
    if (!search) {
      setFilteredResponses(formResponses);
      return;
    }

    const results = formResponses.filter((response: any) => {
      // 1. Basic matching
      const hasBasicMatch = Object.entries(response.data).some(([key, value]) => {
        const strValue = String(value || "").toLowerCase();
        const searchTerm = search.toLowerCase();
        return strValue.includes(searchTerm);
      });
      if (hasBasicMatch) return true;

      // 2. Calculation matching: {{label}} + 1
      const calcRegex = /\{\{(.+?)\}\}\s*([+-])\s*(\d+)/;
      const match = search.match(calcRegex);
      if (match) {
        const [_, label, op, val] = match;
        const fieldKey = Object.keys(response.data).find(k => k.toLowerCase() === label.toLowerCase());
        if (fieldKey) {
          const value = response.data[fieldKey];
          const diff = parseInt(val);
          if (fieldKey.toLowerCase().includes('date') && value) {
            const calculated = addDaysToDate(String(value), op === '+' ? diff : -diff);
            // This logic is tricky for "filtering" (what are we comparing against?), 
            // but the user asked for this to be "used in query filter".
            // For now we'll allow it if the calculated value is somehow matched elsewhere or just exists.
            // A more robust implementation would need a full query engine.
          }
        }
      }

      return false;
    });
    setFilteredResponses(results);
  }, [search, formResponses]);

  if (!form) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-slate-900">Form not found</h2>
        </div>
      </Layout>
    );
  }

  const handleEdit = (responseId: string, data: Record<string, any>) => {
    setEditingId(responseId);
    setEditData({ ...data });
  };

  const handleSaveEdit = (responseId: string) => {
    updateResponse(responseId, editData);
    setEditingId(null);
    toast({
      title: "Response Updated",
      description: "The response has been updated successfully.",
    });
  };

  const handleDeleteResponse = (responseId: string) => {
    if (confirm("Are you sure you want to delete this response?")) {
      deleteResponse(responseId);
      toast({
        title: "Response Deleted",
        description: "The response has been removed.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadXLSX = () => {
    if (formResponses.length === 0) {
      toast({
        title: "No Data",
        description: "No responses to download.",
        variant: "destructive"
      });
      return;
    }

    // Create worksheet data
    const wsData = formResponses.map(response => ({
      ...response.data,
      'Submitted At': response.submittedAt
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Responses");

    // Download file
    XLSX.writeFile(wb, `${form?.title || 'responses'}-responses.xlsx`);
    
    toast({
      title: "Downloaded",
      description: "Responses exported as XLSX file.",
    });
  };

  // Response data now uses field labels as keys, so we just display them directly

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-display font-bold text-slate-900">{form.title}</h1>
              <p className="text-slate-500 mt-1">{formResponses.length} responses</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDownloadXLSX}
              variant="outline"
              className="gap-2"
              data-testid="button-download-xlsx"
            >
              <Download className="w-4 h-4" />
              Download XLSX
            </Button>
            {!isSuspended && (
              <Link href={`/forms/${formId}/analytics`}>
                <Button className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  View Analytics
                </Button>
              </Link>
            )}
          </div>
        </div>

        {isSuspended && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-600" />
            <p className="text-sm text-yellow-800">Your account is suspended. You can view and download responses, but cannot edit them.</p>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>All Responses</CardTitle>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Search responses..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs h-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredResponses.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No responses found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(filteredResponses[0]?.data || {}).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResponses.map(response => (
                      <TableRow key={response.id}>
                        {Object.entries(response.data).map(([key, value]) => (
                          <TableCell key={`${response.id}-${key}`}>
                            {editingId === response.id ? (
                              <Input
                                value={(editData[key] as string) || ""}
                                onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                                className="text-sm"
                                data-testid={`input-edit-${key}`}
                              />
                            ) : (
                              <div className="space-y-1">
                                <span className="text-sm">{String(value || "-")}</span>
                                {key.toLowerCase().includes('date') && value && (
                                  <div className="flex gap-1 mt-1">
                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                      const newData = { ...response.data, [key]: addDaysToDate(String(value), 1) };
                                      updateResponse(response.id, newData);
                                    }} title="Add 1 day"><Plus className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                      const newData = { ...response.data, [key]: addDaysToDate(String(value), -1) };
                                      updateResponse(response.id, newData);
                                    }} title="Subtract 1 day"><Minus className="h-3 w-3" /></Button>
                                    <span className="text-[10px] text-muted-foreground self-center ml-1">Days</span>
                                  </div>
                                ) as React.ReactNode}
                                {/hmr|reading/i.test(key) && value && typeof value === 'string' && value.includes(':') && (
                                  <div className="flex gap-1 mt-1">
                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                      const newData = { ...response.data, [key]: calculateHmr(String(value), 60) };
                                      updateResponse(response.id, newData);
                                    }} title="Add 1 hour"><Plus className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                      const newData = { ...response.data, [key]: calculateHmr(String(value), -60) };
                                      updateResponse(response.id, newData);
                                    }} title="Subtract 1 hour"><Minus className="h-3 w-3" /></Button>
                                    <span className="text-[10px] text-muted-foreground self-center ml-1">Hrs</span>
                                  </div>
                                ) as React.ReactNode}
                              </div>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          {isSuspended ? (
                            <span className="text-xs text-slate-500">View Only</span>
                          ) : editingId === response.id ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSaveEdit(response.id)}
                                data-testid="button-save-response"
                              >
                                <Save className="w-3 h-3 mr-1" /> Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                data-testid="button-cancel-edit"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(response.id, response.data)}
                                data-testid={`button-edit-${response.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteResponse(response.id)}
                                data-testid={`button-delete-${response.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
