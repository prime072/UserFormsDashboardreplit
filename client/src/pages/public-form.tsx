import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useForms, FormField } from "@/lib/form-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Lock, Plus, Trash2 } from "lucide-react";

export default function PublicForm() {
  const [match, params] = useRoute("/s/:id");
  const [location, setLocation] = useLocation();
  const { submitResponse, responses, updateResponse } = useForms();
  const { toast } = useToast();
  
  const queryParams = new URLSearchParams(window.location.search);
  const editId = queryParams.get("edit");
  
  const formId = params?.id;
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateUser, setPrivateUser] = useState<any>(null);
  const [loginCredentials, setLoginCredentials] = useState({ userId: "", password: "" });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const fetchFormAndResponse = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`);
        if (response.ok) {
          const data = await response.json();
          setForm(data);

          if (editId) {
            const respRes = await fetch(`/api/responses/${editId}`);
            if (respRes.ok) {
              const respData = await respRes.json();
              setData(respData.data);
            }
          } else {
            const savedSession = localStorage.getItem(`auth_session_${formId}`);
            if (savedSession) {
              const session = JSON.parse(savedSession);
              if (Date.now() < session.expires) {
                setPrivateUser(session.user);
              } else {
                localStorage.removeItem(`auth_session_${formId}`);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching form:", error);
      } finally {
        setLoading(false);
      }
    };
    if (formId) fetchFormAndResponse();
  }, [formId, editId]);

  useEffect(() => {
    if (form && form.allowEditing === false && !editId) {
      const alreadySubmitted = responses.some(r => r.formId === formId);
      if (alreadySubmitted) {
        toast({ title: "Submission Restricted", description: "This form only allows one submission." });
        setLocation("/");
      }
    }
  }, [form, responses, formId]);

  const handlePrivateLogin = async () => {
    if (!loginCredentials.userId || !loginCredentials.password) {
      toast({ title: "Error", description: "Please enter user ID and password", variant: "destructive" });
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/auth/private-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: loginCredentials.userId,
          password: loginCredentials.password,
        }),
      });

      if (!response.ok) {
        toast({ title: "Error", description: "Invalid credentials", variant: "destructive" });
        return;
      }

      const user = await response.json();
      if (!user.accessibleForms?.includes(formId)) {
        toast({ title: "Error", description: "You don't have access to this form", variant: "destructive" });
        return;
      }

      setPrivateUser(user);
      localStorage.setItem(`auth_session_${formId}`, JSON.stringify({
        user,
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      }));
      toast({ title: "Success", description: "Logged in successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Login failed", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        await fetch(`/api/responses/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: formData }),
        });
        updateResponse(editId, formData);
        toast({ title: "Updated", description: "Your response has been updated." });
        setLocation(`/s/${form.id}/confirmation/${editId}`);
      } else {
        const { submissionId } = await submitResponse(form.id, formData);
        toast({ title: "Submitted", description: "Your response has been recorded." });
        setLocation(`/s/${form.id}/confirmation/${submissionId}`);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit response.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!form) return <div className="min-h-screen flex items-center justify-center">Form Not Found</div>;

  if (form.visibility === "private" && !privateUser) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
          <CardHeader className="text-center">
            <Lock className="w-8 h-8 text-primary mx-auto mb-4" />
            <CardTitle>Private Form</CardTitle>
            <CardDescription>Please log in to access this form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={loginCredentials.userId} onChange={(e) => setLoginCredentials({ ...loginCredentials, userId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={loginCredentials.password} onChange={(e) => setLoginCredentials({ ...loginCredentials, password: e.target.value })} />
            </div>
            <Button onClick={handlePrivateLogin} disabled={isLoggingIn} className="w-full">{isLoggingIn ? "Logging in..." : "Log In"}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasLinkButton = form.fields.some((f: any) => f.type === 'link_button');

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
          <CardTitle className="text-2xl">{form.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {form.fields.map((field: any) => (
              <div key={field.id} className="space-y-2">
                <Label className="text-sm font-semibold">{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
                {field.type === 'text' && <Input required={field.required} placeholder={field.placeholder} value={formData[field.label] || ''} onChange={e => setData({...formData, [field.label]: e.target.value})} />}
                {field.type === 'email' && <Input type="email" required={field.required} placeholder={field.placeholder} value={formData[field.label] || ''} onChange={e => setData({...formData, [field.label]: e.target.value})} />}
                {field.type === 'number' && <Input type="number" required={field.required} placeholder={field.placeholder} value={formData[field.label] || ''} onChange={e => setData({...formData, [field.label]: e.target.value})} />}
                {field.type === 'date' && <Input type="date" required={field.required} value={formData[field.label] || ''} onChange={e => setData({...formData, [field.label]: e.target.value})} />}
                {field.type === 'textarea' && <Textarea required={field.required} placeholder={field.placeholder} value={formData[field.label] || ''} onChange={e => setData({...formData, [field.label]: e.target.value})} />}
                {field.type === 'select' && (
                  <Select onValueChange={v => setData({...formData, [field.label]: v})}>
                    <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                    <SelectContent>{field.options?.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {field.type === 'radio' && (
                  <RadioGroup onValueChange={v => setData({...formData, [field.label]: v})}>
                    {field.options?.map((opt: string) => <div key={opt} className="flex items-center gap-2"><RadioGroupItem value={opt} /><Label>{opt}</Label></div>)}
                  </RadioGroup>
                )}
                {field.type === 'checkbox' && (
                  <div className="space-y-2 py-2">
                    {field.options && field.options.length > 0 ? (
                      <div className="space-y-2">
                        {field.options.map((option: string) => (
                          <div key={option} className="flex items-center gap-2">
                            <Checkbox 
                              id={`${field.id}-${option}`} 
                              checked={Array.isArray(formData[field.label]) ? formData[field.label].includes(option) : false}
                              onCheckedChange={v => {
                                const currentValues = Array.isArray(formData[field.label]) ? [...formData[field.label]] : [];
                                if (v) {
                                  if (!currentValues.includes(option)) currentValues.push(option);
                                } else {
                                  const index = currentValues.indexOf(option);
                                  if (index > -1) currentValues.splice(index, 1);
                                }
                                setData({...formData, [field.label]: currentValues});
                              }} 
                            />
                            <Label htmlFor={`${field.id}-${option}`} className="cursor-pointer">{option}</Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id={field.id} 
                          checked={!!formData[field.label]}
                          onCheckedChange={v => {
                            const newData = {...formData, [field.label]: !!v};
                            setData(newData);
                          }} 
                        />
                        <Label htmlFor={field.id} className="cursor-pointer">{field.label}</Label>
                      </div>
                    )}
                  </div>
                )}
                {field.type === 'link_button' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(`/s/${field.options?.[0]}`, '_blank')}
                  >
                    {field.placeholder || "View"}
                  </Button>
                )}
                {field.type === 'hmr' && (
                  <div className="flex items-center gap-2">
                    <Input 
                      required={field.required} 
                      placeholder="0000:00" 
                      pattern="^\d+:[0-5]\d$"
                      title="Format: HHHH:MM (e.g., 1000:40)"
                      value={formData[field.label] || ''} 
                      onChange={e => setData({...formData, [field.label]: e.target.value})} 
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">HHH:MM</span>
                  </div>
                )}
                {field.type === 'file' && (
                  <div className="space-y-2">
                    <Input 
                      type="file" 
                      required={field.required}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // In a real app, we'd upload to S3/Cloudinary
                          // For this prototype, we'll store the filename or base64
                          setData({...formData, [field.label]: file.name});
                        }
                      }} 
                    />
                    <p className="text-xs text-slate-500">Max file size: 5MB</p>
                  </div>
                )}
                {field.type === "repeater" && (
                  <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {field.repeaterFields?.map((sf: any) => (
                              <th key={sf.id} className="text-left py-2 px-2 font-semibold text-slate-600">
                                {sf.label}
                              </th>
                            ))}
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(formData[field.label] || [{} ]).map((row: any, rowIndex: number) => (
                            <tr key={rowIndex} className="border-b last:border-0">
                              {field.repeaterFields?.map((sf: any) => (
                                <td key={sf.id} className="py-2 px-1">
                                  {sf.type === "text" && (
                                    <Input
                                      value={row[sf.label] || ""}
                                      onChange={(e) => {
                                        const newRows = [...(formData[field.label] || [{}])];
                                        newRows[rowIndex] = { ...newRows[rowIndex], [sf.label]: e.target.value };
                                        setData({ ...formData, [field.label]: newRows });
                                      }}
                                      className="h-8 text-xs bg-white"
                                    />
                                  )}
                                  {sf.type === "number" && (
                                    <Input
                                      type="number"
                                      value={row[sf.label] || ""}
                                      onChange={(e) => {
                                        const newRows = [...(formData[field.label] || [{}])];
                                        newRows[rowIndex] = { ...newRows[rowIndex], [sf.label]: e.target.value };
                                        setData({ ...formData, [field.label]: newRows });
                                      }}
                                      className="h-8 text-xs bg-white"
                                    />
                                  )}
                                  {sf.type === "date" && (
                                    <Input
                                      type="date"
                                      value={row[sf.label] || ""}
                                      onChange={(e) => {
                                        const newRows = [...(formData[field.label] || [{}])];
                                        newRows[rowIndex] = { ...newRows[rowIndex], [sf.label]: e.target.value };
                                        setData({ ...formData, [field.label]: newRows });
                                      }}
                                      className="h-8 text-xs bg-white"
                                    />
                                  )}
                                  {sf.type === "select" && (
                                    <Select
                                      value={row[sf.label] || ""}
                                      onValueChange={(v) => {
                                        const newRows = [...(formData[field.label] || [{}])];
                                        newRows[rowIndex] = { ...newRows[rowIndex], [sf.label]: v };
                                        setData({ ...formData, [field.label]: newRows });
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs bg-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {sf.options?.map((opt: string) => (
                                          <SelectItem key={opt} value={opt}>
                                            {opt}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </td>
                              ))}
                              <td className="py-2 px-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => {
                                    const newRows = formData[field.label].filter((_: any, i: number) => i !== rowIndex);
                                    setData({ ...formData, [field.label]: newRows.length ? newRows : [{}] });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full bg-white border-dashed"
                      onClick={() => {
                        const newRows = [...(formData[field.label] || []), {}];
                        setData({ ...formData, [field.label]: newRows });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Item
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {!hasLinkButton && (
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} 
                Submit Response
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
