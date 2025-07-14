import React, { useState } from "react";
import {
  Pencil,
  Trash2,
  Wand2,
  CheckCircle,
  Clipboard,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ProjectCard({
  proj,
  index,
  onEdit,
  onDelete,
  onRewrite,
  onApprove,
}) {
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);

  const [modalContent, setModalContent] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [showModal, setShowModal] = useState(false);

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

  const openModal = (title, content) => {
    setModalTitle(title);
    setModalContent(content);
    setShowModal(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
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

      {/* Content Buttons */}
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          variant="outline"
          onClick={() => openModal("Raw Input", proj.rawInput || "N/A")}
        >
          📄 Raw Input
        </Button>

        <Button
          variant="outline"
          disabled={!proj.semanticOutput}
          onClick={() =>
            openModal("Semantic Output", proj.semanticOutput || "N/A")
          }
        >
          🧠 Semantic Output
        </Button>

        <Button
          variant="outline"
          disabled={!proj.portfolioOutput}
          onClick={() =>
            openModal("Portfolio Output", proj.portfolioOutput || "N/A")
          }
        >
          📚 Portfolio Output
        </Button>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-semibold">{modalTitle}</DialogTitle>
              <button
                className="text-gray-500 hover:text-gray-800"
                onClick={() => copyToClipboard(modalContent)}
                title="Copy to clipboard"
              >
                <Clipboard className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>


          <div className="whitespace-pre-wrap text-sm text-gray-800 overflow-y-auto max-h-[70vh]">
            {modalContent}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
