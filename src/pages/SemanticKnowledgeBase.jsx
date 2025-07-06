import React, { useEffect, useState } from "react";
import LoadingButton from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/apis/semanticKb";
import ProjectModal from "../components/ProjectModel";
import ProjectCard from "../components/ProjectCard";

export default function SemanticKnowledgeBase() {
    const [profiles, setProfiles] = useState([]);
    const [selectedProfileId, setSelectedProfileId] = useState("");
    const [projects, setProjects] = useState([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    // Load profiles
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

    // Load projects when profile changes
    useEffect(() => {
        const loadProjects = async () => {
            if (!selectedProfileId) return;
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
    }, [selectedProfileId]);

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

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Semantic Knowledge Base</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label className="font-medium">Select Profile</label>
                        <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                            <SelectTrigger className="select-trigger w-full">
                                <SelectValue placeholder="Select a profile" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-md rounded-md">
                                {loadingProfiles && (
                                    <div className="select-content p-2 text-gray-500 text-sm">Loading profiles...</div>
                                )}
                                {profiles.map((p) => (
                                    <SelectItem key={p._id} value={p._id}>
                                        {p.profileName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <LoadingButton loading={false} onClick={handleAddOrEdit}>
                        <Plus className="mr-2 w-4 h-4" /> Add Project
                    </LoadingButton>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {loadingProjects && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                )}
                {!loadingProjects && projects.length === 0 && (
                    <div className="text-center text-gray-500">No projects for this profile yet.</div>
                )}
                {projects.map((proj, i) => (
                    <ProjectCard
                        key={proj._id}
                        proj={proj}
                        index={i}   // ✅ pass index here!
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
