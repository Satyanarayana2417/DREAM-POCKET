import { useState } from "react";
import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { Mail, ChevronRight, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactSupport() {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center px-4 pt-2 pb-6">
        <h2 className="text-lg font-bold text-foreground">Need help with Expense Manager?</h2>
        <p className="text-[14px] text-muted-foreground mt-1">Our support team is here for you.</p>
      </div>

      <SettingsGroup>
        <SettingsRow
          icon={Mail}
          iconBg="bg-blue-500"
          title="Email Support"
          onClick={() => window.location.href = "mailto:snsnarayanac@gmail.com"}
        />
      </SettingsGroup>
    </div>
  );
}

export function ReportProblem() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-card p-5 rounded-[24px] border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center size-10 rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="size-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Report a Problem</h2>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); alert("Report submitted successfully."); setTitle(""); setDesc(""); }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground ml-1">Problem Title</label>
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-muted border-0 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-slate-300"
              placeholder="Brief summary of the issue"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground ml-1">Description</label>
            <Textarea 
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="bg-muted border-0 min-h-[120px] rounded-xl px-4 py-3 focus-visible:ring-1 focus-visible:ring-slate-300 resize-none"
              placeholder="Please provide details about what went wrong..."
              required
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl mt-6 text-[15px] font-semibold bg-amber-500 hover:bg-amber-600 text-white">
            Submit Report
          </Button>
        </form>
      </div>
    </div>
  );
}

export function SendFeedback() {
  const [desc, setDesc] = useState("");
  
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-card p-5 rounded-[24px] border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 text-emerald-600">
            <MessageSquare className="size-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Send Feedback</h2>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); alert("Feedback sent! Thank you."); setDesc(""); }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground ml-1">Tell us what you think...</label>
            <Textarea 
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="bg-muted border-0 min-h-[150px] rounded-xl px-4 py-3 focus-visible:ring-1 focus-visible:ring-slate-300 resize-none"
              placeholder="I love the app, but it would be great if..."
              required
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl mt-6 text-[15px] font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
            Send Feedback
          </Button>
        </form>
      </div>
    </div>
  );
}
