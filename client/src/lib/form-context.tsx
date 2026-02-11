import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { formatDistanceToNow } from "date-fns";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  AlignmentType,
  TextRun,
} from "docx";
import jsPDF from "jspdf";
import { useAuth } from "./auth-context";

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "textarea"
  | "checkbox"
  | "select"
  | "radio"
  | "date"
  | "hmr"
  | "file"
  | "link_button";
export type OutputFormat = "thank_you" | "whatsapp" | "excel" | "docx" | "pdf";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface FormTableCell {
  id: string;
  type: "text" | "variable" | "lookup" | "formula" | "hmr_calc" | "date_calc" | "link_button";
  value: string;
  calcConfig?: {
    field1: string; // Label of field 1 OR [[CellID]]
    field2?: string; // Label of field 2 OR [[CellID]]
    operator: "+" | "-";
    value?: string; // Constant value (e.g. "1" day)
    unit?: "days" | "hours" | "minutes";
    lookup1?: { formId: string; fieldId: string; lookupType: string; nthIndex?: number; queryField?: string; queryValue?: string };
    lookup2?: { formId: string; fieldId: string; lookupType: string; nthIndex?: number; queryField?: string; queryValue?: string };
  };
  formulaConfig?: {
    expression: string;
    precision?: number;
  };
  lookupConfig?: {
    formId: string;
    fieldId: string;
    lookupType: "first" | "last" | "nth" | "query";
    nthIndex?: number;
    queryField?: string;
    queryValue?: string;
  };
  placeholder?: string;
  color?: string;
  textColor?: string;
  fontSize?: number;
  fontStyle?: string;
  bold?: boolean;
  italic?: boolean;
  colspan?: number;
}

export interface FormTableRow {
  id: string;
  cells: FormTableCell[];
  isFooter?: boolean;
}

export interface GridConfig {
  tableName?: string;
  textAbove?: string;
  textBelow?: string;
  headers: string[];
  showHeaders?: boolean;
  headerColor?: string;
  headerTextColor?: string;
  rows: FormTableRow[];
}

export type TableVariable = any;

export interface Form {
  id: string;
  title: string;
  status: "Active" | "Draft" | "Archived";
  responses: number;
  lastUpdated: string;
  fields: FormField[];
  outputFormats?: OutputFormat[];
  visibility?: "public" | "private";
  confirmationStyle: "table" | "paragraph";
  confirmationText?: string;
  gridConfig?: GridConfig;
  whatsappFormat?: string;
  allowEditing?: boolean;
}

export interface FormResponse {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: string;
}

type FormContextType = {
  forms: Form[];
  responses: FormResponse[];
  addForm: (
    title: string,
    fields: FormField[],
    outputFormats?: OutputFormat[],
    visibility?: "public" | "private",
    confirmationStyle?: "table" | "paragraph",
    confirmationText?: string,
    tableConfig?: any[],
    whatsappFormat?: string,
    gridConfig?: GridConfig,
    allowEditing?: boolean,
  ) => Promise<void>;
  updateForm: (
    id: string,
    title: string,
    fields: FormField[],
    outputFormats?: OutputFormat[],
    visibility?: "public" | "private",
    confirmationStyle?: "table" | "paragraph",
    confirmationText?: string,
    tableConfig?: any[],
    whatsappFormat?: string,
    gridConfig?: GridConfig,
    allowEditing?: boolean,
  ) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  getForm: (id: string) => Form | undefined;
  submitResponse: (
    formId: string,
    data: any,
  ) => Promise<{ submissionId: string }>;
  getFormResponses: (formId: string) => FormResponse[];
  updateResponse: (responseId: string, data: Record<string, any>) => void;
  deleteResponse: (responseId: string) => void;
  fetchFormResponses: (formId: string) => Promise<void>;
  resolveLookup: (
    lookupConfig: {
      formId: string;
      fieldId: string;
      lookupType: "first" | "last" | "nth" | "query";
      nthIndex?: number;
      queryField?: string;
      queryValue?: string;
    },
    currentFormData?: Record<string, any>,
    cellValues?: Record<string, string>,
  ) => Promise<string>;
};

const FormContext = createContext<FormContextType | null>(null);

export function FormProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);

  useEffect(() => {
    if (user) {
      fetchForms();
      fetchAllResponses();
    }
  }, [user]);

  const fetchForms = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/forms", {
        headers: {
          "x-user-id": user.id,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setForms(data);
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
    }
  };

  const fetchAllResponses = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/user/responses", {
        headers: {
          "x-user-id": user.id,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setResponses(data);
      }
    } catch (error) {
      console.error("Error fetching all responses:", error);
    }
  };

  const addForm = async (
    title: string,
    fields: FormField[],
    outputFormats?: OutputFormat[],
    visibility?: "public" | "private",
    confirmationStyle: "table" | "paragraph" = "table",
    confirmationText?: string,
    tableConfig?: any[],
    whatsappFormat?: string,
    gridConfig?: GridConfig,
    allowEditing: boolean = true,
  ) => {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          title,
          fields,
          outputFormats: outputFormats || ["thank_you"],
          visibility: visibility || "public",
          confirmationStyle,
          confirmationText,
          tableConfig,
          whatsappFormat,
          gridConfig,
          allowEditing,
        }),
      });
      if (response.ok) {
        const newForm = await response.json();
        setForms([newForm, ...forms]);
      }
    } catch (error) {
      console.error("Error creating form:", error);
    }
  };

  const updateForm = async (
    id: string,
    title: string,
    fields: FormField[],
    outputFormats?: OutputFormat[],
    visibility?: "public" | "private",
    confirmationStyle: "table" | "paragraph" = "table",
    confirmationText?: string,
    tableConfig?: any[],
    whatsappFormat?: string,
    gridConfig?: GridConfig,
    allowEditing: boolean = true,
  ) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/forms/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          title,
          fields,
          outputFormats: outputFormats || ["thank_you"],
          visibility: visibility || "public",
          confirmationStyle,
          confirmationText,
          tableConfig,
          whatsappFormat,
          gridConfig,
          allowEditing,
        }),
      });
      if (response.ok) {
        const updatedForm = await response.json();
        setForms(forms.map((f) => (f.id === id ? updatedForm : f)));
      }
    } catch (error) {
      console.error("Error updating form:", error);
    }
  };

  const deleteForm = async (id: string) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/forms/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user.id,
        },
      });
      if (response.ok) {
        const updatedForms = forms.filter((f) => f.id !== id);
        setForms(updatedForms);

        const updatedResponses = responses.filter((r) => r.formId !== id);
        setResponses(updatedResponses);
      }
    } catch (error) {
      console.error("Error deleting form:", error);
    }
  };

  const getForm = (id: string) => {
    return forms.find((f) => f.id === id);
  };

  const submitResponse = async (formId: string, data: any) => {
    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, data }),
      });

      if (!response.ok) throw new Error("Failed to submit response");

      const newResponse = await response.json();

      const updatedForms = forms.map((f) =>
        f.id === formId
          ? {
              ...f,
              responses: f.responses + 1,
              lastUpdated: new Date().toISOString(),
            }
          : f,
      );
      setForms(updatedForms);

      const updatedResponses = [newResponse, ...responses];
      setResponses(updatedResponses);

      return { submissionId: newResponse.id };
    } catch (error) {
      console.error("Error submitting response:", error);
      throw error;
    }
  };

  const getFormResponses = (formId: string) => {
    return responses.filter((r) => r.formId === formId);
  };

  const fetchFormResponses = async (formId: string) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/forms/${formId}/responses`, {
        headers: { "x-user-id": user.id },
      });
      if (response.ok) {
        const data = await response.json();
        setResponses(data);
      }
    } catch (error) {
      console.error("Error fetching form responses:", error);
    }
  };

  const updateResponse = (responseId: string, data: Record<string, any>) => {
    const updatedResponses = responses.map((r) =>
      r.id === responseId ? { ...r, data } : r,
    );
    setResponses(updatedResponses);
  };

  const deleteResponse = (responseId: string) => {
    const response = responses.find((r) => r.id === responseId);
    if (!response) return;

    const updatedResponses = responses.filter((r) => r.id !== responseId);
    setResponses(updatedResponses);

    const updatedForms = forms.map((f) =>
      f.id === response.formId
        ? { ...f, responses: Math.max(0, f.responses - 1) }
        : f,
    );
    setForms(updatedForms);
  };

  const resolveLookup = async (
    lookupConfig: {
      formId: string;
      fieldId: string;
      lookupType: "first" | "last" | "nth" | "query";
      nthIndex?: number;
      queryField?: string;
      queryValue?: string;
    },
    currentFormData?: Record<string, any>,
    cellValues?: Record<string, string>,
  ) => {
    try {
      const response = await fetch(`/api/forms/${lookupConfig.formId}/data`, {
        headers: { "x-user-id": user?.id || "" },
      });
      if (!response.ok) return "Lookup Error";
      const data = await response.json();
      if (!data || data.length === 0) return "No Data";

      let targetResponse;
      if (lookupConfig.lookupType === "first") {
        const offset = lookupConfig.nthIndex || 0;
        targetResponse = data[data.length - 1 - offset];
      } else if (lookupConfig.lookupType === "last") {
        const offset = lookupConfig.nthIndex || 0;
        targetResponse = data[offset];
      } else if (lookupConfig.lookupType === "nth") {
        const index = lookupConfig.nthIndex || 1;
        targetResponse = data[data.length - index];
      } else if (lookupConfig.lookupType === "query" && lookupConfig.queryField) {
        let qVal = lookupConfig.queryValue || "";

        // Support [[CellID]] substitution
        if (qVal.includes("[[") && cellValues) {
          const cellMatches = qVal.match(/\[\[([^\]]+)\]\]/g);
          if (cellMatches) {
            for (const match of cellMatches) {
              const cellId = match.slice(2, -2);
              if (cellValues[cellId] !== undefined) {
                qVal = qVal.replace(match, cellValues[cellId]);
              }
            }
          }
        }

        if (currentFormData && currentFormData[qVal] !== undefined) {
          qVal = String(currentFormData[qVal]);
        }

        // Support relative date offsets like {{date}}-1 or {{Field}}-1
        if (qVal.includes("{{")) {
          const match = qVal.match(/\{\{([^}]+)\}\}([+-]\d+)?/);
          if (match) {
            const fieldKey = match[1];
            const offset = parseInt(match[2] || "0");
            let baseDateStr = "";

            if (fieldKey.toLowerCase() === "date") {
              // Priority 1: Use the value of a field named "Date" (case-insensitive) if it exists in current data
              const dateFieldKey = Object.keys(currentFormData || {}).find(
                (k) => k.toLowerCase() === "date",
              );
              if (
                dateFieldKey &&
                currentFormData &&
                currentFormData[dateFieldKey]
              ) {
                baseDateStr = String(currentFormData[dateFieldKey]);
              } else {
                // Fallback: Use current real-world date
                const now = new Date();
                baseDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
              }
            } else if (currentFormData && currentFormData[fieldKey]) {
              baseDateStr = String(currentFormData[fieldKey]);
            }

            if (baseDateStr) {
              const baseDate = new Date(baseDateStr);
              if (!isNaN(baseDate.getTime())) {
                const targetDate = new Date(baseDate);
                targetDate.setDate(baseDate.getDate() + offset);
                // Standardize target date format
                qVal = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
              }
            }
          }
        }

        // Robust date normalization helper for matching
        const normalizeDateValue = (val: any) => {
          if (!val) return "";
          // If it's already YYYY-MM-DD, return it
          if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val))
            return val;
          const d = new Date(val);
          if (isNaN(d.getTime())) return String(val).toLowerCase().trim();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        };

        const normalizedQVal = normalizeDateValue(qVal);

        targetResponse = data.find((r: any) => {
          const dbValue = r.data[lookupConfig.queryField!];
          return normalizeDateValue(dbValue) === normalizedQVal;
        });
      }

      return targetResponse
        ? String(targetResponse.data[lookupConfig.fieldId] || "Not Found")
        : "Not Found";
    } catch (error) {
      console.error("Lookup resolution error:", error);
      return "Error";
    }
  };

  return (
    <FormContext.Provider
      value={{
        forms,
        responses,
        addForm,
        updateForm,
        deleteForm,
        getForm,
        submitResponse,
        getFormResponses,
        updateResponse,
        deleteResponse,
        fetchFormResponses,
        resolveLookup,
      }}
    >
      {children}
    </FormContext.Provider>
  );
}

export function useForms() {
  const context = useContext(FormContext);
  if (!context) throw new Error("useForms must be used within FormProvider");
  return context;
}

export async function generateExcel(formTitle: string, responseData: any) {
  const worksheet = XLSX.utils.json_to_sheet([responseData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Response");
  const filename = `${formTitle}-response-${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export async function generateDocx(
  formTitle: string,
  responseData: any,
  customText?: string,
  gridConfig?: GridConfig,
  resolveLookup?: (config: any) => Promise<string>,
  resolvedPreFetched?: Record<string, string>,
) {
  const docRows = [];

  if (gridConfig && gridConfig.rows.length > 0) {
    if (gridConfig.textAbove) {
      docRows.push(
        new Paragraph({ text: gridConfig.textAbove, spacing: { after: 200 } }),
      );
    }
    const bodyRows = await Promise.all(gridConfig.rows.map(
      async (row) =>
        new TableRow({
          children: await Promise.all(row.cells.map(async (cell) => {
            let value = cell.value;
            if (cell.type === "variable") {
              value = String(responseData[cell.value] || "");
            } else if (cell.type === "lookup" || cell.type === "formula") {
              if (resolvedPreFetched && resolvedPreFetched[cell.id]) {
                value = resolvedPreFetched[cell.id];
              } else if (cell.type === "lookup" && cell.lookupConfig && resolveLookup) {
                value = await resolveLookup(cell.lookupConfig);
              } else {
                value = "0";
              }
            }
            return new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: value,
                      bold: cell.bold,
                      italics: cell.italic,
                      size: (cell.fontSize || 12) * 2,
                      color: cell.textColor
                        ? cell.textColor.replace("#", "")
                        : undefined,
                    }),
                  ],
                }),
              ],
              shading: cell.color
                ? { fill: cell.color.replace("#", "") }
                : undefined,
              columnSpan: cell.colspan || 1,
            });
          })),
        }),
    ));
    const rows = [];
    if (gridConfig.tableName) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: gridConfig.tableName,
                      bold: true,
                      size: 28,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              columnSpan: gridConfig.headers.length,
              shading: { fill: "e2e8f0" },
            }),
          ],
        }),
      );
    }

    if (gridConfig.showHeaders !== false) {
      rows.push(
        new TableRow({
          children: gridConfig.headers.map(
            (h) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: h,
                        bold: true,
                        color: gridConfig.headerTextColor
                          ? gridConfig.headerTextColor.replace("#", "")
                          : undefined,
                      }),
                    ],
                  }),
                ],
                shading: {
                  fill: gridConfig.headerColor
                    ? gridConfig.headerColor.replace("#", "")
                    : "f1f5f9",
                },
              }),
          ),
        }),
      );
    }

    docRows.push(
      new Table({
        rows: [...rows, ...bodyRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    );

    if (gridConfig.textBelow) {
      docRows.push(
        new Paragraph({ text: gridConfig.textBelow, spacing: { before: 200 } }),
      );
    }
  } else {
    const tableRows = Object.entries(responseData)
      .filter(([key]) => key !== "id" && key !== "submittedAt")
      .map(
        ([key, value]) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: key, bold: true })],
                  }),
                ],
              }),
              new TableCell({ children: [new Paragraph(String(value || ""))] }),
            ],
          }),
      );

    docRows.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: formTitle,
            heading: "Heading1",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Generated: ${new Date().toLocaleString()}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph(""),
          ...docRows,
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${formTitle}-response-${new Date().toISOString().split("T")[0]}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generatePdf(
  formTitle: string,
  responseData: any,
  customText?: string,
  gridConfig?: GridConfig,
  resolveLookup?: (config: any) => Promise<string>,
  resolvedPreFetched?: Record<string, string>,
) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text(formTitle, 20, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);

  let y = 40;

  if (gridConfig && gridConfig.rows.length > 0) {
    if (gridConfig.textAbove) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const splitTextAbove = doc.splitTextToSize(gridConfig.textAbove, 170);
      doc.text(splitTextAbove, 20, y);
      y += splitTextAbove.length * 5 + 5;
    }

    const colWidth = 170 / gridConfig.headers.length;

    if (gridConfig.tableName) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(226, 232, 240);
      doc.rect(20, y, 170, 10, "F");
      doc.text(gridConfig.tableName, 105, y + 7, { align: "center" });
      y += 10;
    }

    if (gridConfig.showHeaders !== false) {
      doc.setFontSize(10);
      doc.setFillColor(gridConfig.headerColor || "#f1f5f9");
      doc.rect(20, y, 170, 10, "F");
      doc.setTextColor(gridConfig.headerTextColor || "#000000");
      gridConfig.headers.forEach((h, i) => {
        doc.setFont("helvetica", "bold");
        doc.text(h, 22 + i * colWidth, y + 7);
      });
      y += 10;
    }
    doc.setTextColor("#000000");

    for (const row of gridConfig.rows) {
      let maxHeight = 10;
      const cellValues = await Promise.all(row.cells.map(async (cell) => {
        let val = cell.value;
        if (cell.type === "variable") {
          val = String(responseData[cell.value] || "");
        } else if (cell.type === "lookup" || cell.type === "formula") {
          if (resolvedPreFetched && resolvedPreFetched[cell.id]) {
            val = resolvedPreFetched[cell.id];
          } else if (cell.type === "lookup" && cell.lookupConfig && resolveLookup) {
            val = await resolveLookup(cell.lookupConfig);
          } else {
            val = "0";
          }
        }
        return val;
      }));

      cellValues.forEach((val, i) => {
        const cell = row.cells[i];
        const split = doc.splitTextToSize(
          val,
          colWidth * (cell.colspan || 1) - 4,
        );
        maxHeight = Math.max(maxHeight, split.length * 5 + 5);
      });

      if (y + maxHeight > 280) {
        doc.addPage();
        y = 20;
      }

      let currentX = 20;
      row.cells.forEach((cell, i) => {
        const cellWidth = colWidth * (cell.colspan || 1);
        if (cell.color) {
          doc.setFillColor(cell.color);
          doc.rect(currentX, y, cellWidth, maxHeight, "F");
        }
        doc.setTextColor(cell.textColor || "#000000");
        doc.setFontSize(cell.fontSize || 10);

        let style = "normal";
        if (cell.bold && cell.italic) style = "bolditalic";
        else if (cell.bold) style = "bold";
        else if (cell.italic) style = "italic";
        else if (row.isFooter) style = "bold";

        doc.setFont("helvetica", style);

        const val = cellValues[i];
        doc.text(doc.splitTextToSize(val, cellWidth - 4), currentX + 2, y + 7);
        currentX += cellWidth;
      });
      doc.setTextColor("#000000");
      y += maxHeight;
    }

    if (gridConfig.textBelow) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const splitTextBelow = doc.splitTextToSize(gridConfig.textBelow, 170);
      doc.text(splitTextBelow, 20, y + 5);
    }
  } else {
    Object.entries(responseData)
      .filter(([key]) => key !== "id" && key !== "submittedAt")
      .forEach(([key, value]) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(11);
        doc.text(`${key}:`, 20, y);
        doc.setFontSize(10);
        const wrapped = doc.splitTextToSize(String(value || ""), 130);
        doc.text(wrapped, 60, y);
        y += wrapped.length * 5 + 5;
      });
  }

  doc.save(
    `${formTitle}-response-${new Date().toISOString().split("T")[0]}.pdf`,
  );
}

export async function generateWhatsAppShareMessage(
  formTitle: string,
  responseData: any,
  formUrl: string,
  customFormat?: string,
  gridConfig?: GridConfig,
  resolveLookup?: (config: any) => Promise<string>,
  resolvedPreFetched?: Record<string, string>,
): Promise<string> {
  if (customFormat) {
    let message = customFormat;
    Object.entries(responseData).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    });
    message = message.replace(/{{form_url}}/g, formUrl);
    message = message.replace(/{{form_title}}/g, formTitle);
    return message;
  }

  let summary = "";
  if (gridConfig && gridConfig.rows.length > 0) {
    const rowStrings = await Promise.all(gridConfig.rows.map(async (row) => {
      const cellStrings = await Promise.all(row.cells.map(async (cell) => {
        let val = cell.value;
        if (cell.type === "variable") {
          val = String(responseData[cell.value] || "");
        } else if (cell.type === "lookup" || cell.type === "formula") {
          if (resolvedPreFetched && resolvedPreFetched[cell.id]) {
            val = resolvedPreFetched[cell.id];
          } else if (cell.type === "lookup" && cell.lookupConfig && resolveLookup) {
            val = await resolveLookup(cell.lookupConfig);
          } else {
            val = "0";
          }
        }
        return val;
      }));
      return cellStrings.join(" : ");
    }));
    summary = rowStrings.join("\n");
  } else {
    summary = Object.entries(responseData)
      .filter(([key]) => key !== "id" && key !== "submittedAt")
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  }

  return `Form: ${formTitle}\n\n${summary}`;
}
