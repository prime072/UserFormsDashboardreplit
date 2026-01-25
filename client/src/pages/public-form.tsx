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
import { Loader2, Send, Lock } from "lucide-react";

export default function PublicForm() {
  const [match, params] = useRoute("/s/:id");
  const [, setLocation] = useLocation();
  const { submitResponse, responses } = useForms();
  const { toast } = useToast();
  
  const formId = params?.id;
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privateUser, setPrivateUser] = useState<any>(null);
  const [loginCredentials, setLoginCredentials] = useState({ userId: "", password: "" });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`);
        if (response.ok) {
          const data = await response.json();
          setForm(data);
        }
      } catch (error) {
        console.error("Error fetching form:", error);
      } finally {
        setLoading(false);
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  useEffect(() => {
    if (form && form.allowEditing === false) {
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
      const { submissionId } = await submitResponse(form.id, formData);
      toast({ title: "Submitted", description: "Your response has been recorded." });
      setLocation(`/s/${form.id}/confirmation/${submissionId}`);
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
                  <div className="flex items-center gap-2 py-2">
                    <Checkbox 
                      id={field.id} 
                      checked={!!formData[field.label]}
                      onCheckedChange={v => setData({...formData, [field.label]: !!v})} 
                    />
                    <Label htmlFor={field.id} className="cursor-pointer">{field.label}</Label>
                  </div>
                )}
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Submit Response</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
