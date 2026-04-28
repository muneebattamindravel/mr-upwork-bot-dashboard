'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, BookOpen, Plus, X, Search, CheckCircle2 } from 'lucide-react';
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseKeywords  = (text) => (text || '').split('\n').map(k => k.trim()).filter(Boolean);
const serializeKeywords = (arr) => arr.join('\n');

const StaticKnowledgeBase = () => {
  const navigate = useNavigate();

  const [profiles, setProfiles]           = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [keywords, setKeywords]           = useState([]);   // array of strings
  const [weightsJson, setWeightsJson]     = useState({});
  const [newProfileName, setNewProfileName] = useState('');
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightsChanged, setWeightsChanged] = useState(false);
  const [keywordSearch, setKeywordSearch] = useState('');
  const [newKeyword, setNewKeyword]       = useState('');

  const weightsTimerRef = useRef(null);
  const addInputRef     = useRef(null);

  // ── Profile loading ────────────────────────────────────────────────────────
  const loadProfiles = async () => {
    try {
      const res = await getKBList();
      const list = res.data.data.profiles || [];
      setProfiles(list);
      if (list.length > 0) {
        setSelectedProfile(list[0]);
        fetchProfile(list[0]._id);
      } else {
        setSelectedProfile(null);
        setKeywords([]);
        setWeightsJson({});
      }
    } catch {
      toast.error('Error loading profiles');
    }
  };

  const fetchProfile = async (profileId) => {
    if (!profileId) return;
    setKeywords([]);
    setWeightsJson({});
    setWeightsChanged(false);
    try {
      const res = await getProfile(profileId);
      const p = res.data.data.profile;
      setSelectedProfile(p);
      setKeywords(parseKeywords(p.keywords));
      setWeightsJson(p.weights || {});
    } catch {
      toast.error('Failed to load profile');
    }
  };

  // ── Keyword CRUD — auto-saves immediately on each change ───────────────────
  const persistKeywords = async (kws) => {
    if (!selectedProfile) return;
    setSavingKeywords(true);
    try {
      await updateProfile(selectedProfile._id, { keywords: serializeKeywords(kws) });
      toast.success('Saved', { duration: 1200 });
    } catch {
      toast.error('Failed to save keywords');
    } finally {
      setSavingKeywords(false);
    }
  };

  const handleAddKeyword = async () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    if (keywords.includes(kw)) { toast.error('Already exists'); return; }
    const updated = [...keywords, kw];
    setKeywords(updated);
    setNewKeyword('');
    addInputRef.current?.focus();
    await persistKeywords(updated);
  };

  const handleDeleteKeyword = async (kw) => {
    const updated = keywords.filter(k => k !== kw);
    setKeywords(updated);
    await persistKeywords(updated);
  };

  // ── Weights — debounced auto-save (2 s after last edit) ───────────────────
  const handleWeightsChange = (newData) => {
    setWeightsJson(newData);
    setWeightsChanged(true);
    if (weightsTimerRef.current) clearTimeout(weightsTimerRef.current);
    weightsTimerRef.current = setTimeout(async () => {
      if (!selectedProfile) return;
      setSavingWeights(true);
      try {
        await updateProfile(selectedProfile._id, { weights: newData });
        setWeightsChanged(false);
        toast.success('Weights saved', { duration: 1200 });
      } catch {
        toast.error('Failed to save weights');
      } finally {
        setSavingWeights(false);
      }
    }, 2000);
  };

  // ── Profile management ────────────────────────────────────────────────────
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return toast.error('Enter a profile name');
    setCreatingProfile(true);
    try {
      await createProfile({ profileName: newProfileName.trim() });
      toast.success('Profile created');
      setNewProfileName('');
      await loadProfiles();
    } catch {
      toast.error('Failed to create profile');
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    try {
      await deleteProfile(selectedProfile._id);
      toast.success(`"${selectedProfile.profileName}" deleted`);
      await loadProfiles();
    } catch {
      toast.error('Failed to delete profile');
    }
  };

  const handleToggleEnabled = async (e) => {
    if (!selectedProfile) return;
    try {
      await toggleProfileEnabled(selectedProfile._id, e.target.checked);
      toast.success(`Profile ${e.target.checked ? 'enabled' : 'disabled'}`);
      await loadProfiles();
    } catch {
      toast.error('Failed to toggle');
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login');
    else loadProfiles();
  }, [navigate]);

  // ── Derived keyword lists ──────────────────────────────────────────────────
  const filtered       = keywordSearch
    ? keywords.filter(k => k.toLowerCase().includes(keywordSearch.toLowerCase()))
    : keywords;
  const activeKeywords  = filtered.filter(k => !k.startsWith('#'));
  const commentKeywords = filtered.filter(k => k.startsWith('#'));
  const totalActive     = keywords.filter(k => !k.startsWith('#')).length;

  return (
    <div className="p-4 max-w-screen-xl w-full space-y-4 mx-auto">

      {/* Page title */}
      <h2 className="page-title">🔑 Static Knowledge Base</h2>

      {/* ── Profile bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border rounded-lg p-3 flex flex-wrap items-center gap-3">

        {/* Selector */}
        {profiles.length > 0 ? (
          <Select onValueChange={id => fetchProfile(id)} value={selectedProfile?._id || ''}>
            <SelectTrigger className="h-8 text-sm w-40 sm:w-52">
              <SelectValue placeholder="Select a profile" />
            </SelectTrigger>
            <SelectContent className="bg-white text-black text-sm">
              {profiles.map(p => (
                <SelectItem key={p._id} value={p._id}>
                  {p.profileName}{!p.enabled && ' (Disabled)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-gray-400">No profiles yet</span>
        )}

        {/* Active toggle */}
        {selectedProfile && (
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={!!selectedProfile.enabled}
              onChange={handleToggleEnabled} className="accent-purple-600 w-4 h-4" />
            <span className="text-gray-600">Active</span>
          </label>
        )}

        {/* Delete */}
        {selectedProfile && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete Profile
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white text-black rounded-md shadow-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{selectedProfile.profileName}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the profile, all its keywords and weights.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProfile}
                  className="bg-red-600 hover:bg-red-700 text-white">
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <div className="w-px h-6 bg-gray-200 hidden sm:block" />

        {/* Create new profile */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            placeholder="New profile name…"
            value={newProfileName}
            onChange={e => setNewProfileName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateProfile(); }}
            className="h-8 text-sm w-36 sm:w-44 flex-1 max-w-[176px]"
          />
          <LoadingButton loading={creatingProfile} onClick={handleCreateProfile}
            className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded font-medium">
            + Create
          </LoadingButton>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      {selectedProfile ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Keywords panel ────────────────────────────────────────────────── */}
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">🔑 Keywords</span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  {totalActive} active
                </span>
                {keywords.filter(k => k.startsWith('#')).length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {keywords.filter(k => k.startsWith('#')).length} commented
                  </span>
                )}
              </div>
              {savingKeywords && (
                <span className="text-xs text-gray-400 animate-pulse">Saving…</span>
              )}
            </div>

            {/* Search / filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <Input
                value={keywordSearch}
                onChange={e => setKeywordSearch(e.target.value)}
                placeholder="Filter keywords…"
                className="h-8 text-sm pl-8 pr-7"
              />
              {keywordSearch && (
                <button onClick={() => setKeywordSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tag cloud */}
            <div className="min-h-[220px] max-h-[400px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3 flex flex-wrap gap-2 content-start">
              {activeKeywords.length === 0 && commentKeywords.length === 0 && (
                <p className="text-sm text-gray-400 w-full text-center pt-10">
                  {keywordSearch ? 'No keywords match your search.' : 'No keywords yet — add one below.'}
                </p>
              )}

              {/* Active keywords */}
              {activeKeywords.map(kw => (
                <span key={kw}
                  className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  {kw}
                  <button onClick={() => handleDeleteKeyword(kw)}
                    className="text-purple-400 hover:text-red-500 transition-colors ml-0.5"
                    title="Remove keyword">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Commented-out keywords */}
              {commentKeywords.map(kw => (
                <span key={kw}
                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 text-xs italic px-2.5 py-1 rounded-full"
                  title="Commented out — not used in scoring">
                  {kw}
                  <button onClick={() => handleDeleteKeyword(kw)}
                    className="text-gray-300 hover:text-red-400 transition-colors ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add keyword row */}
            <div className="flex items-center gap-2">
              <Input
                ref={addInputRef}
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddKeyword(); }}
                placeholder="Type a keyword and press Enter…"
                className="h-8 text-sm flex-1"
              />
              <button onClick={handleAddKeyword}
                className="h-8 w-8 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors shrink-0"
                title="Add keyword">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Each keyword is matched against job titles, descriptions &amp; categories.
              Prefix with <code className="bg-gray-100 px-1 rounded text-[11px]">#</code> to
              temporarily disable a keyword without deleting it.
            </p>
          </div>

          {/* ── Weights panel ─────────────────────────────────────────────────── */}
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-3">

            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">⚖️ Scoring Weights</span>
              <div className="flex items-center gap-2 text-xs">
                {savingWeights && (
                  <span className="text-gray-400 animate-pulse">Saving…</span>
                )}
                {!savingWeights && weightsChanged && (
                  <span className="text-amber-600 font-medium">● Unsaved changes</span>
                )}
                {!savingWeights && !weightsChanged && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Changes auto-save 2 seconds after you stop editing.
            </p>

            <div className="flex-1 overflow-y-auto max-h-[500px]">
              <JsonEditor
                data={weightsJson}
                setData={handleWeightsChange}
                className="json-editor text-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-12 flex flex-col items-center gap-3 text-center">
          <BookOpen className="w-10 h-10 text-gray-300" />
          <p className="text-gray-500">Create a profile above to get started.</p>
        </div>
      )}
    </div>
  );
};

export default StaticKnowledgeBase;
