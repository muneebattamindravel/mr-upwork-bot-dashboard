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

import {
  getKBList,
  createProfile,
  loadFile,
  saveFile,
  deleteProfile,
} from '../apis/kb';

const KBManager = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [navigate]);

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
      const data = response.data.data;
      const profilesList = data.profiles || [];
      setProfiles(profilesList);
      if (profilesList.length > 0) {
        const firstProfile = profilesList[0];
        setSelectedProfile(firstProfile);
        fetchProfileFiles(firstProfile);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
      toast.error('Error loading profiles');
    }
  };

  const fetchProfileFiles = async (profileName) => {
    setKeywordsText('');
    setProjectsText('');
    setWeightsJson({});

    try {
      const [keywordsRes, projectsRes, weightsRes] = await Promise.all([
        loadFile(profileName, 'keywords.txt'),
        loadFile(profileName, 'projects.md'),
        loadFile(profileName, 'weights.json'),
      ]);

      setKeywordsText(keywordsRes.data.data.content || '');
      setProjectsText(projectsRes.data.data.content || '');

      try {
        const parsed = JSON.parse(weightsRes.data.data.content || '{}');
        setWeightsJson(parsed);
      } catch (jsonErr) {
        toast.error('Invalid weights.json format');
        console.error('Invalid weights.json:', jsonErr);
      }
    } catch (err) {
      console.error('❌ Failed to load profile files:', err);
      toast.error('Failed to load one or more files');
    }
  };

  const handleSaveWeights = async () => {
    setSavingFile('weights.json');
    try {
      const content = JSON.stringify(weightsJson, null, 2);
      await saveFile(selectedProfile, 'weights.json', content);
      toast.success('weights.json saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save weights.json');
    } finally {
      setSavingFile(null); // 🔁 THIS is what stops the loader
    }
  };


  const handleCreateProfile = async () => {
    if (!newProfileName) return toast.error('Enter a profile name');
    setLoading(true);
    try {
      await createProfile({ profileName: newProfileName });
      toast.success('Profile created');
      setNewProfileName('');
      await loadProfiles();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create profile');
    }
    setLoading(false);
  };

  const handleSelectProfile = (value) => {
    setSelectedProfile(value);
    fetchProfileFiles(value);
  };

  const handleSaveFile = async (fileName, content) => {
    if (!selectedProfile) return;
    setSavingFile(fileName);
    try {
      await saveFile(selectedProfile, fileName, content);
      toast.success(`${fileName} saved`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save ${fileName}`);
    }
    setSavingFile(null);
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    try {
      await deleteProfile({ profileName: selectedProfile });
      toast.success(`Profile "${selectedProfile}" deleted`);
      setSelectedProfile(null);
      setKeywordsText('');
      setProjectsText('');
      setWeightsJson({});
      await loadProfiles();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete profile');
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const isInputInvalid =
    newProfileName.trim() === '' ||
    !/^[a-zA-Z0-9_-]+$/.test(newProfileName) ||
    newProfileName.length > 20;

  return (
    <div className="p-4 max-w-screen-xl w-full space-y-6 mx-auto">
      {/* Header */}
      <div className="bg-white shadow-md rounded-md p-4 space-y-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpen className="w-6 h-6" /> Knowledge Base Manager
        </h1>
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <Input
            className={`input-field ${newProfileName && isInputInvalid ? 'border-red-500 ring-red-500' : ''}`}
            placeholder="Enter new profile name"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
          />
          <LoadingButton
            loading={loading}
            onClick={handleCreateProfile}
            disabled={isInputInvalid}
          >
            Create Profile
          </LoadingButton>
        </div>

        {/* Profile Selector + Delete */}
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="w-full md:w-1/2">
            <Select onValueChange={handleSelectProfile} value={selectedProfile}>
              <SelectTrigger className="select-trigger w-full">
                <SelectValue placeholder="Select a profile" />
              </SelectTrigger>
              <SelectContent className="select-content">
                {profiles.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedProfile && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="btn-danger flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white text-black rounded-md shadow-xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{selectedProfile}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the profile and its files.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="btn-outline">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteProfile}
                    className="btn-danger"
                  >
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Keywords */}
          <div className="bg-white p-4 rounded-md shadow-md">
            <label className="field-label">Keywords</label>
            <Textarea
              className="textarea-field"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="Contents of keywords.txt"
            />
            <LoadingButton
              onClick={() => handleSaveFile('keywords.txt', keywordsText)}
              loading={savingFile === 'keywords.txt'}
              className="mt-2"
            >
              Save Keywords
            </LoadingButton>
          </div>

          {/* Projects */}
          <div className="bg-white p-4 rounded-md shadow-md">
            <label className="field-label">Projects</label>
            <Textarea
              className="textarea-field"
              value={projectsText}
              onChange={(e) => setProjectsText(e.target.value)}
              placeholder="Contents of projects.md"
            />
            <LoadingButton
              onClick={() => handleSaveFile('projects.md', projectsText)}
              loading={savingFile === 'projects.md'}
              className="mt-2"
            >
              Save Projects
            </LoadingButton>
          </div>
        </div>

        {/* Right Column - Weights JSON */}
        <div className="bg-white p-4 rounded-md shadow-md space-y-4">
          <label className="field-label">Weights</label>
          <JsonEditor
            data={weightsJson}
            setData={setWeightsJson}
            className="json-editor"
          />
          <LoadingButton
            onClick={handleSaveWeights}
            loading={savingFile === 'weights.json'}
            className="mt-2"
          >
            Save Weights
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

export default KBManager;
