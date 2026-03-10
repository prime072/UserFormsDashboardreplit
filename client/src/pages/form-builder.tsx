import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, GripVertical, ChevronLeft, Save, X, Lock } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForms, FormField, FieldType, OutputFormat, GridConfig, TableVariable } from "@/lib/form-context";
import { useAuth } from "@/lib/auth-context";
import OutputSettings from "@/components/output-settings";

export default function FormBuilder() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/forms/:id/edit");
  const { toast } = useToast();
  const { addForm, getForm, updateForm, fetchUserDatabases } = useForms();
  const { isSuspended } = useAuth();
  
  const isEditing = match && params?.id;
  const formId = params?.id;

  const [title, setTitle] = useState("Untitled Form");
  const [fields, setFields] = useState<FormField[]>([
    { id: "1", type: "text", label: "Full Name", placeholder: "John Doe", required: true },
    { id: "2", type: "email", label: "Email Address", placeholder: "john@example.com", required: true }
  ]);
  const [outputFormats, setOutputFormats] = useState<OutputFormat[]>(["thank_you"]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [confirmationStyle, setConfirmationStyle] = useState<"table" | "paragraph">("table");
  const [confirmationText, setConfirmationText] = useState("");
  const [whatsappFormat, setWhatsappFormat] = useState("");
  const [gridConfig, setGridConfig] = useState<GridConfig>({ headers: [], rows: [] });
  const [userDatabases, setUserDatabases] = useState<any[]>([]);
  const [allowEditing, setAllowEditing] = useState(true);
  const [canPrivateUserViewResponses, setCanPrivateUserViewResponses] = useState(false);

  useEffect(() => {
    const loadUserDBs = async () => {
      const dbs = await fetchUserDatabases();
      setUserDatabases(dbs);
    };
    loadUserDBs();
  }, []);

  useEffect(() => {
    if (isEditing && formId) {
      const existingForm = getForm(formId);
      if (existingForm) {
        setTitle(existingForm.title);
        setFields(existingForm.fields.length > 0 ? existingForm.fields : fields);
        setOutputFormats(existingForm.outputFormats || ["thank_you"]);
        setVisibility(existingForm.visibility || "public");
        setConfirmationStyle(existingForm.confirmationStyle || "table");
        setConfirmationText(existingForm.confirmationText || "");
        setWhatsappFormat(existingForm.whatsappFormat || "");
        setGridConfig(existingForm.gridConfig || { headers: [], rows: [] });
        setAllowEditing(existingForm.allowEditing ?? true);
        setCanPrivateUserViewResponses(existingForm.canPrivateUserViewResponses === "true");
      }
    }
  }, [isEditing, formId, getForm]);

  const addField = () => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      type: "text",
      label: `Field ${fields.length + 1}`,
      required: false,
      options: []
    };
    setFields([...fields, newField]);
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const addOption = (fieldId: string, optionText: string) => {
    if (!optionText.trim()) return;
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      const currentOptions = field.options || [];
      updateField(fieldId, { options: [...currentOptions, optionText] });
    }
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (field && field.options) {
      const newOptions = [...field.options];
      newOptions.splice(optionIndex, 1);
      updateField(fieldId, { options: newOptions });
    }
  };

  const handleSave = async () => {
    // Check for duplicate field labels
    const labels = fields.map(f => f.label.trim().toLowerCase());
    const hasDuplicates = labels.some((label, index) => labels.indexOf(label) !== index);
    if (hasDuplicates) {
      toast({ title: "Validation Error", description: "Form fields must have unique labels.", variant: "destructive" });
      return;
    }

    // Check for duplicate repeater column labels
    for (const field of fields) {
      if (field.type === 'repeater' && field.repeaterFields) {
        const subLabels = field.repeaterFields.map(sf => sf.label.trim().toLowerCase());
        const hasSubDuplicates = subLabels.some((label, index) => subLabels.indexOf(label) !== index);
        if (hasSubDuplicates) {
          toast({ title: "Validation Error", description: `Repeater columns in "${field.label}" must have unique labels.`, variant: "destructive" });
          return;
        }
      }
    }

    try {
      if (isEditing && formId) {
        await updateForm(formId, title, fields, outputFormats, visibility, confirmationStyle, confirmationText, undefined, whatsappFormat, gridConfig, allowEditing, canPrivateUserViewResponses ? "true" : "false");
        toast({ title: "Form Updated", description: "Your changes have been saved." });
      } else {
        await addForm(title, fields, outputFormats, visibility, confirmationStyle, confirmationText, undefined, whatsappFormat, gridConfig, allowEditing, canPrivateUserViewResponses ? "true" : "false");
        toast({ title: "Form Created", description: "Your form has been created successfully." });
      }
      setTimeout(() => setLocation("/forms"), 1000);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save form.", variant: "destructive" });
    }
  };

  if (isSuspended) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <Lock className="w-16 h-16 text-red-600 mx-auto" />
          <h1 className="text-2xl font-display font-bold text-slate-900">Account Suspended</h1>
          <p className="text-slate-600">You cannot create or edit forms while your account is suspended.</p>
          <Button onClick={() => setLocation("/dashboard")} variant="outline">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-8 sticky top-0 bg-gray-50/95 backdrop-blur z-10 py-4 border-b -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:border-none md:py-0 md:static">
          <div className="flex items-center gap-4">
            <Link href="/forms">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-display font-bold bg-transparent border-none px-0 focus-visible:ring-0 h-auto w-[300px] md:w-[500px]" 
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation("/forms")}>Cancel</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              {isEditing ? "Update Form" : "Save Form"}
            </Button>
          </div>
        </div>

        <div className="mb-8 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold block">Form Settings</Label>
                <p className="text-xs text-slate-500">Configure visibility and submission rules.</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={allowEditing} onCheckedChange={setAllowEditing} />
                  <span className="text-sm font-medium">Allow Response Editing</span>
                </div>
                <div className="flex items-center gap-2 border-l pl-6">
                  <Checkbox 
                    id="canPrivateUserViewResponses" 
                    checked={canPrivateUserViewResponses} 
                    onCheckedChange={(v) => setCanPrivateUserViewResponses(!!v)} 
                  />
                  <Label htmlFor="canPrivateUserViewResponses" className="text-sm font-medium cursor-pointer">Private User View Responses</Label>
                </div>
                <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <Label className="text-sm font-semibold mb-3 block">Confirmation Page Design</Label>
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={confirmationStyle === "table"} onChange={() => setConfirmationStyle("table")} className="w-4 h-4" />
                  <span className="text-sm">Response Table</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={confirmationStyle === "paragraph"} onChange={() => setConfirmationStyle("paragraph")} className="w-4 h-4" />
                  <span className="text-sm">Custom Paragraph</span>
                </label>
              </div>
              {confirmationStyle === "paragraph" && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Use {'{{Field Label}}'} to insert values.</Label>
                  <Textarea value={confirmationText} onChange={(e) => setConfirmationText(e.target.value)} placeholder="Thank you {{Full Name}}!" className="h-24" />
                </div>
              )}
            </div>
          </div>

          <OutputSettings 
            selectedFormats={outputFormats}
            onChange={setOutputFormats}
            fields={fields}
            gridConfig={gridConfig}
            onGridConfigChange={setGridConfig}
            whatsappFormat={whatsappFormat}
            onWhatsappFormatChange={setWhatsappFormat}
          />
        </div>

        <div className="space-y-6">
          {fields.map((field) => (
            <Card key={field.id} className="group relative border-slate-200 hover:border-primary/30">
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => moveField(field.id, 'up')}
                  disabled={fields.indexOf(field) === 0}
                >
                  <Plus className="w-4 h-4 rotate-45" style={{ transform: 'rotate(180deg)' }} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => moveField(field.id, 'down')}
                  disabled={fields.indexOf(field) === fields.length - 1}
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </Button>
              </div>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <GripVertical className="w-5 h-5 mt-2 text-slate-300" />
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
                      <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="flex-1" />
                      <Select value={field.type} onValueChange={(v: any) => updateField(field.id, { type: v })}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="textarea">Long Text</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="radio">Radio</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="file">File Upload</SelectItem>
                          <SelectItem value="link_button">Link Button</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="hmr">HMR (Hour:Minute)</SelectItem>
                          <SelectItem value="repeater">Repeater (List of Items)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {field.type === "repeater" && (
                      <div className="space-y-4 bg-slate-50 p-4 rounded-md border border-slate-200">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Repeater Columns
                        </Label>
                        <div className="space-y-3">
                          {(field.repeaterFields || []).map((subField, idx) => (
                            <div key={subField.id} className="flex gap-2 items-start">
                              <Input
                                value={subField.label}
                                onChange={(e) => {
                                  const newRepeaterFields = [...(field.repeaterFields || [])];
                                  newRepeaterFields[idx].label = e.target.value;
                                  updateField(field.id, { repeaterFields: newRepeaterFields });
                                }}
                                placeholder="Column Label"
                                className="flex-1 bg-white"
                              />
                              <Select
                                value={subField.type}
                                onValueChange={(v: any) => {
                                  const newRepeaterFields = [...(field.repeaterFields || [])];
                                  newRepeaterFields[idx].type = v;
                                  updateField(field.id, { repeaterFields: newRepeaterFields });
                                }}
                              >
                                <SelectTrigger className="w-[120px] bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="textarea">Long Text</SelectItem>
                                  <SelectItem value="select">Dropdown</SelectItem>
                                  <SelectItem value="radio">Radio</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="hmr">HMR (Hour:Minute)</SelectItem>
                                </SelectContent>
                              </Select>
                              {(subField.type === 'select' || subField.type === 'radio' || subField.type === 'checkbox') && (
                                <div className="flex-1 space-y-2 mt-2 ml-4 border-l-2 pl-4">
                                  <Label className="text-[10px] font-bold uppercase text-slate-400">Column Options</Label>
                                  {(subField.options || []).map((opt, oIdx) => (
                                    <div key={oIdx} className="flex gap-1">
                                      <Input 
                                        value={opt} 
                                        onChange={(e) => {
                                          const newRepeaterFields = [...(field.repeaterFields || [])];
                                          const newOptions = [...(newRepeaterFields[idx].options || [])];
                                          newOptions[oIdx] = e.target.value;
                                          newRepeaterFields[idx].options = newOptions;
                                          updateField(field.id, { repeaterFields: newRepeaterFields });
                                        }}
                                        className="h-7 text-xs bg-white"
                                      />
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-red-400"
                                        onClick={() => {
                                          const newRepeaterFields = [...(field.repeaterFields || [])];
                                          newRepeaterFields[idx].options = (newRepeaterFields[idx].options || []).filter((_, i) => i !== oIdx);
                                          updateField(field.id, { repeaterFields: newRepeaterFields });
                                        }}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <div className="flex gap-1">
                                    <Input 
                                      placeholder="Add option..." 
                                      className="h-7 text-xs bg-white"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const val = (e.target as HTMLInputElement).value;
                                          if (!val) return;
                                          const newRepeaterFields = [...(field.repeaterFields || [])];
                                          newRepeaterFields[idx].options = [...(newRepeaterFields[idx].options || []), val];
                                          updateField(field.id, { repeaterFields: newRepeaterFields });
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newRepeaterFields = field.repeaterFields?.filter((_, i) => i !== idx);
                                  updateField(field.id, { repeaterFields: newRepeaterFields });
                                }}
                                className="text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-white"
                            onClick={() => {
                              const newSubField = {
                                id: Math.random().toString(36).substr(2, 9),
                                type: "text" as const,
                                label: "New Column",
                              };
                              updateField(field.id, {
                                repeaterFields: [...(field.repeaterFields || []), newSubField],
                              });
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add Column
                          </Button>
                        </div>
                      </div>
                    )}
                    {field.type === 'link_button' && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-md">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Button Configuration</Label>
                        <div className="space-y-2">
                          <Input 
                            placeholder="Button Label (e.g. View Catalog)" 
                            value={field.placeholder || ''} 
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })} 
                          />
                          <select 
                            value={field.options?.[0] || ""}
                            onChange={(e) => updateField(field.id, { options: [e.target.value] })}
                            className="w-full h-9 text-sm rounded border"
                          >
                            <option value="">Select Target Form</option>
                            {useForms().forms.map(f => (
                              <option key={f.id} value={f.id}>{f.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {field.type !== 'checkbox' && field.type !== 'date' && field.type !== 'file' && field.type !== 'link_button' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Placeholder</Label>
                        <Input 
                          value={field.placeholder || ''} 
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })} 
                          placeholder="Enter placeholder text..."
                        />
                      </div>
                    )}
                    {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-md">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Options</Label>
                        <div className="space-y-2">
                          {(field.options || []).map((option, index) => (
                            <div key={index} className="flex gap-2">
                              <Input 
                                value={option} 
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions[index] = e.target.value;
                                  updateField(field.id, { options: newOptions });
                                }}
                                className="bg-white"
                              />
                              <Button variant="ghost" size="icon" onClick={() => removeOption(field.id, index)} className="text-red-500">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Add option..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addOption(field.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                              className="bg-white"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                addOption(field.id, input.value);
                                input.value = '';
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={field.required} onCheckedChange={(v) => updateField(field.id, { required: v })} />
                        <span className="text-sm">Required</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeField(field.id)} className="text-red-500 ml-auto"><Trash2 className="w-4 h-4 mr-1" /> Remove</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="w-full py-8 border-dashed" onClick={addField}><Plus className="w-5 h-5 mr-2" /> Add New Field</Button>
        </div>
      </div>
    </Layout>
  );
}
