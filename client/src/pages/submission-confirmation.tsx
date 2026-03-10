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
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  generateExcel,
  generateDocx,
  generatePdf,
  generateWhatsAppShareMessage,
  useForms,
} from "@/lib/form-context";
import { useState, useEffect } from "react";
import { addDaysToDate, calculateHmr, hmrToMinutes, minutesToHmr } from "@shared/schema";

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

function SubmissionConfirmationContent({ form, response, resolveLookup, submissionId }: { form: any, response: any, resolveLookup: any, submissionId?: string }) {
  const [resolvedLookups, setResolvedLookups] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();
  const data = response.data;
  const grid = form.gridConfig;

  useEffect(() => {
    const fetchLookups = async () => {
      if (!grid || !grid.rows) return;
      const lookups: Record<string, string> = {};
      const allCells: any[] = [];
      grid.rows.forEach((r: any) => r.cells.forEach((c: any) => allCells.push(c)));

      // First pass: Resolve lookups
      for (const cell of allCells) {
        if (cell.type === "lookup" && cell.lookupConfig) {
          try {
            const val = await resolveLookup(cell.lookupConfig, data, lookups);
            lookups[cell.id] = val;
          } catch (err) {
            lookups[cell.id] = "0";
          }
        }
      }

      // Add calculation lookups support
      for (const cell of allCells) {
        if ((cell.type === "date_calc" || cell.type === "hmr_calc") && cell.calcConfig) {
          if (cell.calcConfig.lookup1) {
            try {
              const val = await resolveLookup(cell.calcConfig.lookup1, data, lookups);
              lookups[`${cell.id}_lk1`] = val;
            } catch (err) {
              lookups[`${cell.id}_lk1`] = "0";
            }
          }
          if (cell.calcConfig.lookup2) {
            try {
              const val = await resolveLookup(cell.calcConfig.lookup2, data, lookups);
              lookups[`${cell.id}_lk2`] = val;
            } catch (err) {
              lookups[`${cell.id}_lk2`] = "0";
            }
          }
        }
      }

      // Second pass: Resolve formulas
      const resolveFormula = (expression: string): string => {
        let evaluated = expression;
        
        // Replace variables {{Field}}
        Object.entries(data).forEach(([key, val]) => {
          // Ensure we treat numeric strings as numbers in eval
          const numericVal = isNaN(Number(val)) ? 0 : Number(val);
          evaluated = evaluated.replace(new RegExp(`{{${key}}}`, "g"), String(numericVal));
        });

        // Replace lookup references [[CellID]]
        Object.entries(lookups).forEach(([id, val]) => {
          const numericVal = isNaN(Number(val)) ? 0 : Number(val);
          evaluated = evaluated.replace(new RegExp(`\\[\\[${id}\\]\\]`, "g"), String(numericVal));
        });

        try {
          // Basic math evaluation safely
          // Remove any non-math characters for security
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
        } else if (cell.type === "date_calc" && cell.calcConfig) {
          let val1 = data[cell.calcConfig.field1];
          if (String(cell.calcConfig.field1).startsWith('[[')) {
            const refId = String(cell.calcConfig.field1).replace(/[\[\]]/g, '');
            val1 = lookups[refId];
          } else if (cell.calcConfig.lookup1) {
            val1 = lookups[`${cell.id}_lk1`];
          }

          if (val1) {
            if (cell.calcConfig.field2 !== undefined) {
              let val2 = data[cell.calcConfig.field2];
              if (String(cell.calcConfig.field2).startsWith('[[')) {
                const refId = String(cell.calcConfig.field2).replace(/[\[\]]/g, '');
                val2 = lookups[refId];
              } else if (cell.calcConfig.lookup2) {
                val2 = lookups[`${cell.id}_lk2`];
              }

              if (val1 && val2) {
                const d1 = new Date(val1);
                const d2 = new Date(val2);
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                  const diff = Math.round((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
                  lookups[cell.id] = String(cell.calcConfig.operator === "+" ? diff : -diff);
                } else {
                  lookups[cell.id] = "Invalid Date";
                }
              }
            } else {
              const amount = parseInt(cell.calcConfig.value || "1");
              lookups[cell.id] = addDaysToDate(val1, cell.calcConfig.operator === "+" ? amount : -amount);
            }
          }
        } else if (cell.type === "hmr_calc" && cell.calcConfig) {
          let val1 = data[cell.calcConfig.field1];
          if (String(cell.calcConfig.field1).startsWith('[[')) {
            const refId = String(cell.calcConfig.field1).replace(/[\[\]]/g, '');
            val1 = lookups[refId];
          } else if (cell.calcConfig.lookup1) {
            val1 = lookups[`${cell.id}_lk1`];
          }

          if (val1) {
            if (cell.calcConfig.field2 !== undefined) {
              let val2 = data[cell.calcConfig.field2];
              if (String(cell.calcConfig.field2).startsWith('[[')) {
                const refId = String(cell.calcConfig.field2).replace(/[\[\]]/g, '');
                val2 = lookups[refId];
              } else if (cell.calcConfig.lookup2) {
                val2 = lookups[`${cell.id}_lk2`];
              }

              if (val1 && val2) {
                const m1 = hmrToMinutes(String(val1));
                const m2 = hmrToMinutes(String(val2));
                const diff = cell.calcConfig.operator === "+" ? m1 + m2 : m1 - m2;
                lookups[cell.id] = minutesToHmr(diff);
              }
            } else {
              const amount = parseInt(cell.calcConfig.value || "1");
              const minutes = cell.calcConfig.unit === "minutes" ? amount : amount * 60;
              lookups[cell.id] = calculateHmr(String(val1), cell.calcConfig.operator === "+" ? minutes : -amount);
            }
          }
        }
      }

      setResolvedLookups(lookups);
    };
    fetchLookups();
  }, [grid, resolveLookup, data]);

  const replaceVars = (text: string) => {
    let result = text || "";
    Object.entries(data).forEach(([key, val]) => {
      let displayVal = String(val || "");
      if (Array.isArray(val)) {
        displayVal = val
          .map((item: any) =>
            Object.entries(item)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", "),
          )
          .join("\n");
      }
      result = result.replace(new RegExp(`{{${key}}}`, "g"), displayVal);
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
                              const rawVal = data[cell.value];
                              if (Array.isArray(rawVal)) {
                                // Handle Repeater Data in table display
                                val = (
                                  <div className="space-y-1">
                                    {rawVal.map((item: any, idx: number) => (
                                      <div key={idx} className="text-xs border-b last:border-0 pb-1 mb-1">
                                        {Object.entries(item).map(([k, v]) => (
                                          <div key={k}><span className="font-semibold">{k}:</span> {String(v)}</div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                );
                              } else {
                                val = String(rawVal || "");
                              }
                            } else if (cell.type === "lookup" || cell.type === "formula" || cell.type === "date_calc" || cell.type === "hmr_calc") {
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
                                {val}
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
                        className="flex justify-between border-b pb-2"
                      >
                        <span className="font-medium">{key}:</span>
                        <span>
                          {Array.isArray(val) ? (
                            <div className="text-right space-y-1">
                              {val.map((item: any, idx: number) => (
                                <div key={idx} className="text-xs text-slate-500">
                                  {Object.entries(item)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(", ")}
                                </div>
                              ))}
                            </div>
                          ) : (
                            String(val)
                          )}
                        </span>
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
