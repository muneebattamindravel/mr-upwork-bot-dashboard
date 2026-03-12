import React, { useEffect, useState } from "react";
import LoadingButton from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/apis/semanticKb";
import ProjectModal from "../components/ProjectModel";
import ProjectCard from "../components/ProjectCard";

export default function SemanticKnowledgeBase() {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [embeddingAll, setEmbeddingAll] = useState(false);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoadingProfiles(true);
        const res = await api.getProfiles();
        const all = res.data.data.profiles || [];
        setProfiles(all);
        if (all.length > 0) {
          setSelectedProfileId(all[0]._id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profiles");
      } finally {
        setLoadingProfiles(false);
      }
    };
    loadProfiles();
  }, []);

  useEffect(() => {
    if (!selectedProfileId) return;
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await api.listProjects(selectedProfileId);
        const projectsList = res.data.data || [];
        setProjects(projectsList);
        setFilteredProjects(projectsList);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load projects");
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, [selectedProfileId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProjects(projects.filter(p => p.title?.toLowerCase().includes(query)));
    }
  }, [searchQuery, projects]);

  const refreshProjects = async () => {
    const res = await api.listProjects(selectedProfileId);
    setProjects(res.data.data || []);
  };

  const handleAddOrEdit = () => {
    setSelectedProject(null);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (selectedProject) {
        await api.updateProject({ projectId: selectedProject._id, ...data });
        toast.success("Project updated");
      } else {
        await api.createProject({ ...data, profileId: selectedProfileId });
        toast.success("Project created");
      }
      await refreshProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save project");
    } finally {
      setModalOpen(false);
    }
  };

  const handleEdit = (proj) => {
    setSelectedProject(proj);
    setModalOpen(true);
  };

  const handleDelete = async (projId) => {
    try {
      await api.deleteProject(projId);
      toast.success("Project deleted");
      await refreshProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete project");
    }
  };

  const handleRewrite = async (projId) => {
    try {
      await api.rewriteProject(projId);
      toast.success("Project rewritten");
      await refreshProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to rewrite project");
    }
  };

  const handleApprove = async (projId) => {
    try {
      await api.approveProject(projId);
      toast.success("Project approved & embedding generated ✅");
      await refreshProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve project");
    }
  };

  const handleEmbedAll = async () => {
    try {
      setEmbeddingAll(true);
      const res = await api.embedAll();
      const { embedded, total, errors } = res.data.data;
      toast.success(`Embedded ${embedded} of ${total} projects`);
      if (errors?.length) {
        console.warn('[embedAll] errors:', errors);
      }
      await refreshProjects();
    } catch (err) {
      console.error(err);
      toast.error("Embed All failed");
    } finally {
      setEmbeddingAll(false);
    }
  };

  // Embedding stats
  const approvedProjects = projects.filter(p => p.status === 'approved');
  const embeddedCount = approvedProjects.filter(p => p.semanticEmbedding?.length > 0).length;
  const needsEmbedding = approvedProjects.length - embeddedCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>Semantic Knowledge Base</span>
            {/* Embedding status badge */}
            {approvedProjects.length > 0 && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                needsEmbedding === 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {embeddedCount}/{approvedProjects.length} embedded
                {needsEmbedding > 0 && ` · ${needsEmbedding} pending`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Top Actions */}
          <div className="flex flex-col md:flex-row md:items-end md:gap-4 gap-4 flex-wrap">
            <div className="w-full md:w-64">
              <label className="font-medium block mb-1">Select Profile</label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md rounded-md">
                  {loadingProfiles && (
                    <div className="p-2 text-gray-500 text-sm">Loading...</div>
                  )}
                  {profiles.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.profileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <LoadingButton onClick={handleAddOrEdit}>
              <Plus className="w-4 h-4 mr-1" /> Add Project
            </LoadingButton>

            {/* Embed All button — only shown when approved projects need embedding */}
            {needsEmbedding > 0 && (
              <LoadingButton
                loading={embeddingAll}
                onClick={handleEmbedAll}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Zap className="w-4 h-4 mr-1" />
                Embed All ({needsEmbedding} pending)
              </LoadingButton>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex items-center border rounded-md px-3 py-2 w-full md:w-80">
            <Search className="w-4 h-4 mr-2 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full focus:outline-none text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Cards */}
      <div className="grid gap-4">
        {loadingProjects && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {!loadingProjects && filteredProjects.length === 0 && (
          <div className="text-center text-gray-500">No projects found.</div>
        )}
        {filteredProjects.map((proj, i) => (
          <ProjectCard
            key={proj._id}
            proj={proj}
            index={i}
            onEdit={() => handleEdit(proj)}
            onDelete={handleDelete}
            onRewrite={handleRewrite}
            onApprove={handleApprove}
          />
        ))}
      </div>

      <ProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        initialData={selectedProject}
      />
    </div>
  );
}
