import React, { useState } from "react";
import {
  Pencil,
  Trash2,
  Wand2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ProjectCard({
  proj,
  index,
  onEdit,
  onDelete,
  onRewrite,
  onApprove,
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);

  const handleRewrite = async () => {
    setLoadingRewrite(true);
    await onRewrite(proj._id);
    toast.success("Rewrite complete");
    setLoadingRewrite(false);
  };

  const handleApprove = async () => {
    setLoadingApprove(true);
    await onApprove(proj._id);
    toast.success("Approved");
    setLoadingApprove(false);
  };

  return (
    <div className="flex flex-col gap-3 p-6 bg-white border rounded-lg shadow-sm hover:shadow-md transition">
      {/* Top row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">#{index + 1}</span>
          <h2 className="text-xl font-semibold">{proj.title}</h2>
          <Badge
            variant={
              proj.status === "approved"
                ? "success"
                : proj.status === "rewritten"
                ? "secondary"
                : "outline"
            }
          >
            {proj.status}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <Pencil className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRewrite}
            title="Rewrite"
            disabled={loadingRewrite}
          >
            {loadingRewrite ? (
              <Wand2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wand2 className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleApprove}
            title="Approve"
            disabled={loadingApprove || proj.status === "approved"}
          >
            {loadingApprove ? (
              <CheckCircle className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Delete">
                <Trash2 className="w-5 h-5 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white"
                  onClick={() => onDelete(proj._id)}
                >
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Toggle show/hide content */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 flex items-center gap-1"
        >
          {expanded ? (
            <>
              Hide Details <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show Details <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="bg-gray-50 p-4 rounded-md space-y-3 text-sm">
          <div>
            <strong className="block mb-1 text-gray-700">Raw Input:</strong>
            <p className="whitespace-pre-line">{proj.rawInput || "N/A"}</p>
          </div>
          <div>
            <strong className="block mb-1 text-gray-700">Rewritten:</strong>
            <p className="whitespace-pre-line">
              {proj.rewrittenOutput || "N/A"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
``