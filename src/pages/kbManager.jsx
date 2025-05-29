'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Trash2, BookOpen } from 'lucide-react';
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

  // ✅ Check login token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [keywordsText, setKeywordsText] = useState('');
  const [projectsText, setProjectsText] = useState('');
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

    try {
      const [keywordsRes, projectsRes] = await Promise.all([
        loadFile(profileName, 'keywords.txt'),
        loadFile(profileName, 'projects.md'),
      ]);

      setKeywordsText(keywordsRes.data.data.content || '');
      setProjectsText(projectsRes.data.data.content || '');
    } catch (err) {
      console.error('❌ Failed to load profile files:', err);
      toast.error('Failed to load one or more files');
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
    <div className="p-4 max-w-4xl w-full space-y-6">
      <h1 className="page-title">
        <BookOpen className="w-5 h-5" />
        Knowledge Base Manager
      </h1>

      {/* Create Profile */}
      <div className="flex flex-col md:flex-row items-start gap-2">
        <Input
          className={`input-field flex-1 ${newProfileName && isInputInvalid ? 'border-red-500 ring-red-500' : ''
            }`}
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
      {newProfileName && isInputInvalid && (
        <p className="text-sm text-red-600 mt-1">
          Only letters, numbers, underscores, and hyphens allowed. Max 20 characters.
        </p>
      )}

      {/* Select + Delete Profile */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="w-full md:w-1/2">
          <label className="field-label">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 7V5a2 2 0 012-2h4l2 2h8a2 2 0 012 2v2"></path>
              <path d="M3 7h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"></path>
            </svg>
            Current Profile
          </label>

          <Select onValueChange={handleSelectProfile} value={selectedProfile}>
            <SelectTrigger className="select-trigger w-full">
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent className="select-content">
              {profiles.map((name) => (
                <SelectItem key={name} value={name} className="select-item">
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
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="alert-dialog-content">
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

      {/* Keywords Editor */}
      {selectedProfile && (
        <div>
          <label className="field-label">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.325 4.317a4.73 4.73 0 010 6.689L4.317 17.013a1.2 1.2 0 01-1.689-1.688l6.008-6.007a4.73 4.73 0 016.689 0l.826.826"></path>
              <path d="M20.485 9.171a3 3 0 010 4.243l-5.657 5.657a3 3 0 01-4.243-4.243l5.657-5.657a3 3 0 014.243 0z"></path>
            </svg>
            Keywords
          </label>

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
      )}

      {/* Projects Editor */}
      {selectedProfile && (
        <div>
          <label className="field-label mt-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 7h18M3 12h18M3 17h18"></path>
            </svg>
            Projects
          </label>

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
      )}
    </div>
  );
};

export default KBManager;
