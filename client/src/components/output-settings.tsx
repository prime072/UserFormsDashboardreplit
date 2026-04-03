import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { OutputFormat, FormField, GridConfig, FormTableRow, FormTableCell, useForms } from "@/lib/form-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface OutputSettingsProps {
  selectedFormats: OutputFormat[];
  onChange: (formats: OutputFormat[]) => void;
  fields: FormField[];
  gridConfig: GridConfig;
  onGridConfigChange: (config: GridConfig) => void;
  whatsappFormat: string;
  onWhatsappFormatChange: (format: string) => void;
}

export default function OutputSettings({ 
  selectedFormats, 
  onChange,
  fields,
  gridConfig,
  onGridConfigChange,
  whatsappFormat,
  onWhatsappFormatChange
}: OutputSettingsProps) {
  const formats: { id: OutputFormat; label: string; description: string }[] = [
    { id: "thank_you", label: "Thank You Page", description: "Standard confirmation page" },
    { id: "whatsapp", label: "WhatsApp Share", description: "Allow users to share on WhatsApp" },
    { id: "excel", label: "Excel Download", description: "Download response as .xlsx" },
    { id: "docx", label: "Word Download", description: "Download response as .docx" },
    { id: "pdf", label: "PDF Download", description: "Download response as .pdf" },
  ];

  const toggleFormat = (id: OutputFormat) => {
    if (selectedFormats.includes(id)) {
      onChange(selectedFormats.filter(f => f !== id));
    } else {
      onChange([...selectedFormats, id]);
    }
  };

  const addRow = () => {
    const newRow: FormTableRow = {
      id: Math.random().toString(36).substr(2, 9),
      cells: gridConfig.headers.map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        type: "text",
        value: "",
        color: "#ffffff"
      }))
    };
    onGridConfigChange({
      ...gridConfig,
      rows: [...gridConfig.rows, newRow]
    });
  };

  const addColumn = () => {
    const newHeader = `Column ${gridConfig.headers.length + 1}`;
    onGridConfigChange({
      ...gridConfig,
      headers: [...gridConfig.headers, newHeader],
      rows: gridConfig.rows.map(row => ({
        ...row,
        cells: [...row.cells, {
          id: Math.random().toString(36).substr(2, 9),
          type: "text",
          value: "",
          color: "#ffffff"
        }]
      }))
    });
  };

  const removeRow = (index: number) => {
    const newRows = [...gridConfig.rows];
    newRows.splice(index, 1);
    onGridConfigChange({ ...gridConfig, rows: newRows });
  };

  const removeColumn = (index: number) => {
    onGridConfigChange({
      ...gridConfig,
      headers: gridConfig.headers.filter((_, i) => i !== index),
      rows: gridConfig.rows.map(row => ({
        ...row,
        cells: row.cells.filter((_, i) => i !== index)
      }))
    });
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...gridConfig.headers];
    newHeaders[index] = value;
    onGridConfigChange({ ...gridConfig, headers: newHeaders });
  };

  const toggleHeaders = () => {
    onGridConfigChange({ ...gridConfig, showHeaders: !gridConfig.showHeaders });
  };

  const updateCell = (rowIndex: number, colIndex: number, updates: Partial<FormTableCell>) => {
    const newRows = [...gridConfig.rows];
    newRows[rowIndex].cells[colIndex] = { ...newRows[rowIndex].cells[colIndex], ...updates };
    onGridConfigChange({ ...gridConfig, rows: newRows });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-6 space-y-6">
        <div>
          <Label className="text-sm font-semibold mb-4 block">Output Options</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formats.map((format) => (
              <div 
                key={format.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedFormats.includes(format.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => toggleFormat(format.id)}
              >
                <Checkbox 
                  checked={selectedFormats.includes(format.id)}
                  onCheckedChange={() => toggleFormat(format.id)}
                />
                <div className="space-y-1">
                  <Label className="text-sm font-medium cursor-pointer">{format.label}</Label>
                  <p className="text-xs text-slate-500">{format.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedFormats.includes("whatsapp") && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-semibold">WhatsApp Message Format</Label>
            <p className="text-xs text-slate-500">Use variables like {'{{field_label}}'} to customize the message.</p>
            <Textarea 
              value={whatsappFormat}
              onChange={(e) => onWhatsappFormatChange(e.target.value)}
              placeholder="e.g. New submission for {{form_title}}: Name: {{Full Name}}, Email: {{Email Address}}"
              className="h-24"
            />
          </div>
        )}

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Custom Grid Layout (PDF/Word/Confirmation)</Label>
            <div className="flex gap-2">
              <Button 
                variant={gridConfig.showHeaders ? "default" : "outline"} 
                size="sm" 
                onClick={toggleHeaders}
                className="h-8"
              >
                Headers: {gridConfig.showHeaders ? "On" : "Off"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onGridConfigChange({ ...gridConfig, rows: [...gridConfig.rows, { id: Math.random().toString(36).substr(2, 9), cells: gridConfig.headers.map(() => ({ id: Math.random().toString(36).substr(2, 9), type: "text", value: "", color: "#ffffff", colspan: 1 })), isFooter: true }] })}>
                <Plus className="w-4 h-4 mr-1" /> Footer
              </Button>
              <Button variant="outline" size="sm" onClick={addColumn}>
                <Plus className="w-4 h-4 mr-1" /> Col
              </Button>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-4 h-4 mr-1" /> Row
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Table Name</Label>
              <Input 
                value={gridConfig.tableName || ""} 
                onChange={(e) => onGridConfigChange({ ...gridConfig, tableName: e.target.value })}
                placeholder="Enter table name..."
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Text Above Table</Label>
              <Textarea 
                value={gridConfig.textAbove || ""} 
                onChange={(e) => onGridConfigChange({ ...gridConfig, textAbove: e.target.value })}
                placeholder="Write something above..."
                className="text-sm min-h-[80px] resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Text Below Table</Label>
              <Textarea 
                value={gridConfig.textBelow || ""} 
                onChange={(e) => onGridConfigChange({ ...gridConfig, textBelow: e.target.value })}
                placeholder="Write something below..."
                className="text-sm min-h-[80px] resize-y"
              />
            </div>
            {gridConfig.showHeaders && (
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-medium">Hdr BG</Label>
                  <Input 
                    type="color"
                    value={gridConfig.headerColor || "#f1f5f9"}
                    onChange={(e) => onGridConfigChange({ ...gridConfig, headerColor: e.target.value })}
                    className="w-8 h-8 p-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-medium">Hdr Text</Label>
                  <Input 
                    type="color"
                    value={gridConfig.headerTextColor || "#000000"}
                    onChange={(e) => onGridConfigChange({ ...gridConfig, headerTextColor: e.target.value })}
                    className="w-8 h-8 p-0"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                {gridConfig.tableName && (
                  <tr className="bg-slate-100">
                    <th colSpan={gridConfig.headers.length + 1} className="p-2 border-b text-center font-bold text-sm">
                      {gridConfig.tableName}
                    </th>
                  </tr>
                )}
                <tr className="bg-slate-50">
                  <th className="w-10 border-b"></th>
                  {gridConfig.headers.map((header, i) => (
                    <th key={i} className="p-2 border-b border-r min-w-[150px]">
                      <div className="flex gap-1 items-center">
                        <Input 
                          value={header}
                          onChange={(e) => updateHeader(i, e.target.value)}
                          className="h-7 text-xs font-bold bg-transparent border-none focus-visible:ring-1"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-slate-400 hover:text-red-500"
                          onClick={() => removeColumn(i)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridConfig.rows.map((row, rIndex) => (
                  <tr key={row.id} className={row.isFooter ? "bg-slate-100 font-semibold" : ""}>
                    <td className="p-2 border-b border-r bg-slate-50 text-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-slate-400 hover:text-red-500"
                        onClick={() => removeRow(rIndex)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                    {row.cells.map((cell, cIndex) => (
                      <td 
                        key={cell.id} 
                        className="p-2 border-b border-r"
                        colSpan={cell.colspan || 1}
                        style={{ backgroundColor: cell.color }}
                      >
                        <div className="space-y-1">
                          <div className="flex gap-1 items-center">
                            <select 
                              value={cell.type}
                              onChange={(e) => updateCell(rIndex, cIndex, { type: e.target.value as any })}
                              className="h-6 text-[10px] rounded border"
                            >
                              <option value="text">Txt</option>
                              <option value="variable">Var</option>
                              <option value="lookup">Lkp</option>
                              <option value="formula">Fx</option>
                              <option value="date_calc">Date Calc</option>
                              <option value="hmr_calc">HMR Calc</option>
                              <option value="link_button">Btn</option>
                            </select>
                            <Input 
                              type="color"
                              value={cell.color || "#ffffff"}
                              onChange={(e) => updateCell(rIndex, cIndex, { color: e.target.value })}
                              className="w-5 h-5 p-0 border-none bg-transparent"
                              title="BG Color"
                            />
                            <Input 
                              type="color"
                              value={cell.textColor || "#000000"}
                              onChange={(e) => updateCell(rIndex, cIndex, { textColor: e.target.value })}
                              className="w-5 h-5 p-0 border-none bg-transparent"
                              title="Text Color"
                            />
                            <div className="flex items-center gap-1 border rounded px-1 h-6">
                              <span className="text-[9px] text-slate-400">ID:</span>
                              <span className="text-[9px] font-mono select-all bg-slate-100 px-1 rounded">{cell.id}</span>
                            </div>
                            <div className="flex items-center gap-1 border rounded px-1 h-6">
                              <button 
                                className={`text-[10px] px-1 font-bold ${cell.bold ? 'bg-primary text-white' : ''}`}
                                onClick={() => updateCell(rIndex, cIndex, { bold: !cell.bold })}
                              >B</button>
                              <button 
                                className={`text-[10px] px-1 italic ${cell.italic ? 'bg-primary text-white' : ''}`}
                                onClick={() => updateCell(rIndex, cIndex, { italic: !cell.italic })}
                              >I</button>
                              <select 
                                value={cell.fontSize || 12}
                                onChange={(e) => updateCell(rIndex, cIndex, { fontSize: parseInt(e.target.value) })}
                                className="h-4 text-[9px] bg-transparent outline-none border-l pl-1"
                              >
                                {[8,10,12,14,16,18,20].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-1 border rounded px-1 h-6">
                              <span className="text-[9px] text-slate-400">Merge</span>
                              <input 
                                type="number" 
                                min="1" 
                                max={gridConfig.headers.length - cIndex}
                                value={cell.colspan || 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) {
                                    updateCell(rIndex, cIndex, { colspan: val });
                                  }
                                }}
                                className="w-6 h-4 text-[10px] bg-transparent outline-none"
                              />
                            </div>
                          </div>
                          {cell.type === "variable" ? (
                            <select 
                              value={cell.value}
                              onChange={(e) => updateCell(rIndex, cIndex, { value: e.target.value })}
                              className="w-full h-7 text-xs rounded border"
                            >
                              <option value="">Select Field</option>
                              {fields.map(f => (
                                <option key={f.id} value={f.label}>{f.label}</option>
                              ))}
                            </select>
                          ) : (cell.type === "date_calc" || cell.type === "hmr_calc") ? (
                            <div className="space-y-1">
                              <div className="flex gap-1">
                                <select 
                                  value={cell.calcConfig?.field1?.startsWith('[[') ? "cell" : (cell.calcConfig?.lookup1 ? "lookup" : "field")}
                                  onChange={(e) => {
                                    const mode = e.target.value;
                                    updateCell(rIndex, cIndex, {
                                      calcConfig: {
                                        ...(cell.calcConfig || { operator: "+", unit: cell.type === "date_calc" ? "days" : "hours" }),
                                        field1: mode === "cell" ? "[[]]" : "",
                                        lookup1: mode === "lookup" ? { formId: "", fieldId: "", lookupType: "last" } : undefined
                                      }
                                    });
                                  }}
                                  className="h-7 text-[10px] rounded border"
                                >
                                  <option value="field">Field</option>
                                  <option value="cell">Cell</option>
                                  <option value="lookup">Lkp</option>
                                </select>
                                {cell.calcConfig?.lookup1 ? (
                                  <div className="flex-1 space-y-1">
                                    <select 
                                      value={cell.calcConfig.lookup1.formId || ""}
                                      onChange={(e) => updateCell(rIndex, cIndex, { 
                                        calcConfig: { ...cell.calcConfig!, lookup1: { ...cell.calcConfig!.lookup1!, formId: e.target.value } } 
                                      })}
                                      className="w-full h-7 text-[10px] rounded border"
                                    >
                                      <option value="">Form</option>
                                      {useForms().forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                    </select>
                                    {cell.calcConfig.lookup1.formId && (
                                      <select 
                                        value={cell.calcConfig.lookup1.fieldId || ""}
                                        onChange={(e) => updateCell(rIndex, cIndex, { 
                                          calcConfig: { ...cell.calcConfig!, lookup1: { ...cell.calcConfig!.lookup1!, fieldId: e.target.value } } 
                                        })}
                                        className="w-full h-7 text-[10px] rounded border"
                                      >
                                        <option value="">Field</option>
                                        {useForms().getForm(cell.calcConfig.lookup1.formId)?.fields.map(f => <option key={f.id} value={f.label}>{f.label}</option>)}
                                      </select>
                                    )}
                                  </div>
                                ) : (
                                  <Input 
                                    placeholder={cell.calcConfig?.field1?.startsWith('[[') ? "[[CellID]]" : "Field"}
                                    value={cell.calcConfig?.field1 || ""}
                                    onChange={(e) => updateCell(rIndex, cIndex, { calcConfig: { ...cell.calcConfig!, field1: e.target.value } })}
                                    className="h-7 text-[10px] flex-1"
                                  />
                                )}
                              </div>
                              <div className="flex gap-1">
                                <select 
                                  value={cell.calcConfig?.operator || "+"}
                                  onChange={(e) => updateCell(rIndex, cIndex, { calcConfig: { ...cell.calcConfig!, operator: e.target.value as any } })}
                                  className="h-7 text-[10px] rounded border"
                                >
                                  <option value="+">+</option>
                                  <option value="-">-</option>
                                </select>
                                <select 
                                  value={cell.calcConfig?.field2 !== undefined ? (cell.calcConfig.field2.startsWith('[[') ? "cell" : (cell.calcConfig.lookup2 ? "lookup" : "field")) : "constant"}
                                  onChange={(e) => {
                                    const mode = e.target.value;
                                    updateCell(rIndex, cIndex, {
                                      calcConfig: {
                                        ...cell.calcConfig!,
                                        field2: mode === "field" ? "" : (mode === "cell" ? "[[]]" : undefined),
                                        lookup2: mode === "lookup" ? { formId: "", fieldId: "", lookupType: "last" } : undefined,
                                        value: mode === "constant" ? "1" : undefined
                                      }
                                    });
                                  }}
                                  className="h-7 text-[10px] rounded border flex-1"
                                >
                                  <option value="constant">Value</option>
                                  <option value="field">Field</option>
                                  <option value="cell">Cell</option>
                                  <option value="lookup">Lkp</option>
                                </select>
                              </div>
                              {cell.calcConfig?.lookup2 ? (
                                <div className="space-y-1">
                                  <select 
                                    value={cell.calcConfig.lookup2.formId || ""}
                                    onChange={(e) => updateCell(rIndex, cIndex, { 
                                      calcConfig: { ...cell.calcConfig!, lookup2: { ...cell.calcConfig!.lookup2!, formId: e.target.value } } 
                                    })}
                                    className="w-full h-7 text-[10px] rounded border"
                                  >
                                    <option value="">Form</option>
                                    {useForms().forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                  </select>
                                  {cell.calcConfig.lookup2.formId && (
                                    <select 
                                      value={cell.calcConfig.lookup2.fieldId || ""}
                                      onChange={(e) => updateCell(rIndex, cIndex, { 
                                        calcConfig: { ...cell.calcConfig!, lookup2: { ...cell.calcConfig!.lookup2!, fieldId: e.target.value } } 
                                      })}
                                      className="w-full h-7 text-[10px] rounded border"
                                    >
                                      <option value="">Field</option>
                                      {useForms().getForm(cell.calcConfig.lookup2.formId)?.fields.map(f => <option key={f.id} value={f.label}>{f.label}</option>)}
                                    </select>
                                  )}
                                </div>
                              ) : cell.calcConfig?.field2 !== undefined ? (
                                <Input 
                                  placeholder={cell.calcConfig.field2.startsWith('[[') ? "[[CellID]]" : "Field"}
                                  value={cell.calcConfig.field2 || ""}
                                  onChange={(e) => updateCell(rIndex, cIndex, { calcConfig: { ...cell.calcConfig!, field2: e.target.value } })}
                                  className="w-full h-7 text-[10px] rounded border"
                                />
                              ) : (
                                <div className="flex gap-1">
                                  <Input 
                                    type="number"
                                    value={cell.calcConfig?.value || "1"}
                                    onChange={(e) => updateCell(rIndex, cIndex, { calcConfig: { ...cell.calcConfig!, value: e.target.value } })}
                                    className="h-7 text-[10px] flex-1"
                                  />
                                  <select 
                                    value={cell.calcConfig?.unit || (cell.type === "date_calc" ? "days" : "hours")}
                                    onChange={(e) => updateCell(rIndex, cIndex, { calcConfig: { ...cell.calcConfig!, unit: e.target.value as any } })}
                                    className="h-7 text-[10px] rounded border"
                                  >
                                    {cell.type === "date_calc" ? <option value="days">Days</option> : <><option value="hours">Hrs</option><option value="minutes">Min</option></>}
                                  </select>
                                </div>
                              )}
                            </div>
                          ) : cell.type === "lookup" ? (
                            <div className="space-y-1">
                              <select 
                                value={cell.lookupConfig?.formId || ""}
                                onChange={(e) => updateCell(rIndex, cIndex, { 
                                  lookupConfig: { 
                                    ...(cell.lookupConfig || { fieldId: "", lookupType: "last" }), 
                                    formId: e.target.value 
                                  } 
                                })}
                                className="w-full h-7 text-xs rounded border"
                              >
                                <option value="">Select Form</option>
                                {useForms().forms.map(f => (
                                  <option key={f.id} value={f.id}>{f.title}</option>
                                ))}
                              </select>
                              {cell.lookupConfig?.formId && (
                                <>
                                  <select 
                                    value={cell.lookupConfig?.fieldId || ""}
                                    onChange={(e) => updateCell(rIndex, cIndex, { 
                                      lookupConfig: { 
                                        ...cell.lookupConfig!, 
                                        fieldId: e.target.value 
                                      } 
                                    })}
                                    className="w-full h-7 text-xs rounded border"
                                  >
                                    <option value="">Select Field</option>
                                    {(() => {
                                      const lookupForm = useForms().getForm(cell.lookupConfig.formId);
                                      const fieldList = lookupForm?.fields?.length
                                        ? lookupForm.fields
                                        : [];
                                      return fieldList.map((f: any) => (
                                        <option key={f.id} value={f.label}>{f.label}</option>
                                      ));
                                    })()}
                                  </select>
                                  <select 
                                    value={cell.lookupConfig?.lookupType || "last"}
                                    onChange={(e) => updateCell(rIndex, cIndex, { 
                                      lookupConfig: { 
                                        ...cell.lookupConfig!, 
                                        lookupType: e.target.value as any 
                                      } 
                                    })}
                                    className="w-full h-7 text-xs rounded border"
                                  >
                                    <option value="first">First (+offset)</option>
                                    <option value="last">Last (-offset)</option>
                                    <option value="nth">Absolute Nth</option>
                                    <option value="query">Query Filter</option>
                                  </select>
                                  {(cell.lookupConfig?.lookupType === "nth" || cell.lookupConfig?.lookupType === "first" || cell.lookupConfig?.lookupType === "last") && (
                                    <Input 
                                      type="number"
                                      placeholder={cell.lookupConfig?.lookupType === "nth" ? "Index" : "Offset (0, 1, ...)"}
                                      value={cell.lookupConfig?.nthIndex || (cell.lookupConfig?.lookupType === "nth" ? "" : "0")}
                                      onChange={(e) => updateCell(rIndex, cIndex, { 
                                        lookupConfig: { 
                                          ...cell.lookupConfig!, 
                                          nthIndex: parseInt(e.target.value) 
                                        } 
                                      })}
                                      className="h-7 text-xs"
                                    />
                                  )}
                                  {cell.lookupConfig?.lookupType === "query" && (
                                    <div className="space-y-1">
                                      <select 
                                        value={cell.lookupConfig?.queryField || ""}
                                        onChange={(e) => updateCell(rIndex, cIndex, { 
                                          lookupConfig: { 
                                            ...cell.lookupConfig!, 
                                            queryField: e.target.value 
                                          } 
                                        })}
                                        className="w-full h-7 text-xs rounded border"
                                      >
                                        <option value="">Filter Field</option>
                                        {(() => {
                                          const lookupForm = useForms().getForm(cell.lookupConfig.formId);
                                          const fieldList = lookupForm?.fields?.length
                                            ? lookupForm.fields
                                            : [];
                                          return fieldList.map((f: any) => (
                                            <option key={f.id} value={f.label}>{f.label}</option>
                                          ));
                                        })()}
                                      </select>
                                      <div className="flex gap-1">
                                        <select 
                                          value={fields.some(f => f.label === cell.lookupConfig?.queryValue) ? cell.lookupConfig?.queryValue : (cell.lookupConfig?.queryValue ? "custom" : "")}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "custom") {
                                              // Don't clear it if it already has a custom value (like {{date}}-1)
                                              if (fields.some(f => f.label === cell.lookupConfig?.queryValue)) {
                                                updateCell(rIndex, cIndex, { 
                                                  lookupConfig: { 
                                                    ...cell.lookupConfig!, 
                                                    queryValue: "" 
                                                  } 
                                                });
                                              }
                                            } else {
                                              updateCell(rIndex, cIndex, { 
                                                lookupConfig: { 
                                                  ...cell.lookupConfig!, 
                                                  queryValue: val 
                                                } 
                                              });
                                            }
                                          }}
                                          className="h-7 text-xs flex-1 rounded border"
                                        >
                                          <option value="">Select Value</option>
                                          {fields.map(f => (
                                            <option key={f.id} value={f.label}>{f.label}</option>
                                          ))}
                                          <option value="custom">Other (Custom)</option>
                                        </select>
                                        {(!fields.some(f => f.label === cell.lookupConfig?.queryValue) || cell.lookupConfig?.queryValue === "") && (
                                          <Input 
                                            placeholder="Value"
                                            value={cell.lookupConfig?.queryValue || ""}
                                            onChange={(e) => updateCell(rIndex, cIndex, { 
                                              lookupConfig: { 
                                                ...cell.lookupConfig!, 
                                                queryValue: e.target.value 
                                              } 
                                            })}
                                            className="h-7 text-xs flex-1"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ) : cell.type === "link_button" ? (
                            <div className="space-y-1">
                              <Input 
                                placeholder="Label"
                                value={cell.placeholder || ""}
                                onChange={(e) => updateCell(rIndex, cIndex, { placeholder: e.target.value })}
                                className="h-7 text-xs"
                              />
                              <select 
                                value={cell.value}
                                onChange={(e) => updateCell(rIndex, cIndex, { value: e.target.value })}
                                className="w-full h-7 text-xs rounded border"
                              >
                                <option value="">Target Form</option>
                                {useForms().forms.map(f => (
                                  <option key={f.id} value={f.id}>{f.title}</option>
                                ))}
                              </select>
                            </div>
                          ) : cell.type === "formula" ? (
                            <div className="space-y-1">
                              <Input 
                                placeholder="Formula (e.g. {{A}} + {{B}})"
                                value={cell.formulaConfig?.expression || ""}
                                onChange={(e) => updateCell(rIndex, cIndex, { 
                                  formulaConfig: { 
                                    ...(cell.formulaConfig || { expression: "", precision: 2 }), 
                                    expression: e.target.value 
                                  } 
                                })}
                                className="h-7 text-xs"
                              />
                              <div className="flex items-center gap-1">
                                <Label className="text-[9px]">Prec:</Label>
                                <Input 
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={cell.formulaConfig?.precision ?? 2}
                                  onChange={(e) => updateCell(rIndex, cIndex, { 
                                    formulaConfig: { 
                                      ...(cell.formulaConfig || { expression: "", precision: 2 }), 
                                      precision: parseInt(e.target.value) 
                                    } 
                                  })}
                                  className="h-7 text-xs w-12"
                                />
                              </div>
                              <p className="text-[8px] text-slate-400">Use {'{{Field}}'} or {'[[CellID]]'}</p>
                            </div>
                          ) : (
                            <Input 
                              value={cell.value}
                              onChange={(e) => updateCell(rIndex, cIndex, { value: e.target.value })}
                              placeholder={row.isFooter ? "Footer text..." : "Text..."}
                              className="h-7 text-xs"
                            />
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gridConfig.headers.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg text-slate-400 text-sm">
              Add columns and rows to build your custom output table.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
