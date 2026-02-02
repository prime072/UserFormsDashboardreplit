import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  ArrowLeft,
  Share2,
  Download,
  FileJson,
  File,
  Plus,
  Minus,
} from "lucide-react";
import {
  generateExcel,
  generateDocx,
  generatePdf,
  generateWhatsAppShareMessage,
  useForms,
} from "@/lib/form-context";
import { useState, useEffect } from "react";
import { addDaysToDate, calculateHmr } from "@shared/schema";
import { Label } from "@/components/ui/label";

export default function SubmissionConfirmation() {
  const [match, params] = useRoute("/s/:id/confirmation/:submissionId");
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedLookups, setResolvedLookups] = useState<
    Record<string, string>
  >({});
  const { resolveLookup } = useForms();

  const formId = params?.id;
  const submissionId = params?.submissionId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formRes, responseRes] = await Promise.all([
          fetch(`/api/forms/${formId}`),
          fetch(`/api/responses/${submissionId}`),
        ]);
        if (formRes.ok) {
          const formData = await formRes.json();
          setForm(formData);
        }
        if (responseRes.ok) {
          const resData = await responseRes.json();
          setResponse(resData);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (formId && submissionId) fetchData();
  }, [formId, submissionId]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  if (!form || !response)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Not Found
      </div>
    );

  return <SubmissionConfirmationContent form={form} response={response} resolveLookup={resolveLookup} submissionId={submissionId} />;
}

function SubmissionConfirmationContent({ form, response: initialResponse, resolveLookup, submissionId }: { form: any, response: any, resolveLookup: any, submissionId?: string }) {
  const [resolvedLookups, setResolvedLookups] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();
  const [response, setResponse] = useState(initialResponse);
  const { updateResponse } = useForms();
  const data = response.data;
  const grid = form.gridConfig;

  const handleUpdate = (newData: any) => {
    setResponse({ ...response, data: newData });
    if (submissionId) {
      updateResponse(submissionId, newData);
      fetch(`/api/responses/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
    }
  };

  useEffect(() => {
    const fetchLookups = async () => {
      if (!grid || !grid.rows) return;
      const lookups: Record<string, string> = {};
      const allCells: any[] = [];
      grid.rows.forEach((r: any) => r.cells.forEach((c: any) => allCells.push(c)));

      for (const cell of allCells) {
        if (cell.type === "lookup" && cell.lookupConfig) {
          try {
            const val = await resolveLookup(cell.lookupConfig, data);
            lookups[cell.id] = val;
          } catch (err) {
            lookups[cell.id] = "0";
          }
        }
      }

      const resolveFormula = (expression: string): string => {
        let evaluated = expression;
        Object.entries(data).forEach(([key, val]) => {
          const numericVal = isNaN(Number(val)) ? 0 : Number(val);
          evaluated = evaluated.replace(new RegExp(`{{${key}}}`, "g"), String(numericVal));
        });
        Object.entries(lookups).forEach(([id, val]) => {
          const numericVal = isNaN(Number(val)) ? 0 : Number(val);
          evaluated = evaluated.replace(new RegExp(`\\[\\[${id}\\]\\]`, "g"), String(numericVal));
        });
        try {
          const cleanExpr = evaluated.replace(/[^0-9+\-*/().\s]/g, "");
          if (!cleanExpr) return "0";
          const result = Function(`"use strict"; return (${cleanExpr})`)();
          return isNaN(result) || !isFinite(result) ? "0" : String(result);
        } catch (e) {
          console.error("Formula eval error:", e);
          return "0";
        }
      };

      for (const cell of allCells) {
        if (cell.type === "formula" && cell.formulaConfig) {
          const rawVal = resolveFormula(cell.formulaConfig.expression);
          const precision = cell.formulaConfig.precision ?? 2;
          lookups[cell.id] = parseFloat(rawVal).toFixed(precision);
        }
      }
      setResolvedLookups(lookups);
    };
    fetchLookups();
  }, [grid, resolveLookup, data]);

  const replaceVars = (text: string) => {
    let result = text || "";
    Object.entries(data).forEach(([key, val]) => {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), String(val));
    });
    return result;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-t-4 border-t-green-500 shadow-xl">
        <CardHeader className="text-center pb-8 border-b">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold">
            Submission Confirmed!
          </CardTitle>
          <p className="text-slate-500">Thank you for your response.</p>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          {form.confirmationStyle === "paragraph" ? (
            <div className="bg-white p-6 rounded-lg border leading-relaxed whitespace-pre-wrap">
              {replaceVars(form.confirmationText)}
            </div>
          ) : (
            <div className="space-y-4">
              {grid?.textAbove && (
                <p className="text-slate-600 whitespace-pre-wrap">
                  {replaceVars(grid.textAbove)}
                </p>
              )}
              <div className="overflow-x-auto border rounded-lg bg-white">
                {grid && grid.headers?.length > 0 ? (
                  <table className="w-full border-collapse">
                    <thead>
                      {grid.tableName && (
                        <tr className="bg-slate-100">
                          <th
                            colSpan={grid.headers.length}
                            className="p-4 border-b text-center font-bold text-lg text-slate-900"
                          >
                            {replaceVars(grid.tableName)}
                          </th>
                        </tr>
                      )}
                      {grid.showHeaders !== false && (
                        <tr
                          style={{
                            backgroundColor: grid.headerColor || "#f8fafc",
                          }}
                        >
                          {grid.headers.map((h: any, i: number) => (
                            <th
                              key={i}
                              className="p-3 border-b border-r text-left text-sm font-bold last:border-r-0"
                              style={{
                                color: grid.headerTextColor || "#334155",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {grid.rows.map((row: any) => (
                        <tr
                          key={row.id}
                          className={
                            row.isFooter ? "bg-slate-50 font-semibold" : ""
                          }
                        >
                          {row.cells.map((cell: any) => {
                            let val = cell.value;
                            if (cell.type === "variable") {
                              val = String(data[cell.value] || "");
                            } else if (cell.type === "lookup" || cell.type === "formula") {
                              val = resolvedLookups[cell.id] || "Loading...";
                            }
                            return (
                              <td
                                key={cell.id}
                                className="p-3 border-b border-r text-sm last:border-r-0"
                                colSpan={cell.colspan || 1}
                                style={{
                                  backgroundColor: cell.color,
                                  color: cell.textColor || "#475569",
                                  fontSize: `${cell.fontSize || 14}px`,
                                  fontWeight: cell.bold
                                    ? "bold"
                                    : row.isFooter
                                      ? "semibold"
                                      : "normal",
                                  fontStyle: cell.italic ? "italic" : "normal",
                                }}
                              >
                                <div className="space-y-1">
                                  <span>{val}</span>
                                  {cell.type === "variable" && (
                                    <>
                                      {!!(cell.value.toLowerCase().includes('date') && val) && (
                                        <div className="flex gap-1 mt-1">
                                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                            const newData = { ...data, [cell.value]: addDaysToDate(String(val), 1) };
                                            handleUpdate(newData);
                                          }} title="Add 1 day"><Plus className="h-3 w-3" /></Button>
                                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                            const newData = { ...data, [cell.value]: addDaysToDate(String(val), -1) };
                                            handleUpdate(newData);
                                          }} title="Subtract 1 day"><Minus className="h-3 w-3" /></Button>
                                        </div>
                                      )}
                                      {!!(/hmr|reading/i.test(cell.value) && val && typeof val === 'string' && val.includes(':')) && (
                                        <div className="flex gap-1 mt-1">
                                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                            const newData = { ...data, [cell.value]: calculateHmr(String(val), 60) };
                                            handleUpdate(newData);
                                          }} title="Add 1 hour"><Plus className="h-3 w-3" /></Button>
                                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                                            const newData = { ...data, [cell.value]: calculateHmr(String(val), -60) };
                                            handleUpdate(newData);
                                          }} title="Subtract 1 hour"><Minus className="h-3 w-3" /></Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 space-y-2">
                    {Object.entries(data).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex flex-col border-b pb-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{key}:</span>
                          <span>{String(val)}</span>
                        </div>
                        {!!(key.toLowerCase().includes('date') && val) && (
                          <div className="flex gap-1 mt-1">
                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                              const newData = { ...data, [key]: addDaysToDate(String(val), 1) };
                              handleUpdate(newData);
                            }} title="Add 1 day"><Plus className="h-3 w-3" /></Button>
                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                              const newData = { ...data, [key]: addDaysToDate(String(val), -1) };
                              handleUpdate(newData);
                            }} title="Subtract 1 day"><Minus className="h-3 w-3" /></Button>
                          </div>
                        )}
                        {!!(/hmr|reading/i.test(key) && val && typeof val === 'string' && val.includes(':')) && (
                          <div className="flex gap-1 mt-1">
                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                              const newData = { ...data, [key]: calculateHmr(String(val), 60) };
                              handleUpdate(newData);
                            }} title="Add 1 hour"><Plus className="h-3 w-3" /></Button>
                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                              const newData = { ...data, [key]: calculateHmr(String(val), -60) };
                              handleUpdate(newData);
                            }} title="Subtract 1 hour"><Minus className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {grid?.textBelow && (
                <p className="text-slate-600 whitespace-pre-wrap">
                  {replaceVars(grid.textBelow)}
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {form.outputFormats?.includes("excel") && (
              <Button
                variant="outline"
                onClick={() => generateExcel(form.title, data)}
              >
                <Download className="w-4 h-4 mr-2" /> Excel
              </Button>
            )}
            {form.outputFormats?.includes("pdf") && (
              <Button
                variant="outline"
                onClick={() =>
                  generatePdf(
                    form.title,
                    data,
                    undefined,
                    form.gridConfig,
                    resolveLookup,
                    resolvedLookups
                  )
                }
              >
                <File className="w-4 h-4 mr-2" /> PDF
              </Button>
            )}
            {form.outputFormats?.includes("docx") && (
              <Button
                variant="outline"
                onClick={() =>
                  generateDocx(
                    form.title,
                    data,
                    undefined,
                    form.gridConfig,
                    resolveLookup,
                    resolvedLookups
                  )
                }
              >
                <FileJson className="w-4 h-4 mr-2" /> Word
              </Button>
            )}
            {form.outputFormats?.includes("whatsapp") && (
              <Button
                variant="outline"
                className="text-green-600 border-green-200"
                onClick={async () => {
                  const msg = await generateWhatsAppShareMessage(
                    form.title,
                    data,
                    window.location.href,
                    form.whatsappFormat,
                    form.gridConfig,
                    resolveLookup,
                    resolvedLookups
                  );
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
                }}
              >
                <Share2 className="w-4 h-4 mr-2" /> WhatsApp
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {form.allowEditing !== false && (
              <Button 
                variant="outline" 
                className="w-full border-primary text-primary hover:bg-primary/5"
                onClick={() => setLocation(`/s/${form.id}?edit=${submissionId}`)}
              >
                Edit Your Response
              </Button>
            )}
            <Button 
              className="w-full" 
              onClick={() => setLocation(`/s/${form.id}`)}
            >
              Submit Another Response
            </Button>
            {form.gridConfig?.rows?.some((r: any) => r.cells.some((c: any) => c.type === 'link_button')) && (
              <div className="pt-4 border-t flex flex-col gap-2">
                <Label className="text-xs text-slate-500 text-center">Quick Links</Label>
                {form.gridConfig.rows.map((r: any) => r.cells.map((c: any) => c.type === 'link_button' && (
                  <Button 
                    key={c.id}
                    variant="ghost" 
                    className="w-full text-primary"
                    onClick={() => window.open(`/s/${c.value}`, '_blank')}
                  >
                    {c.placeholder || "Open Form"}
                  </Button>
                )))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
