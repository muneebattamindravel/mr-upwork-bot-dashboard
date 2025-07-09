import React, { useEffect, useState } from "react";
import LoadingButton from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
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
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [loadingGenerate, setLoadingGenerate] = useState(false);

    // Load profiles on mount
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

    // Load projects when profile changes
    useEffect(() => {
        if (!selectedProfileId) return;

        const selectedProfile = profiles.find(p => p._id === selectedProfileId);
        if (selectedProfile) {
            setAssistantId(selectedProfile.assistantId || "");
        }

        const loadProjects = async () => {
            try {
                setLoadingProjects(true);
                const res = await api.listProjects(selectedProfileId);
                setProjects(res.data.data || []);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load projects");
            } finally {
                setLoadingProjects(false);
            }
        };

        loadProjects();
    }, [selectedProfileId, profiles]);

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
            setModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save project");
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

    const handleGenerateKB = async () => {
        if (!selectedProfileId) return;
        try {
            setLoadingGenerate(true);
            await api.generateKB(selectedProfileId);
            toast.success("Knowledge Base file generated.");

            const res = await api.getProfiles();
            setProfiles(res.data.data.profiles || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate KB");
        } finally {
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
    const backendBaseUrl = import.meta.env.VITE_API_URL;
    const staticBaseUrl = backendBaseUrl.endsWith('/api')
        ? backendBaseUrl.slice(0, -4)
        : backendBaseUrl;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Semantic Knowledge Base</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                            <label className="font-medium">Select Profile</label>
                            <Select
                                value={selectedProfileId}
                                onValueChange={setSelectedProfileId}
                            >
                                <SelectTrigger className="select-trigger w-full">
                                    <SelectValue placeholder="Select a profile" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-gray-200 shadow-md rounded-md">
                                    {loadingProfiles && (
                                        <div className="select-content p-2 text-gray-500 text-sm">
                                            Loading profiles...
                                        </div>
                                    )}
                                    {profiles.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>
                                            {p.profileName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 w-full md:w-auto">
                            <LoadingButton loading={loadingGenerate} onClick={handleGenerateKB}>
                                Generate KB
                            </LoadingButton>
                            <LoadingButton loading={false} onClick={handleAddOrEdit}>
                                <Plus className="mr-2 w-4 h-4" /> Add Project
                            </LoadingButton>
                        </div>

                    </div>

                    <div>
                        <label className="font-medium">Assistant ID</label>
                        <input
                            className="input input-bordered w-full mt-1"
                            type="text"
                            value={assistantId}
                            onChange={(e) => setAssistantId(e.target.value)}
                            placeholder="OpenAI Assistant ID..."
                        />
                        <LoadingButton
                            loading={savingAssistantId}
                            onClick={handleSaveAssistantId}
                            className="mt-2"
                        >
                            Save Assistant ID
                        </LoadingButton>
                    </div>

                    {selectedProfile?.kbFileUrl && (
                        <div className="flex flex-col gap-2">
                            <a
                                href={`${staticBaseUrl}${selectedProfile.kbFileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                            >
                                📄 View KB
                            </a>

                            <a
                                href={`${staticBaseUrl}/semantic-knowledge-base-files/download/${selectedProfile.kbFileUrl.split("/").pop()}`}
                                className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-100"
                            >
                                ⬇️ Download KB
                            </a>
                        </div>
                    )}

                </CardContent>
            </Card>

            <div className="grid gap-4">
                {loadingProjects && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                )}
                {!loadingProjects && projects.length === 0 && (
                    <div className="text-center text-gray-500">
                        No projects for this profile yet.
                    </div>
                )}
                {projects.map((proj, i) => (
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
