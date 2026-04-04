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
  ImageRun,
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
  | "link_button"
  | "repeater";
export type OutputFormat = "thank_you" | "whatsapp" | "excel" | "docx" | "pdf";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  repeaterFields?: {
    id: string;
    type:
      | "text"
      | "number"
      | "date"
      | "select"
      | "radio"
      | "checkbox"
      | "textarea"
      | "email"
      | "hmr";
    label: string;
    options?: string[];
  }[];
}

export interface FormTableCell {
  id: string;
  type:
    | "text"
    | "variable"
    | "image"
    | "lookup"
    | "formula"
    | "hmr_calc"
    | "date_calc"
    | "link_button";
  value: string;
  calcConfig?: {
    field1: string; // Label of field 1 OR [[CellID]]
    field2?: string; // Label of field 2 OR [[CellID]]
    operator: "+" | "-";
    value?: string; // Constant value (e.g. "1" day)
    unit?: "days" | "hours" | "minutes";
    lookup1?: {
      formId: string;
      fieldId: string;
      lookupType: string;
      nthIndex?: number;
      queryField?: string;
      queryValue?: string;
    };
    lookup2?: {
      formId: string;
      fieldId: string;
      lookupType: string;
      nthIndex?: number;
      queryField?: string;
      queryValue?: string;
    };
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
  imageWidth?: number;
  imageHeight?: number;
  imageData?: string;
}

const imageDataUrl = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to render image"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = url;
  });

const isImageUrl = (value: unknown) =>
  typeof value === "string" && /^https?:\/\//i.test(value);
const isDataImage = (value: unknown) =>
  typeof value === "string" && value.startsWith("data:image/");
const cellImageSource = (cell: any) => cell.imageData || cell.value || "";
const guessImageFormat = (value: string) => {
  if (value.startsWith("data:image/jpeg")) return "JPEG";
  if (value.startsWith("data:image/jpg")) return "JPEG";
  if (value.startsWith("data:image/png")) return "PNG";
  if (value.startsWith("data:image/gif")) return "GIF";
  if (value.startsWith("data:image/webp")) return "WEBP";
  if (value.startsWith("data:image/x-icon") || value.startsWith("data:image/vnd.microsoft.icon")) return "PNG";
  return "PNG";
};
const dataUrlToBuffer = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
const fitImageToCell = (imageWidth: number, imageHeight: number, cellWidth: number, cellHeight: number) => {
  const padding = 4;
  const maxWidth = Math.max(1, cellWidth - padding);
  const maxHeight = Math.max(1, cellHeight - padding);
  const ratio = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1);
  return {
    width: Math.max(1, imageWidth * ratio),
    height: Math.max(1, imageHeight * ratio),
  };
};

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
  gridConfigs?: GridConfig[];
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
    canPrivateUserViewResponses?: string,
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
    canPrivateUserViewResponses?: string,
  ) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  getForm: (id: string) => Form | undefined;
  submitResponse: (
    formId: string,
    data: any,
  ) => Promise<{ submissionId: string }>;
  getFormResponses: (formId: string) => FormResponse[];
  fetchFormResponses: (formId: string) => Promise<void>;
  fetchUserDatabases: () => Promise<UserDatabase[]>;
  updateResponse: (responseId: string, data: Record<string, any>) => void;
  deleteResponse: (responseId: string) => void;
  resolveLookup: (
    lookupConfig: {
      formId: string;
      fieldId: string;
      lookupType: "first" | "last" | "nth" | "query";
      nthIndex?: number;
      queryField?: string;
      queryValue?: string;
      isUserDatabase?: boolean;
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
      if (!response.ok) {
        console.error("Failed to fetch responses:", response.status, response.statusText);
        return;
      }
      const data = await response.json();
      setResponses(data || []);
    } catch (error) {
      console.error("Error fetching all responses:", error instanceof Error ? error.message : error);
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
    canPrivateUserViewResponses: string = "false",
    gridConfigs?: GridConfig[],
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
          gridConfigs,
          allowEditing,
          canPrivateUserViewResponses,
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
    canPrivateUserViewResponses: string = "false",
    gridConfigs?: GridConfig[],
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
          gridConfigs,
          allowEditing,
          canPrivateUserViewResponses,
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

  const fetchUserDatabases = async (): Promise<UserDatabase[]> => {
    if (!user?.id) return [];
    try {
      const response = await fetch("/api/user-databases", {
        headers: { "x-user-id": user.id },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Error fetching user databases:", error);
    }
    return [];
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
      isUserDatabase?: boolean;
    },
    currentFormData?: Record<string, any>,
    cellValues?: Record<string, string>,
  ) => {
    try {
      let data: any[] = [];
      if (lookupConfig.isUserDatabase) {
        const response = await fetch(`/api/user-databases/${lookupConfig.formId}`, {
          headers: { "x-user-id": user?.id || "" },
        });
        if (response.ok) {
          const dbObj = await response.json();
          data = dbObj.data || [];
        }
      } else {
        const response = await fetch(`/api/forms/${lookupConfig.formId}/data`, {
          headers: { "x-user-id": user?.id || "" },
        });
        if (response.ok) {
          const rawData = await response.json();
          data = rawData.map((r: any) => ({ ...r, data: r.data }));
        }
      }

      if (!data || data.length === 0) return "No Data";

      let targetItem;
      // Normalizing helper to access data either from item.data[field] (form responses) or item[field] (user database rows)
      const getValue = (item: any, field: string) => {
        if (!item) return undefined;
        if (lookupConfig.isUserDatabase) return item[field];
        return item.data ? item.data[field] : item[field];
      };

      if (lookupConfig.lookupType === "first") {
        const offset = lookupConfig.nthIndex || 0;
        targetItem = data[data.length - 1 - offset];
      } else if (lookupConfig.lookupType === "last") {
        const offset = lookupConfig.nthIndex || 0;
        targetItem = data[offset];
      } else if (lookupConfig.lookupType === "nth") {
        const index = lookupConfig.nthIndex || 1;
        targetItem = data[data.length - index];
      } else if (
        lookupConfig.lookupType === "query" &&
        lookupConfig.queryField
      ) {
        let qVal = lookupConfig.queryValue || "";
        // ... rest of substitution logic

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

        targetItem = data.find((r: any) => {
          const dbValue = getValue(r, lookupConfig.queryField!);
          return normalizeDateValue(dbValue) === normalizedQVal;
        });
      }

      return targetItem
        ? String(getValue(targetItem, lookupConfig.fieldId) || "Not Found")
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
        fetchUserDatabases,
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
  // Flatten response data for Excel, handling repeater fields
  const flattenedData: Record<string, any> = {};
  Object.entries(responseData).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      flattenedData[key] = val
        .map((item: any) =>
          Object.entries(item)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", "),
        )
        .join(" | ");
    } else {
      flattenedData[key] = val;
    }
  });

  Object.entries(responseData).forEach(([key, val]) => {
    if (typeof val === "string" && /^https?:\/\//i.test(val)) {
      flattenedData[`${key} URL`] = val;
    }
  });

  const worksheet = XLSX.utils.json_to_sheet([flattenedData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Response");
  const filename = `${formTitle}-response-${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export async function generateDocx(
  form: any,
  responseData: any,
  resolvedLookups?: Record<number, Record<string, string>>,
) {
  const docRows = [];
  const grids = form.gridConfigs && form.gridConfigs.length > 0 ? form.gridConfigs : (form.gridConfig ? [form.gridConfig] : []);

  for (let gridIdx = 0; gridIdx < grids.length; gridIdx++) {
    const gridConfig = grids[gridIdx];
    if (gridConfig && gridConfig.rows.length > 0) {
      if (gridConfig.textAbove) {
        docRows.push(
          new Paragraph({ text: gridConfig.textAbove, spacing: { after: 200 } }),
        );
      }
      const bodyRows = await Promise.all(
        gridConfig.rows.map(
          async (row: any) =>
            new TableRow({
              children: await Promise.all(
                row.cells.map(async (cell: any) => {
                  let value = cell.value;
                  if (cell.type === "variable") {
                    const rawVal = responseData[cell.value];
                    if (Array.isArray(rawVal)) {
                      value = rawVal
                        .map((item: any, idx: number) => {
                          const kv = Object.entries(item)
                            .map(([k, v]) => `${v}`)
                            .join(", ");
                          return `${idx + 1}. ${kv}`;
                        })
                        .join("\n");
                    } else {
                      value = String(rawVal || "");
                    }
                  } else if (cell.type === "image") {
                    value = cellImageSource(cell);
                  } else if (
                    cell.type === "lookup" ||
                    cell.type === "formula" ||
                    cell.type === "date_calc" ||
                    cell.type === "hmr_calc"
                  ) {
                    value = (resolvedLookups && resolvedLookups[gridIdx] && resolvedLookups[gridIdx][cell.id]) || "0";
                  }

                  if (cell.type === "image" && cellImageSource(cell)) {
                    try {
                      const src = cellImageSource(cell);
                      const dataUrl = isDataImage(src) ? src : await imageDataUrl(src);
                      if (!dataUrl) throw new Error("Missing image data");
                      const dims = fitImageToCell(cell.imageWidth || 120, cell.imageHeight || 120, 120, 120);
                      return new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: dataUrlToBuffer(dataUrl),
                                transformation: {
                                  width: dims.width,
                                  height: dims.height,
                                },
                              }),
                            ],
                          }),
                        ],
                        shading: cell.color
                          ? { fill: cell.color.replace("#", "") }
                          : undefined,
                        columnSpan: cell.colspan || 1,
                      });
                    } catch {
                      value = "";
                    }
                  }

                  const textLines = String(value).split("\n");

                  return new TableCell({
                    children: textLines.map(
                      (line) =>
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: line,
                              bold: cell.bold,
                              italics: cell.italic,
                              size: (cell.fontSize || 12) * 2,
                              color: cell.textColor
                                ? cell.textColor.replace("#", "")
                                : undefined,
                            }),
                          ],
                        }),
                    ),
                    shading: cell.color
                      ? { fill: cell.color.replace("#", "") }
                      : undefined,
                    columnSpan: cell.colspan || 1,
                  });
                }),
              ),
            }),
        ),
      );
      const rows: any[] = [];
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
              (h: any) =>
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
    }
  }

  if (docRows.length === 0) {
    const tableRows = Object.entries(responseData)
      .filter(([key]) => key !== "id" && key !== "submittedAt")
      .map(
        ([key, value]) => {
          const textValue = Array.isArray(value) 
            ? value.map((item: any, idx: number) => {
                const kv = Object.entries(item)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ");
                return `${idx + 1}. ${kv}`;
              }).join("\n")
            : String(value || "");
          
          const textLines = textValue.split("\n");
          
          return new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: key, bold: true })],
                  }),
                ],
              }),
              new TableCell({
                children: textLines.map(
                  (line) =>
                    new Paragraph({
                      children: [new TextRun({ text: line })],
                    }),
                ),
              }),
            ],
          });
        },
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
            text: form.title,
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
  a.download = `${form.title}-response-${new Date().toISOString().split("T")[0]}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generatePdf(
  form: any,
  responseData: any,
  resolvedLookups?: Record<number, Record<string, string>>,
) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text(form.title, 20, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);

  let y = 40;
  const grids = form.gridConfigs && form.gridConfigs.length > 0 ? form.gridConfigs : (form.gridConfig ? [form.gridConfig] : []);

  for (let gridIdx = 0; gridIdx < grids.length; gridIdx++) {
    const gridConfig = grids[gridIdx];
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
          doc.text(String(h), 22 + i * colWidth, y + 7);
        });
        y += 10;
      }
      doc.setTextColor("#000000");

      for (const row of gridConfig.rows) {
        let maxHeight = 10;
        const cellValues = await Promise.all(
          row.cells.map(async (cell: any) => {
            let val = cell.value;
            if (cell.type === "variable") {
              const rawVal = responseData[cell.value];
              if (Array.isArray(rawVal)) {
                val = rawVal
                  .map((item: any) =>
                    Object.entries(item)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", "),
                  )
                  .join("\n");
              } else {
                val = String(rawVal || "");
              }
          } else if (cell.type === "image") {
            val = "";
            } else if (
              cell.type === "lookup" ||
              cell.type === "formula" ||
              cell.type === "date_calc" ||
              cell.type === "hmr_calc"
            ) {
              val = (resolvedLookups && resolvedLookups[gridIdx] && resolvedLookups[gridIdx][cell.id]) || "0";
            }
            return val;
          }),
        );

        row.cells.forEach((cell: any, i: number) => {
          const val = String(cellValues[i]);
          const splitVal = doc.splitTextToSize(
            val,
            (cell.colspan || 1) * colWidth - 4,
          );
          const cellHeight = splitVal.length * 5 + 5;
          if (cellHeight > maxHeight) maxHeight = cellHeight;
        });

        if (y + maxHeight > 280) {
          doc.addPage();
          y = 20;
        }

        let x = 20;
        for (const [i, cell] of row.cells.entries()) {
          const val = String(cellValues[i]);
          const cw = (cell.colspan || 1) * colWidth;

          if (cell.color) {
            doc.setFillColor(cell.color);
            doc.rect(x, y, cw, maxHeight, "F");
          }
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, y, cw, maxHeight, "D");

          if (cell.textColor) doc.setTextColor(cell.textColor);
          else doc.setTextColor("#475569");

          let style = "normal";
          if (cell.bold && cell.italic) style = "bolditalic";
          else if (cell.bold) style = "bold";
          else if (cell.italic) style = "italic";
          else if (row.isFooter) style = "bold";

          doc.setFont("helvetica", style);
          doc.setFontSize(cell.fontSize || 10);

          if (cell.type === "image" && cellImageSource(cell)) {
            try {
              const src = cellImageSource(cell);
              const dataUrl = isDataImage(src) ? src : await imageDataUrl(src);
              const fitted = fitImageToCell(cell.imageWidth || 120, cell.imageHeight || 120, cw, maxHeight);
              const format = guessImageFormat(dataUrl);
              if (!dataUrl) throw new Error("Missing image data");
              doc.addImage(dataUrl, format, x + 2, y + 2, fitted.width, fitted.height);
            } catch {
              const splitVal = doc.splitTextToSize(val, cw - 4);
              doc.text(splitVal, x + 2, y + 7);
            }
          } else {
            const splitVal = doc.splitTextToSize(val, cw - 4);
            doc.text(splitVal, x + 2, y + 7);
          }
          x += cw;
        }
        y += maxHeight;
      }

      if (gridConfig.textBelow) {
        y += 5;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor("#475569");
        const splitTextBelow = doc.splitTextToSize(gridConfig.textBelow, 170);
        doc.text(splitTextBelow, 20, y);
        y += splitTextBelow.length * 5 + 10;
      } else {
        y += 10;
      }
    }
  }

  if (grids.length === 0 || grids.every((g: any) => !g || g.rows.length === 0)) {
    Object.entries(responseData)
      .filter(([key]) => key !== "id" && key !== "submittedAt")
      .forEach(([key, val]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${key}:`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(val), 60, y);
        y += 10;
      });
  }

  doc.save(
    `${form.title}-response-${new Date().toISOString().split("T")[0]}.pdf`,
  );
}

export async function generateWhatsAppShareMessage(
  form: any,
  responseData: any,
  resolvedLookups?: Record<number, Record<string, string>>,
): Promise<string> {
  const formatRepeaterValue = (val: any) => {
    if (Array.isArray(val)) {
      return val
        .map((item: any) =>
          Object.entries(item)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", "),
        )
        .join("\n");
    }
    return String(val || "");
  };

  const customFormat = form.whatsappFormat;
  
  if (customFormat) {
    let message = customFormat;
    Object.entries(responseData).forEach(([key, value]) => {
      message = message.replace(
        new RegExp(`{{${key}}}`, "g"),
        formatRepeaterValue(value),
      );
    });

    // Support [[CellID]] substitution in custom format - search all grids
    if (message.includes("[[")) {
      const cellMatches = message.match(/\[\[([^\]]+)\]\]/g);
      if (cellMatches && resolvedLookups) {
        for (const match of cellMatches) {
          const cellId = match.slice(2, -2);
          // Search all grids for this cellId
          for (const lookups of Object.values(resolvedLookups)) {
            if (lookups[cellId] !== undefined) {
              message = message.replace(match, lookups[cellId]);
              break;
            }
          }
        }
      }
    }

    message = message.replace(/{{form_url}}/g, window.location.href);
    message = message.replace(/{{form_title}}/g, form.title);
    return message;
  }

  let summary = "";
  const grids = form.gridConfigs && form.gridConfigs.length > 0 ? form.gridConfigs : (form.gridConfig ? [form.gridConfig] : []);
  
  if (grids.length > 0 && grids.some((g: any) => g && g.rows.length > 0)) {
    const sections = [];
    for (let gridIdx = 0; gridIdx < grids.length; gridIdx++) {
      const gridConfig = grids[gridIdx];
      if (gridConfig && gridConfig.rows.length > 0) {
        const rowStrings = await Promise.all(
          gridConfig.rows.map(async (row) => {
            const cellStrings = await Promise.all(
              row.cells.map(async (cell) => {
                let val = cell.value;
                if (cell.type === "variable") {
                  val = formatRepeaterValue(responseData[cell.value]);
                } else if (
                  cell.type === "lookup" ||
                  cell.type === "formula" ||
                  cell.type === "date_calc" ||
                  cell.type === "hmr_calc"
                ) {
                  val = (resolvedLookups && resolvedLookups[gridIdx] && resolvedLookups[gridIdx][cell.id]) || "0";
                }
                return val;
              }),
            );
            return cellStrings.join(" : ");
          }),
        );
        sections.push(rowStrings.join("\n"));
      }
    }
    summary = sections.join("\n\n");
  } else {
    summary = Object.entries(responseData)
      .filter(([key]) => key !== "id" && key !== "submittedAt")
      .map(([key, value]) => `${key}: ${formatRepeaterValue(value)}`)
      .join("\n");
  }

  return `Form: ${form.title}\n\n${summary}`;
}
