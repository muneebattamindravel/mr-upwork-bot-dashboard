import React, { useEffect, useState } from "react";
import LoadingButton from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Search, Clipboard } from "lucide-react";
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
  const [assistantId, setAssistantId] = useState("");
  const [savingAssistantId, setSavingAssistantId] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingGenerate, setLoadingGenerate] = useState(false);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoadingProfiles(true);
        const res = await api.getProfiles();
        const all = res.data.data.profiles || [];
        setProfiles(all);
        if (all.length > 0) {
          setSelectedProfileId(all[0]._id);
          setAssistantId(all[0].assistantId || "");
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

    const selectedProfile = profiles.find((p) => p._id === selectedProfileId);
    if (selectedProfile) {
      setAssistantId(selectedProfile.assistantId || "");
    }

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
  }, [selectedProfileId, profiles]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = projects.filter((p) =>
        p.title?.toLowerCase().includes(query)
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);



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
      const res = await api.listProjects(selectedProfileId);
      setProjects(res.data.data || []);
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
      const res = await api.listProjects(selectedProfileId);
      setProjects(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete project");
    }
  };

  const handleRewrite = async (projId) => {
    try {
      await api.rewriteProject(projId);
      toast.success("Project rewritten");
      const res = await api.listProjects(selectedProfileId);
      setProjects(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to rewrite project");
    }
  };

  const handleApprove = async (projId) => {
    try {
      await api.approveProject(projId);
      toast.success("Project approved");
      const res = await api.listProjects(selectedProfileId);
      setProjects(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve project");
    }
  };

  const handleGenerateAndDownloadKB = async () => {
    try {
      if (!selectedProfileId) return;

      setLoadingGenerate(true);

      const response = await api.generateAndDownloadKB(selectedProfileId);

      const blob = new Blob([response.data], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', `${selectedProfile.profileName}_Semantic.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(".md Generated & Downloaded.");
    } catch (error) {
      console.error('Error generating/downloading KB:', error);
      toast.error('Failed to generate and download KB');
      setLoadingGenerate(false);
    }
    finally {
      setLoadingGenerate(false);
    }
  };

  const handleSaveAssistantId = async () => {
    if (!selectedProfileId) return;
    try {
      setSavingAssistantId(true);
      await api.saveAssistantId(selectedProfileId, assistantId);
      toast.success("Assistant ID saved.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save Assistant ID");
    } finally {
      setSavingAssistantId(false);
    }
  };

  const selectedProfile = profiles.find((p) => p._id === selectedProfileId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Semantic Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Top Actions */}
          <div className="flex flex-col md:flex-row md:items-end md:gap-4 gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
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

              <LoadingButton loading={loadingGenerate} onClick={handleGenerateAndDownloadKB}>
                Generate & Download KB
              </LoadingButton>

              <LoadingButton onClick={handleAddOrEdit}>
                <Plus className="w-4 h-4 mr-1" /> Add Project
              </LoadingButton>
            </div>
          </div>

          {/* Assistant ID */}
          <div className="flex flex-col md:flex-row md:items-end md:gap-4 gap-2">
            <input
              className="border border-gray-300 rounded-md px-3 py-2 w-full md:w-80 text-sm"
              type="text"
              value={assistantId}
              onChange={(e) => setAssistantId(e.target.value)}
              placeholder="OpenAI Assistant ID..."
            />
            <LoadingButton
              loading={savingAssistantId}
              onClick={handleSaveAssistantId}
            >
              Save Assistant ID
            </LoadingButton>
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
