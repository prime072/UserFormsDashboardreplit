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
  PageBreak,
} from "docx";
import jsPDF from "jspdf";
import { useAuth } from "./auth-context";
import { addDaysToDate, calculateHmr, hmrToMinutes, minutesToHmr } from "@shared/schema";

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
  return bytes.buffer;
};
const dataUrlToUint8Array = (dataUrl: string) => {
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
const resolveImageDataUrl = async (src: string) => {
  if (isDataImage(src)) return src;
  return "";
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
  updateResponse: (responseId: string, data: Record<string, any>) => Promise<void>;
  deleteResponse: (responseId: string) => Promise<void>;
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

  const updateResponse = async (responseId: string, data: Record<string, any>) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (user?.id) headers["x-user-id"] = user.id;

    const response = await fetch(`/api/responses/${responseId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error("Failed to update response");
    }

    const updatedResponse = await response.json();
    if (!updatedResponse) {
      throw new Error("Response was not found");
    }

    setResponses((currentResponses) =>
      currentResponses.map((item) =>
        item.id === responseId ? { ...item, ...updatedResponse, data } : item,
      ),
    );
  };

  const deleteResponse = async (responseId: string) => {
    const responseToDelete = responses.find((item) => item.id === responseId);
    const headers: Record<string, string> = {};
    if (user?.id) headers["x-user-id"] = user.id;

    const response = await fetch(`/api/responses/${responseId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to delete response");
    }

    setResponses((currentResponses) =>
      currentResponses.filter((item) => item.id !== responseId),
    );

    if (responseToDelete) {
      setForms((currentForms) =>
        currentForms.map((form) =>
          form.id === responseToDelete.formId
            ? { ...form, responses: Math.max(0, form.responses - 1) }
            : form,
        ),
      );
    }
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

export async function resolveFormGridLookups(
  form: any,
  responseData: Record<string, any>,
  resolveLookup: (
    lookupConfig: any,
    currentFormData?: Record<string, any>,
    cellValues?: Record<string, string>,
  ) => Promise<string>,
): Promise<Record<number, Record<string, string>>> {
  const grids = form.gridConfigs && form.gridConfigs.length > 0
    ? form.gridConfigs
    : (form.gridConfig ? [form.gridConfig] : []);
  const allLookups: Record<number, Record<string, string>> = {};

  for (let gridIdx = 0; gridIdx < grids.length; gridIdx++) {
    const grid = grids[gridIdx];
    if (!grid?.rows) continue;

    const lookups: Record<string, string> = {};
    const allCells = grid.rows.flatMap((row: any) => row.cells || []);

    for (const cell of allCells) {
      if (cell.type === "lookup" && cell.lookupConfig) {
        try {
          lookups[cell.id] = await resolveLookup(cell.lookupConfig, responseData, lookups);
        } catch {
          lookups[cell.id] = "0";
        }
      }
    }

    for (const cell of allCells) {
      if ((cell.type === "date_calc" || cell.type === "hmr_calc") && cell.calcConfig) {
        for (const lookupKey of ["lookup1", "lookup2"] as const) {
          const lookupConfig = cell.calcConfig[lookupKey];
          if (lookupConfig) {
            try {
              lookups[`${cell.id}_${lookupKey === "lookup1" ? "lk1" : "lk2"}`] =
                await resolveLookup(lookupConfig, responseData, lookups);
            } catch {
              lookups[`${cell.id}_${lookupKey === "lookup1" ? "lk1" : "lk2"}`] = "0";
            }
          }
        }
      }
    }

    const resolveFormula = (expression: string): string => {
      let evaluated = expression;
      Object.entries(responseData).forEach(([key, value]) => {
        const numericValue = isNaN(Number(value)) ? 0 : Number(value);
        evaluated = evaluated.replace(new RegExp(`{{${key}}}`, "g"), String(numericValue));
      });
      Object.entries(lookups).forEach(([id, value]) => {
        const numericValue = isNaN(Number(value)) ? 0 : Number(value);
        evaluated = evaluated.replace(new RegExp(`\\[\\[${id}\\]\\]`, "g"), String(numericValue));
      });

      try {
        const cleanExpression = evaluated.replace(/[^0-9+\-*/().\s]/g, "");
        if (!cleanExpression) return "0";
        const result = Function(`"use strict"; return (${cleanExpression})`)();
        return isNaN(result) || !isFinite(result) ? "0" : String(result);
      } catch {
        return "0";
      }
    };

    for (const cell of allCells) {
      if (cell.type === "formula" && cell.formulaConfig) {
        const rawValue = resolveFormula(cell.formulaConfig.expression);
        lookups[cell.id] = parseFloat(rawValue).toFixed(cell.formulaConfig.precision ?? 2);
      } else if (cell.type === "date_calc" && cell.calcConfig) {
        let value1 = responseData[cell.calcConfig.field1];
        if (String(cell.calcConfig.field1).startsWith("[[")) {
          value1 = lookups[String(cell.calcConfig.field1).replace(/[\[\]]/g, "")];
        } else if (cell.calcConfig.lookup1) {
          value1 = lookups[`${cell.id}_lk1`];
        }

        if (value1) {
          if (cell.calcConfig.field2 !== undefined) {
            let value2 = responseData[cell.calcConfig.field2];
            if (String(cell.calcConfig.field2).startsWith("[[")) {
              value2 = lookups[String(cell.calcConfig.field2).replace(/[\[\]]/g, "")];
            } else if (cell.calcConfig.lookup2) {
              value2 = lookups[`${cell.id}_lk2`];
            }

            if (value1 && value2) {
              const date1 = new Date(value1);
              const date2 = new Date(value2);
              lookups[cell.id] = !isNaN(date1.getTime()) && !isNaN(date2.getTime())
                ? String(Math.round((date1.getTime() - date2.getTime()) / (1000 * 3600 * 24)) * (cell.calcConfig.operator === "+" ? 1 : -1))
                : "Invalid Date";
            }
          } else {
            const amount = parseInt(cell.calcConfig.value || "1");
            lookups[cell.id] = addDaysToDate(value1, cell.calcConfig.operator === "+" ? amount : -amount);
          }
        }
      } else if (cell.type === "hmr_calc" && cell.calcConfig) {
        let value1 = responseData[cell.calcConfig.field1];
        if (String(cell.calcConfig.field1).startsWith("[[")) {
          value1 = lookups[String(cell.calcConfig.field1).replace(/[\[\]]/g, "")];
        } else if (cell.calcConfig.lookup1) {
          value1 = lookups[`${cell.id}_lk1`];
        }

        if (value1) {
          if (cell.calcConfig.field2 !== undefined) {
            let value2 = responseData[cell.calcConfig.field2];
            if (String(cell.calcConfig.field2).startsWith("[[")) {
              value2 = lookups[String(cell.calcConfig.field2).replace(/[\[\]]/g, "")];
            } else if (cell.calcConfig.lookup2) {
              value2 = lookups[`${cell.id}_lk2`];
            }
            if (value1 && value2) {
              const minutes1 = hmrToMinutes(String(value1));
              const minutes2 = hmrToMinutes(String(value2));
              lookups[cell.id] = minutesToHmr(
                cell.calcConfig.operator === "+" ? minutes1 + minutes2 : minutes1 - minutes2,
              );
            }
          } else {
            const amount = parseInt(cell.calcConfig.value || "1");
            const minutes = cell.calcConfig.unit === "minutes" ? amount : amount * 60;
            lookups[cell.id] = calculateHmr(
              String(value1),
              cell.calcConfig.operator === "+" ? minutes : -minutes,
            );
          }
        }
      }
    }

    allLookups[gridIdx] = lookups;
  }

  return allLookups;
}

const formatReportValue = (value: any): string => {
  if (Array.isArray(value)) {
    return value
      .map((item: any) =>
        typeof item === "object" && item !== null
          ? Object.entries(item).map(([key, nestedValue]) => `${key}: ${nestedValue}`).join(", ")
          : String(item),
      )
      .join(" | ");
  }
  return String(value ?? "");
};

const getCollectiveReportRows = (responses: any[]) =>
  responses.map((response, index) => ({
    "Response": index + 1,
    "Submitted At": response.submittedAt
      ? new Date(response.submittedAt).toLocaleString()
      : "",
    ...Object.fromEntries(
      Object.entries(response.data || {}).map(([key, value]) => [key, formatReportValue(value)]),
    ),
  }));

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

export async function generateResponsesExcel(formTitle: string, responses: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(getCollectiveReportRows(responses));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "All Responses");
  XLSX.writeFile(
    workbook,
    `${formTitle}-all-responses-${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

export async function generateResponsesDocx(form: any, responses: any[]) {
  const children: any[] = [
    new Paragraph({
      text: form.title,
      heading: "Heading1",
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `All responses • Generated: ${new Date().toLocaleString()}`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph(""),
  ];

  responses.forEach((response, index) => {
    const responseRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Submitted At", bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ text: response.submittedAt ? new Date(response.submittedAt).toLocaleString() : "" })],
          }),
        ],
      }),
      ...Object.entries(response.data || {}).map(([key, value]) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ text: formatReportValue(value) })],
            }),
          ],
        }),
      ),
    ];

    children.push(
      new Paragraph({ text: `Response ${index + 1}`, heading: "Heading2" }),
      new Table({
        rows: responseRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    );

    if (index < responses.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const doc = new Document({
    sections: [{ children }],
  });
  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${form.title}-all-responses-${new Date().toISOString().split("T")[0]}.docx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function generateResponsesPdf(form: any, responses: any[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 20;
  const valueLeft = 65;
  const contentWidth = pageWidth - left - 20;
  let y = 20;

  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(form.title, pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`All responses • Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: "center" });
  y += 14;

  responses.forEach((response, index) => {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Response ${index + 1}`, left, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const rows = [
      ["Submitted At", response.submittedAt ? new Date(response.submittedAt).toLocaleString() : ""],
      ...Object.entries(response.data || {}).map(([key, value]) => [key, formatReportValue(value)]),
    ];

    rows.forEach(([key, value]) => {
      const lines = doc.splitTextToSize(String(value), contentWidth - (valueLeft - left));
      const rowHeight = Math.max(8, lines.length * 5 + 3);
      ensureSpace(rowHeight);
      doc.setFont("helvetica", "bold");
      doc.text(String(key), left, y);
      doc.setFont("helvetica", "normal");
      doc.text(lines, valueLeft, y);
      y += rowHeight;
    });

    y += 8;
  });

  doc.save(`${form.title}-all-responses-${new Date().toISOString().split("T")[0]}.pdf`);
}

const replaceReportVariables = (text: string, responseData: Record<string, any>) => {
  let result = text || "";
  Object.entries(responseData).forEach(([key, value]) => {
    result = result.split(`{{${key}}}`).join(formatReportValue(value));
  });
  return result;
};

const getCustomCellValue = (
  cell: any,
  responseData: Record<string, any>,
  gridIdx: number,
  resolvedLookups?: Record<number, Record<string, string>>,
) => {
  if (cell.type === "variable") {
    return formatReportValue(responseData[cell.value]);
  }
  if (cell.type === "image") {
    return cellImageSource(cell) ? "[Image]" : "";
  }
  if (
    cell.type === "lookup" ||
    cell.type === "formula" ||
    cell.type === "date_calc" ||
    cell.type === "hmr_calc"
  ) {
    return resolvedLookups?.[gridIdx]?.[cell.id] || "0";
  }
  return String(cell.value ?? "");
};

const addCustomDocxGrid = async (
  children: any[],
  grid: any,
  responseData: Record<string, any>,
  gridIdx: number,
  resolvedLookups?: Record<number, Record<string, string>>,
) => {
  if (!grid) return false;
  const rows: any[] = [];
  const columnCount = Math.max(
    grid.headers?.length || 0,
    ...(grid.rows || []).map((row: any) => row.cells?.length || 0),
    1,
  );

  if (grid.tableName) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: replaceReportVariables(grid.tableName, responseData), bold: true, size: 28 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: columnCount,
            shading: { fill: "e2e8f0" },
          }),
        ],
      }),
    );
  }

  if (grid.showHeaders !== false && grid.headers?.length > 0) {
    rows.push(
      new TableRow({
        children: grid.headers.map((header: string) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            shading: { fill: (grid.headerColor || "#f1f5f9").replace("#", "") },
          }),
        ),
      }),
    );
  }

  for (const row of grid.rows || []) {
    const cells = [];
    for (const cell of row.cells || []) {
      let value = getCustomCellValue(cell, responseData, gridIdx, resolvedLookups);
      if (cell.type === "image" && cellImageSource(cell)) {
        try {
          const dataUrl = await resolveImageDataUrl(cellImageSource(cell));
          if (dataUrl) {
            const dims = fitImageToCell(cell.imageWidth || 120, cell.imageHeight || 120, 120, 120);
            cells.push(
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: dataUrlToUint8Array(dataUrl),
                        format: guessImageFormat(dataUrl),
                        transformation: { width: dims.width, height: dims.height },
                      }),
                    ],
                  }),
                ],
                shading: cell.color ? { fill: cell.color.replace("#", "") } : undefined,
                columnSpan: cell.colspan || 1,
              }),
            );
            continue;
          }
        } catch {
          value = "";
        }
      }

      cells.push(
        new TableCell({
          children: String(value).split("\n").map((line) =>
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  bold: cell.bold || row.isFooter,
                  italics: cell.italic,
                  size: (cell.fontSize || 12) * 2,
                  color: cell.textColor ? cell.textColor.replace("#", "") : undefined,
                }),
              ],
            }),
          ),
          shading: cell.color ? { fill: cell.color.replace("#", "") } : undefined,
          columnSpan: cell.colspan || 1,
        }),
      );
    }
    if (cells.length > 0) rows.push(new TableRow({ children: cells }));
  }

  if (rows.length > 0) {
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }
  if (grid.textBelow) {
    children.push(new Paragraph({
      text: replaceReportVariables(grid.textBelow, responseData),
      spacing: { before: 200 },
    }));
  }
  return rows.length > 0 || Boolean(grid.textAbove || grid.textBelow);
};

export async function generateResponsesDocxCustom(
  form: any,
  responses: any[],
  resolvedLookupsByResponse: Record<number, Record<number, Record<string, string>>> = {},
) {
  const children: any[] = [
    new Paragraph({
      text: form.title,
      heading: "Heading1",
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `All responses • Custom layout • Generated: ${new Date().toLocaleString()}`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph(""),
  ];
  const grids = form.gridConfigs && form.gridConfigs.length > 0
    ? form.gridConfigs
    : (form.gridConfig ? [form.gridConfig] : []);

  for (let responseIndex = 0; responseIndex < responses.length; responseIndex++) {
    const response = responses[responseIndex];
    children.push(
      new Paragraph({ text: `Response ${responseIndex + 1}`, heading: "Heading2" }),
      new Paragraph({
        text: `Submitted: ${response.submittedAt ? new Date(response.submittedAt).toLocaleString() : ""}`,
      }),
    );

    let rendered = false;
    if (form.confirmationStyle === "paragraph" && form.confirmationText) {
      children.push(new Paragraph({
        text: replaceReportVariables(form.confirmationText, response.data || {}),
      }));
      rendered = true;
    } else {
      for (let gridIdx = 0; gridIdx < grids.length; gridIdx++) {
        const grid = grids[gridIdx];
        if (grid?.textAbove) {
          children.push(new Paragraph({
            text: replaceReportVariables(grid.textAbove, response.data || {}),
            spacing: { after: 200 },
          }));
        }
        rendered = (await addCustomDocxGrid(
          children,
          grid,
          response.data || {},
          gridIdx,
          resolvedLookupsByResponse[responseIndex],
        )) || rendered;
      }
    }

    if (!rendered) {
      children.push(
        new Table({
          rows: Object.entries(response.data || {}).map(([key, value]) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: key, bold: true })] })],
                }),
                new TableCell({ children: [new Paragraph({ text: formatReportValue(value) })] }),
              ],
            }),
          ),
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
    }

    if (responseIndex < responses.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${form.title}-all-responses-custom-${new Date().toISOString().split("T")[0]}.docx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function generateResponsesPdfCustom(
  form: any,
  responses: any[],
  resolvedLookupsByResponse: Record<number, Record<number, Record<string, string>>> = {},
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 20;
  const tableWidth = pageWidth - 40;
  let y = 20;
  const grids = form.gridConfigs && form.gridConfigs.length > 0
    ? form.gridConfigs
    : (form.gridConfig ? [form.gridConfig] : []);

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) {
      doc.addPage();
      y = 20;
    }
  };

  const drawText = (text: string, x: number, width: number, style: string = "normal", size = 10) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width);
    ensureSpace(lines.length * 5 + 4);
    doc.text(lines, x, y);
    y += lines.length * 5 + 4;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(form.title, pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`All responses • Custom layout • Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: "center" });
  y += 14;

  for (let responseIndex = 0; responseIndex < responses.length; responseIndex++) {
    const response = responses[responseIndex];
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Response ${responseIndex + 1}`, left, y);
    y += 7;
    drawText(`Submitted: ${response.submittedAt ? new Date(response.submittedAt).toLocaleString() : ""}`, left, tableWidth);

    let rendered = false;
    if (form.confirmationStyle === "paragraph" && form.confirmationText) {
      drawText(replaceReportVariables(form.confirmationText, response.data || {}), left, tableWidth);
      rendered = true;
    } else {
      for (let gridIdx = 0; gridIdx < grids.length; gridIdx++) {
        const grid = grids[gridIdx];
        if (!grid) continue;
        if (grid.textAbove) {
          drawText(replaceReportVariables(grid.textAbove, response.data || {}), left, tableWidth);
        }

        const columnCount = Math.max(
          grid.headers?.length || 0,
          ...(grid.rows || []).map((row: any) => row.cells?.length || 0),
          1,
        );
        const colWidth = tableWidth / columnCount;
        if (grid.tableName) {
          ensureSpace(11);
          doc.setFillColor("#e2e8f0");
          doc.rect(left, y, tableWidth, 10, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(replaceReportVariables(grid.tableName, response.data || {}), pageWidth / 2, y + 7, { align: "center" });
          y += 10;
        }

        if (grid.showHeaders !== false && grid.headers?.length > 0) {
          ensureSpace(11);
          doc.setFillColor(grid.headerColor || "#f1f5f9");
          doc.rect(left, y, tableWidth, 10, "F");
          doc.setTextColor(grid.headerTextColor || "#000000");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          grid.headers.forEach((header: string, index: number) => {
            doc.text(String(header), left + index * colWidth + 2, y + 7);
          });
          y += 10;
          doc.setTextColor("#000000");
        }

        for (const row of grid.rows || []) {
          const cellValues = (row.cells || []).map((cell: any) =>
            String(getCustomCellValue(cell, response.data || {}, gridIdx, resolvedLookupsByResponse[responseIndex])),
          );
          const heights = cellValues.map((value: string, index: number) =>
            doc.splitTextToSize(value, (row.cells[index].colspan || 1) * colWidth - 4).length * 5 + 5,
          );
          const rowHeight = Math.max(10, ...heights);
          ensureSpace(rowHeight);
          let x = left;
          row.cells.forEach((cell: any, cellIndex: number) => {
            const width = (cell.colspan || 1) * colWidth;
            if (cell.color) {
              doc.setFillColor(cell.color);
              doc.rect(x, y, width, rowHeight, "F");
            }
            doc.setDrawColor(200, 200, 200);
            doc.rect(x, y, width, rowHeight, "D");
            const style = cell.bold || row.isFooter
              ? (cell.italic ? "bolditalic" : "bold")
              : (cell.italic ? "italic" : "normal");
            doc.setFont("helvetica", style);
            doc.setFontSize(cell.fontSize || 10);
            doc.setTextColor(cell.textColor || "#475569");
            doc.text(
              doc.splitTextToSize(cellValues[cellIndex], width - 4),
              x + 2,
              y + 7,
            );
            x += width;
          });
          doc.setTextColor("#000000");
          y += rowHeight;
        }

        if (grid.textBelow) {
          y += 4;
          drawText(replaceReportVariables(grid.textBelow, response.data || {}), left, tableWidth);
        }
        rendered = rendered || Boolean(grid.tableName || grid.headers?.length || grid.rows?.length || grid.textAbove || grid.textBelow);
        y += 6;
      }
    }

    if (!rendered) {
      for (const [key, value] of Object.entries(response.data || {})) {
        const text = formatReportValue(value);
        const lines = doc.splitTextToSize(text, tableWidth - 48);
        const rowHeight = Math.max(8, lines.length * 5 + 3);
        ensureSpace(rowHeight);
        doc.setFont("helvetica", "bold");
        doc.text(`${key}:`, left, y);
        doc.setFont("helvetica", "normal");
        doc.text(lines, left + 45, y);
        y += rowHeight;
      }
    }
    y += 8;
  }

  doc.save(`${form.title}-all-responses-custom-${new Date().toISOString().split("T")[0]}.pdf`);
}

export async function generateResponsesWhatsAppMessage(form: any, responses: any[]) {
  const sections = responses.map((response, index) => {
    const values = Object.entries(response.data || {})
      .map(([key, value]) => `${key}: ${formatReportValue(value)}`)
      .join("\n");
    const submittedAt = response.submittedAt
      ? `Submitted At: ${new Date(response.submittedAt).toLocaleString()}\n`
      : "";
    return `Response ${index + 1}\n${submittedAt}${values}`;
  });

  return `Form: ${form.title}\n\n${sections.join("\n\n--------------------\n\n")}`;
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
                      const dataUrl = await resolveImageDataUrl(src);
                      if (!dataUrl) throw new Error("Missing image data");
                      const dims = fitImageToCell(cell.imageWidth || 120, cell.imageHeight || 120, 120, 120);
                      const format = guessImageFormat(dataUrl);
                      return new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: dataUrlToUint8Array(dataUrl),
                                format,
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
              const dataUrl = await resolveImageDataUrl(src);
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
