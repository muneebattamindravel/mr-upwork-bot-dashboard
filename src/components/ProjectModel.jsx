import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LoadingButton from "@/components/ui/loading-button";
import { toast } from "sonner";

export default function ProjectModal({ open, onOpenChange, onSave, initialData }) {
  const [form, setForm] = useState({ title: "", toolsAndTech: "", rawInput: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title,
        toolsAndTech: initialData.toolsAndTech.join(", "),
        rawInput: initialData.rawInput,
      });
    } else {
      setForm({ title: "", toolsAndTech: "", rawInput: "" });
    }
  }, [initialData]);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await onSave({
        title: form.title,
        toolsAndTech: form.toolsAndTech.split(",").map((t) => t.trim()),
        rawInput: form.rawInput,
      });
      toast.success(initialData ? "Project updated" : "Project added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[80vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Project" : "Add Project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="Tools & Tech (comma separated)"
            value={form.toolsAndTech}
            onChange={(e) => setForm({ ...form, toolsAndTech: e.target.value })}
          />
          <Textarea
            placeholder="Raw Project Description"
            rows={20}
            value={form.rawInput}
            onChange={(e) => setForm({ ...form, rawInput: e.target.value })}
          />
          <LoadingButton loading={saving} onClick={handleSubmit}>
            {initialData ? "Update Project" : "Add Project"}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
