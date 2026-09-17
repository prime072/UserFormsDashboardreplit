import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/layout";
import { useForms } from "@/lib/form-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Edit, Trash2, Save, X, BarChart3, Download, Lock, Share2, Eye } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  generateDocx,
  generateExcel,
  generatePdf,
  generateResponsesDocx,
  generateResponsesDocxCustom,
  generateResponsesExcel,
  generateResponsesPdf,
  generateResponsesPdfCustom,
  generateResponsesWhatsAppMessage,
  generateWhatsAppShareMessage,
  resolveFormGridLookups,
} from "@/lib/form-context";

export default function ResponsesView() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/forms/:id/responses");
  const { toast } = useToast();
  const { user, isSuspended } = useAuth();
  const { getForm, updateResponse, deleteResponse, resolveLookup } = useForms();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [responses, setResponses] = useState<any[]>([]);

  const formId = params?.id;
  const form = formId ? getForm(formId) : undefined;
  const [search, setSearch] = useState("");
  const [filteredResponses, setFilteredResponses] = useState<any[]>([]);

  const loadResponses = async () => {
    if (!formId) return;
    try {
      const privateUser = JSON.parse(sessionStorage.getItem("private_user") || "null");
      const headers: Record<string, string> = {};
      if (user?.id) headers["x-user-id"] = user.id;
      if (privateUser?.userId) headers["x-private-user-id"] = privateUser.userId;

      const response = await fetch(`/api/forms/${formId}/responses`, { headers });
      if (response.ok) {
        const data = await response.json();
        setResponses(data);
        setFilteredResponses(data);
      }
    } catch (error) {
      console.error("Error fetching responses:", error);
    }
  };

  useEffect(() => {
    loadResponses();
  }, [formId, user?.id]);

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

  const handleSaveEdit = async (responseId: string) => {
    try {
      await updateResponse(responseId, editData);
      await loadResponses();
      setEditingId(null);
      toast({
        title: "Response Updated",
        description: "The response has been saved to the database.",
      });
    } catch (error) {
      console.error("Error updating response:", error);
      toast({
        title: "Update Failed",
        description: "The response could not be saved.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (confirm("Are you sure you want to delete this response?")) {
      try {
        await deleteResponse(responseId);
        await loadResponses();
        toast({
          title: "Response Deleted",
          description: "The response has been removed from the database.",
          variant: "destructive"
        });
      } catch (error) {
        console.error("Error deleting response:", error);
        toast({
          title: "Delete Failed",
          description: "The response could not be deleted.",
          variant: "destructive",
        });
      }
    }
  };

  const handleReportOutput = async (
    format: "excel" | "docx" | "pdf" | "whatsapp",
    response: any,
  ) => {
    try {
      if (format === "excel") {
        await generateExcel(form.title, response.data);
      } else if (format === "docx") {
        await generateDocx(form, response.data);
      } else if (format === "pdf") {
        await generatePdf(form, response.data);
      } else {
        const message = await generateWhatsAppShareMessage(form, response.data);
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      }
    } catch (error) {
      console.error("Error generating response report:", error);
      toast({
        title: "Report Error",
        description: "The report could not be generated.",
        variant: "destructive",
      });
    }
  };

  const handleAllResponsesOutput = async (
    format: "excel" | "docx" | "pdf" | "whatsapp",
  ) => {
    if (responses.length === 0) {
      toast({
        title: "No Data",
        description: "There are no responses to export.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (format === "excel") {
        await generateResponsesExcel(form.title, responses);
      } else if (format === "docx") {
        await generateResponsesDocx(form, responses);
      } else if (format === "pdf") {
        await generateResponsesPdf(form, responses);
      } else {
        const message = await generateResponsesWhatsAppMessage(form, responses);
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      }
      toast({
        title: "Report Generated",
        description: "The collective report is ready.",
      });
    } catch (error) {
      console.error("Error generating collective report:", error);
      toast({
        title: "Report Error",
        description: "The collective report could not be generated.",
        variant: "destructive",
      });
    }
  };

  const handleCustomAllResponsesOutput = async (format: "docx" | "pdf") => {
    if (responses.length === 0) {
      toast({
        title: "No Data",
        description: "There are no responses to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const resolvedLookupsByResponse: Record<number, Record<number, Record<string, string>>> = {};
      for (let index = 0; index < responses.length; index++) {
        resolvedLookupsByResponse[index] = await resolveFormGridLookups(
          form,
          responses[index].data || {},
          resolveLookup,
        );
      }

      if (format === "docx") {
        await generateResponsesDocxCustom(form, responses, resolvedLookupsByResponse);
      } else {
        await generateResponsesPdfCustom(form, responses, resolvedLookupsByResponse);
      }

      toast({
        title: "Custom Report Generated",
        description: "The collective custom-layout report is ready.",
      });
    } catch (error) {
      console.error("Error generating collective custom report:", error);
      toast({
        title: "Report Error",
        description: "The collective custom-layout report could not be generated.",
        variant: "destructive",
      });
    }
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
              <p className="text-slate-500 mt-1">{responses.length} responses</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                All responses
              </span>
              {form.outputFormats?.includes("excel") && (
                <Button
                  onClick={() => handleAllResponsesOutput("excel")}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-download-all-excel"
                >
                  <Download className="w-4 h-4" /> Excel
                </Button>
              )}
              {form.outputFormats?.includes("docx") && (
                <>
                  <Button
                    onClick={() => handleAllResponsesOutput("docx")}
                    variant="outline"
                    data-testid="button-download-all-word"
                  >
                    Word
                  </Button>
                  <Button
                    onClick={() => handleCustomAllResponsesOutput("docx")}
                    variant="outline"
                    data-testid="button-download-all-word-custom"
                  >
                    Word Custom
                  </Button>
                </>
              )}
              {form.outputFormats?.includes("pdf") && (
                <>
                  <Button
                    onClick={() => handleAllResponsesOutput("pdf")}
                    variant="outline"
                    data-testid="button-download-all-pdf"
                  >
                    PDF
                  </Button>
                  <Button
                    onClick={() => handleCustomAllResponsesOutput("pdf")}
                    variant="outline"
                    data-testid="button-download-all-pdf-custom"
                  >
                    PDF Custom
                  </Button>
                </>
              )}
              {form.outputFormats?.includes("whatsapp") && (
                <Button
                  onClick={() => handleAllResponsesOutput("whatsapp")}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-share-all-whatsapp"
                >
                  <Share2 className="w-4 h-4" /> WhatsApp
                </Button>
              )}
            </div>
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

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search responses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-8"
          />
        </div>
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
                            value={editData[key] || ""}
                            onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                            className="text-sm"
                            data-testid={`input-edit-${key}`}
                          />
                        ) : (
                          <div>
                            <span className="text-sm">{String(value || "-")}</span>
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
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Link href={`/s/${form.id}/confirmation/${response.id}`}>
                            <Button size="sm" variant="outline" className="gap-1" data-testid={`button-view-report-${response.id}`}>
                              <Eye className="w-3 h-3" /> Report
                            </Button>
                          </Link>
                          {form.outputFormats?.includes("excel") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportOutput("excel", response)}
                              data-testid={`button-excel-${response.id}`}
                            >
                              Excel
                            </Button>
                          )}
                          {form.outputFormats?.includes("docx") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportOutput("docx", response)}
                              data-testid={`button-word-${response.id}`}
                            >
                              Word
                            </Button>
                          )}
                          {form.outputFormats?.includes("pdf") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportOutput("pdf", response)}
                              data-testid={`button-pdf-${response.id}`}
                            >
                              PDF
                            </Button>
                          )}
                          {form.outputFormats?.includes("whatsapp") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportOutput("whatsapp", response)}
                              data-testid={`button-whatsapp-${response.id}`}
                            >
                              <Share2 className="w-3 h-3" />
                            </Button>
                          )}
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
      </div>
    </Layout>
  );
}
