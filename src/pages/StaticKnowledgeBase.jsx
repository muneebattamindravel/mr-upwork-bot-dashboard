'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Trash2, BookOpen } from 'lucide-react';
import { JsonEditor } from 'json-edit-react';
import LoadingButton from '@/components/ui/loading-button';

import {
  getKBList,
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile,
  toggleProfileEnabled,
} from '../apis/kb';

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const StaticKnowledgeBase = () => {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [keywordsText, setKeywordsText] = useState('');
  const [projectsText, setProjectsText] = useState('');
  const [weightsJson, setWeightsJson] = useState({});
  const [newProfileName, setNewProfileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingFile, setSavingFile] = useState(null);

  const loadProfiles = async () => {
    try {
      const response = await getKBList();
      const profilesList = response.data.data.profiles || [];
      setProfiles(profilesList);

      if (profilesList.length > 0) {
        setSelectedProfile(profilesList[0]);
        fetchProfile(profilesList[0]._id);
      } else {
        setSelectedProfile(null);
        setKeywordsText('');
        setProjectsText('');
        setWeightsJson({});
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
      toast.error('Error loading profiles');
    }
  };

  const fetchProfile = async (profileId) => {
    if (!profileId) return;

    setKeywordsText('');
    setProjectsText('');
    setWeightsJson({});

    try {
      const res = await getProfile(profileId);
      const p = res.data.data.profile;
      setSelectedProfile(p);
      setKeywordsText(p.keywords || '');
      setProjectsText(p.projects || '');
      setWeightsJson(p.weights || {});
    } catch (err) {
      console.error('❌ Failed to load profile:', err);
      toast.error('Failed to load profile');
    }
  };

  const handleSaveKeywords = async () => {
    if (!selectedProfile) return;
    setSavingFile('keywords');
    try {
      await updateProfile(selectedProfile._id, { keywords: keywordsText });
      toast.success('Keywords saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save keywords');
    } finally {
      setSavingFile(null);
    }
  };

  const handleSaveProjects = async () => {
    if (!selectedProfile) return;
    setSavingFile('projects');
    try {
      await updateProfile(selectedProfile._id, { projects: projectsText });
      toast.success('Projects saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save projects');
    } finally {
      setSavingFile(null);
    }
  };

  const handleSaveWeights = async () => {
    if (!selectedProfile) return;
    setSavingFile('weights');
    try {
      await updateProfile(selectedProfile._id, { weights: weightsJson });
      toast.success('Weights saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save weights');
    } finally {
      setSavingFile(null);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return toast.error('Enter a profile name');
    setLoading(true);
    try {
      await createProfile({ profileName: newProfileName.trim() });
      toast.success('Profile created');
      setNewProfileName('');
      await loadProfiles();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create profile');
    }
    setLoading(false);
  };

  const handleSelectProfile = (id) => {
    fetchProfile(id);
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    try {
      await deleteProfile(selectedProfile._id);
      toast.success(`Profile "${selectedProfile.profileName}" deleted`);
      await loadProfiles();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete profile');
    }
  };

  const handleToggleEnabled = async (e) => {
    if (!selectedProfile) return;
    try {
      await toggleProfileEnabled(selectedProfile._id, e.target.checked);
      toast.success(`Profile ${e.target.checked ? 'enabled' : 'disabled'}`);
      await loadProfiles();
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle status');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      loadProfiles();
    }
  }, [navigate]);

  return (
    <div className="p-4 max-w-screen-xl w-full space-y-6 mx-auto">
      <div className="bg-white shadow-md rounded-md p-4 space-y-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpen className="w-6 h-6" /> Static Knowledge Base Manager
        </h1>
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <Input
            className="input-field"
            placeholder="Enter new profile name"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateProfile();
            }}
          />
          <LoadingButton loading={loading} onClick={handleCreateProfile}>
            Create Profile
          </LoadingButton>
        </div>

        {profiles.length > 0 ? (
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="w-full md:w-1/2">
              <Select
                onValueChange={handleSelectProfile}
                value={selectedProfile?._id || ''}
              >
                <SelectTrigger className="select-trigger w-full">
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent className="select-content">
                  {profiles.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.profileName} {p.enabled ? '' : '(Disabled)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProfile && (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedProfile.enabled}
                    onChange={handleToggleEnabled}
                  />
                  <span className="text-sm">Enabled</span>
                </label>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="btn-danger flex items-center gap-1">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white text-black rounded-md shadow-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete "{selectedProfile.profileName}"?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the profile.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="btn-outline">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteProfile}
                        className="btn-danger"
                      >
                        Yes, delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        ) : (
          <p className="text-gray-600 text-sm">
            No profiles found. Please create one to get started.
          </p>
        )}
      </div>

      {selectedProfile ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-md shadow-md">
              <label className="field-label">Keywords</label>
              <Textarea
                className="w-full rounded-md border p-2 min-h-[350px]"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="Keywords..."
              />
              <LoadingButton
                onClick={handleSaveKeywords}
                loading={savingFile === 'keywords'}
                className="mt-2"
              >
                Save Keywords
              </LoadingButton>
            </div>

            <div className="bg-white p-4 rounded-md shadow-md">
              <label className="field-label">Projects</label>
              <Textarea
                className="w-full rounded-md border p-2 min-h-[350px]"
                value={projectsText}
                onChange={(e) => setProjectsText(e.target.value)}
                placeholder="Projects..."
              />
              <LoadingButton
                onClick={handleSaveProjects}
                loading={savingFile === 'projects'}
                className="mt-2"
              >
                Save Projects
              </LoadingButton>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-md space-y-4">
            <label className="field-label">Weights</label>
            <JsonEditor
              data={weightsJson}
              setData={setWeightsJson}
              className="json-editor text-sm"
            />
            <LoadingButton
              onClick={handleSaveWeights}
              loading={savingFile === 'weights'}
              className="mt-2"
            >
              Save Weights
            </LoadingButton>
          </div>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-md shadow-md">
          <p className="text-gray-600 text-center">
            No profile selected. Please create one above.
          </p>
        </div>
      )}
    </div>
  );
};

export default StaticKnowledgeBase;
