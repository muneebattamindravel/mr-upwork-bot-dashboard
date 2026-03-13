'use client';

import React, { useEffect, useState } from 'react';
import { getProfile, updateProfile, getKBList } from '../apis/kb';
import { getSraaSettings, updateSraaSettings } from '../apis/sraaSettings';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import LoadingButton from '@/components/ui/loading-button';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, RotateCcw } from 'lucide-react';

// ── Shared sub-components ──────────────────────────────────────────────────────

const PromptTextarea = ({ label, value, onChange, rows = 18 }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
    <textarea
      className="border border-gray-200 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const NumberInput = ({ label, value, onChange, min = 1, max = 20 }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
    <input
      type="number"
      min={min}
      max={max}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-purple-400"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    />
  </div>
);

const TemperatureSlider = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
      {label} <span className="text-purple-600 font-bold">{value}</span>
    </label>
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="accent-purple-600 w-48"
    />
  </div>
);

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];

const ModelSelect = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
    <select
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-purple-400"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
    </select>
  </div>
);

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'static',    label: '🔤 Static Relevance' },
  { id: 'models',    label: '⚙️ AI Models & RAG' },
  { id: 'scoring',   label: '🎯 Scoring Prompt' },
  { id: 'proposals', label: '📝 Proposal Prompts' },
  { id: 'playground',label: '🧪 Playground Prompt' },
  { id: 'rewrite',   label: '🔁 Rewrite Prompts' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

const RelevanceSettings = () => {
  const [activeTab, setActiveTab] = useState('static');

  // ── Static relevance state ─────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [profileList, setProfileList] = useState([]);
  const [staticSettings, setStaticSettings] = useState(null);
  const [staticSaving, setStaticSaving] = useState(false);

  // ── SRAA / semantic state ──────────────────────────────────────────────────
  const [sraa, setSraa] = useState(null);
  const [sraaLoading, setSraaLoading] = useState(true);
  const [sraaSaving, setSraaSaving] = useState(false);

  // ── Load profiles (static tab) ─────────────────────────────────────────────
  const fetchProfiles = async () => {
    try {
      const res = await getKBList();
      const profiles = res.data?.data?.profiles || [];
      setProfileList(profiles);
      if (profiles.length > 0) setProfile(profiles[0]);
      else { setProfile(null); setStaticSettings(null); }
    } catch (err) {
      console.error('Failed to load profiles', err);
      setProfileList([]);
      setProfile(null);
      setStaticSettings(null);
    }
  };

  const fetchStaticSettings = async (profileObj) => {
    if (!profileObj?._id) return;
    try {
      const res = await getProfile(profileObj._id);
      setStaticSettings(res.data.data.profile.relevanceSettings || {});
    } catch (err) {
      console.error('Failed to load relevanceSettings', err);
      setStaticSettings(null);
    }
  };

  // ── Load SRAA settings ─────────────────────────────────────────────────────
  const fetchSraa = async () => {
    setSraaLoading(true);
    try {
      const res = await getSraaSettings();
      setSraa(res.data.data);
    } catch (err) {
      toast.error('Failed to load semantic settings');
    } finally {
      setSraaLoading(false);
    }
  };

  useEffect(() => { fetchProfiles(); fetchSraa(); }, []);

  useEffect(() => {
    if (profile) fetchStaticSettings(profile);
    else setStaticSettings(null);
  }, [profile]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStaticSlider = (key) => (val) => {
    const next = { ...staticSettings, [key]: val[0] };
    if (key === 'keywordWeightPercent') next.fieldWeightPercent = 100 - val[0];
    setStaticSettings(next);
  };

  const handleStaticSwitch = (key) => (val) => setStaticSettings({ ...staticSettings, [key]: val });
  const handleStaticChange = (key, value) => setStaticSettings({ ...staticSettings, [key]: value });

  const handleStaticSave = async () => {
    if (!profile?._id) return;
    setStaticSaving(true);
    try {
      await updateProfile(profile._id, { relevanceSettings: staticSettings });
      toast.success('✅ Static relevance settings saved!');
    } catch (err) {
      toast.error('❌ Failed to save settings');
    }
    setStaticSaving(false);
  };

  const setSraaField = (key, value) => setSraa(prev => ({ ...prev, [key]: value }));

  const handleSraaSave = async () => {
    setSraaSaving(true);
    try {
      await updateSraaSettings(sraa);
      toast.success('✅ Semantic settings saved!');
    } catch (err) {
      toast.error('❌ Failed to save semantic settings');
    }
    setSraaSaving(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-screen-xl w-full space-y-4 mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">🎯 Relevance Settings</h1>

        {/* Save button shown on semantic tabs */}
        {activeTab !== 'static' && sraa && (
          <div className="flex gap-2">
            <button
              onClick={fetchSraa}
              className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reload
            </button>
            <button
              onClick={handleSraaSave}
              disabled={sraaSaving}
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1"
            >
              {sraaSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save All
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Static Relevance ─────────────────────────────────────────── */}
      {activeTab === 'static' && (
        <div className="space-y-4">
          {/* Profile selector */}
          <Select
            value={profile?._id || ''}
            onValueChange={(id) => {
              const found = profileList.find((p) => p._id === id);
              setProfile(found || null);
            }}
          >
            <SelectTrigger className="select-trigger w-60">
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent className="select-content">
              {profileList.length > 0 ? (
                profileList.map((p) => (
                  <SelectItem key={p._id} value={p._id} className="select-item">
                    {p.profileName} {p.enabled ? '' : '(Disabled)'}
                  </SelectItem>
                ))
              ) : (
                <div className="p-2 text-gray-500">No profiles available</div>
              )}
            </SelectContent>
          </Select>

          {profile && staticSettings ? (
            <div className="card space-y-6">
              <div>
                <Label className="field-label">🔠 Keyword Weight %</Label>
                <Slider
                  value={[staticSettings.keywordWeightPercent]}
                  onValueChange={handleStaticSlider('keywordWeightPercent')}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Balance: {staticSettings.keywordWeightPercent}% keyword / {staticSettings.fieldWeightPercent}% field
                </p>
              </div>

              <div className="flex justify-between items-center">
                <Label className="field-label">✅ Exact Match Only</Label>
                <Switch checked={staticSettings.exactMatchOnly} onCheckedChange={handleStaticSwitch('exactMatchOnly')} />
              </div>

              <div className="flex justify-between items-center">
                <Label className="field-label">🔍 Case Sensitive</Label>
                <Switch checked={staticSettings.caseSensitive} onCheckedChange={handleStaticSwitch('caseSensitive')} />
              </div>

              <div className="flex justify-between items-center">
                <Label className="field-label">📌 Match as Substring</Label>
                <Switch checked={staticSettings.useSubstringMatch} onCheckedChange={handleStaticSwitch('useSubstringMatch')} />
              </div>

              <div>
                <Label className="field-label">🔢 Min Unique Keyword Hits</Label>
                <input
                  type="number"
                  className="input-field w-24"
                  value={staticSettings.minKeywordHits}
                  onChange={(e) => handleStaticChange('minKeywordHits', Number(e.target.value))}
                />
              </div>

              <div className="flex justify-between items-center">
                <Label className="field-label">🎯 Cap Score at 100</Label>
                <Switch checked={staticSettings.capScoreAt100} onCheckedChange={handleStaticSwitch('capScoreAt100')} />
              </div>

              <LoadingButton
                loading={staticSaving}
                className="btn-primary btn-full mt-4"
                onClick={handleStaticSave}
              >
                Save Changes
              </LoadingButton>
            </div>
          ) : (
            <div className="p-4 bg-white rounded shadow text-gray-600">
              {profileList.length === 0
                ? 'No profiles found. Please create one first.'
                : 'Please select a profile to edit its settings.'}
            </div>
          )}
        </div>
      )}

      {/* ── Semantic tabs — show spinner while loading ─────────────────────── */}
      {activeTab !== 'static' && sraaLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )}

      {activeTab !== 'static' && !sraaLoading && sraa && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">

          {/* ── Models & RAG ─────────────────────────────────────────────── */}
          {activeTab === 'models' && (
            <div className="space-y-8">
              <p className="text-sm text-gray-500">Configure the AI models, retrieval counts, and temperatures used across all three semantic functions.</p>

              {/* Semantic Gate */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">🔒 Semantic Scoring Gate</h3>
                <div className="flex flex-wrap gap-8 items-end">
                  <NumberInput
                    label="Min Static Score to Trigger Semantic"
                    value={sraa.semanticMinStaticScore}
                    onChange={v => setSraaField('semanticMinStaticScore', v)}
                    min={0}
                    max={100}
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700 pb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sraa.enableSemanticScoring}
                      onChange={e => setSraaField('enableSemanticScoring', e.target.checked)}
                      className="accent-purple-600 w-4 h-4"
                    />
                    Enable Semantic Scoring
                  </label>
                </div>
              </div>

              {/* Scoring */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">🎯 Relevance Scoring</h3>
                <div className="flex flex-wrap gap-8">
                  <ModelSelect label="Model" value={sraa.scoringModel} onChange={v => setSraaField('scoringModel', v)} />
                  <NumberInput label="Top-K Projects" value={sraa.scoringTopK} onChange={v => setSraaField('scoringTopK', v)} min={1} max={20} />
                  <TemperatureSlider label="Temperature" value={sraa.scoringTemperature} onChange={v => setSraaField('scoringTemperature', v)} />
                </div>
              </div>

              {/* Proposals */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">📝 Proposal Generation</h3>
                <div className="flex flex-wrap gap-8">
                  <ModelSelect label="Model" value={sraa.proposalModel} onChange={v => setSraaField('proposalModel', v)} />
                  <NumberInput label="Top-K Projects" value={sraa.proposalTopK} onChange={v => setSraaField('proposalTopK', v)} min={1} max={20} />
                  <TemperatureSlider label="Temperature" value={sraa.proposalTemperature} onChange={v => setSraaField('proposalTemperature', v)} />
                </div>
              </div>

              {/* Playground */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">🧪 Query Playground</h3>
                <div className="flex flex-wrap gap-8">
                  <ModelSelect label="Model" value={sraa.playgroundModel} onChange={v => setSraaField('playgroundModel', v)} />
                  <NumberInput label="Top-K Projects" value={sraa.playgroundTopK} onChange={v => setSraaField('playgroundTopK', v)} min={1} max={20} />
                  <TemperatureSlider label="Temperature" value={sraa.playgroundTemperature} onChange={v => setSraaField('playgroundTemperature', v)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Scoring Prompt ────────────────────────────────────────────── */}
          {activeTab === 'scoring' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Used when evaluating job relevance. The model receives this as the system prompt, then sees retrieved projects + job description as user message.</p>
              <PromptTextarea
                label="Scoring System Prompt"
                value={sraa.systemPrompt_scoring}
                onChange={v => setSraaField('systemPrompt_scoring', v)}
                rows={22}
              />
            </div>
          )}

          {/* ── Proposal Prompts ──────────────────────────────────────────── */}
          {activeTab === 'proposals' && (
            <div className="space-y-8">
              <p className="text-xs text-gray-500">Three prompts — Short, Medium, Detailed — used when generating proposals. Each receives the retrieved portfolio case studies + job description as user message.</p>
              <PromptTextarea
                label="Short Proposal (2-3 paragraphs)"
                value={sraa.systemPrompt_proposal_short}
                onChange={v => setSraaField('systemPrompt_proposal_short', v)}
                rows={14}
              />
              <PromptTextarea
                label="Medium Proposal (4-6 paragraphs)"
                value={sraa.systemPrompt_proposal_medium}
                onChange={v => setSraaField('systemPrompt_proposal_medium', v)}
                rows={14}
              />
              <PromptTextarea
                label="Detailed Proposal (full conviction piece)"
                value={sraa.systemPrompt_proposal_detailed}
                onChange={v => setSraaField('systemPrompt_proposal_detailed', v)}
                rows={14}
              />
            </div>
          )}

          {/* ── Playground Prompt ─────────────────────────────────────────── */}
          {activeTab === 'playground' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">System prompt for the BD Playground. The model sees retrieved case studies, full conversation history, and the user query.</p>
              <PromptTextarea
                label="Playground System Prompt"
                value={sraa.systemPrompt_playground}
                onChange={v => setSraaField('systemPrompt_playground', v)}
                rows={18}
              />
            </div>
          )}

          {/* ── Rewrite Prompts ───────────────────────────────────────────── */}
          {activeTab === 'rewrite' && (
            <div className="space-y-8">
              <p className="text-xs text-gray-500">
                Prompts used when rewriting project descriptions. Use <code className="bg-gray-100 px-1 rounded text-purple-700">{'{{rawInput}}'}</code> where the raw project text should be injected.
              </p>
              <PromptTextarea
                label="Semantic Rewrite Prompt (used for RAG embedding)"
                value={sraa.projectRewrite_semantic}
                onChange={v => setSraaField('projectRewrite_semantic', v)}
                rows={18}
              />
              <PromptTextarea
                label="Portfolio Rewrite Prompt (used as LLM context in proposals)"
                value={sraa.projectRewrite_portfolio}
                onChange={v => setSraaField('projectRewrite_portfolio', v)}
                rows={18}
              />
            </div>
          )}

        </div>
      )}

      {/* Bottom save button for semantic tabs */}
      {activeTab !== 'static' && sraa && !sraaLoading && (
        <div className="flex justify-end">
          <button
            onClick={handleSraaSave}
            disabled={sraaSaving}
            className="btn-primary text-sm px-6 py-2 flex items-center gap-2"
          >
            {sraaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default RelevanceSettings;
