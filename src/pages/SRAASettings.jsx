import React, { useEffect, useState } from 'react';
import { getSraaSettings, updateSraaSettings } from '../apis/sraaSettings';
import { toast } from 'sonner';
import { Save, Loader2, RotateCcw } from 'lucide-react';

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];

const TABS = [
  { id: 'models', label: '⚙️ Models & RAG' },
  { id: 'scoring', label: '🎯 Scoring Prompt' },
  { id: 'proposals', label: '📝 Proposal Prompts' },
  { id: 'playground', label: '🧪 Playground Prompt' },
  { id: 'rewrite', label: '🔁 Rewrite Prompts' },
];

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

export default function SRAASettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('models');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getSraaSettings();
      setSettings(res.data.data);
    } catch (err) {
      toast.error('Failed to load SRAA settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSraaSettings(settings);
      toast.success('SRAA Settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  );

  if (!settings) return null;

  return (
    <div className="p-4 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="page-title">🧠 SRAA Settings</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reload
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save All
          </button>
        </div>
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

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">

        {/* ── Models & RAG Config ─────────────────────────────────────── */}
        {activeTab === 'models' && (
          <div className="space-y-8">
            <p className="text-sm text-gray-500">Configure the AI models, retrieval counts, and temperatures used across all three SRAA functions.</p>

            {/* Semantic Toggle — top of page, most important setting */}
            <div className="flex items-center gap-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <label className="flex items-center gap-3 text-sm font-semibold text-purple-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.enableSemanticScoring}
                  onChange={e => set('enableSemanticScoring', e.target.checked)}
                  className="accent-purple-600 w-5 h-5"
                />
                Semantic Analysis Enabled
              </label>
              <div className="h-5 w-px bg-purple-300" />
              <div className="flex items-center gap-3">
                <span className="text-xs text-purple-700 font-medium whitespace-nowrap">Min Static Score to Trigger:</span>
                <NumberInput
                  value={settings.semanticMinStaticScore}
                  onChange={v => set('semanticMinStaticScore', v)}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Scoring */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">🎯 Relevance Scoring</h3>
              <div className="flex flex-wrap gap-8">
                <ModelSelect label="Model" value={settings.scoringModel} onChange={v => set('scoringModel', v)} />
                <NumberInput label="Top-K Projects" value={settings.scoringTopK} onChange={v => set('scoringTopK', v)} min={1} max={20} />
                <TemperatureSlider label="Temperature" value={settings.scoringTemperature} onChange={v => set('scoringTemperature', v)} />
              </div>
            </div>

            {/* Proposals */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">📝 Proposal Generation</h3>
              <div className="flex flex-wrap gap-8">
                <ModelSelect label="Model" value={settings.proposalModel} onChange={v => set('proposalModel', v)} />
                <NumberInput label="Top-K Projects" value={settings.proposalTopK} onChange={v => set('proposalTopK', v)} min={1} max={20} />
                <TemperatureSlider label="Temperature" value={settings.proposalTemperature} onChange={v => set('proposalTemperature', v)} />
              </div>
            </div>

            {/* Playground */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">🧪 Query Playground</h3>
              <div className="flex flex-wrap gap-8">
                <ModelSelect label="Model" value={settings.playgroundModel} onChange={v => set('playgroundModel', v)} />
                <NumberInput label="Top-K Projects" value={settings.playgroundTopK} onChange={v => set('playgroundTopK', v)} min={1} max={20} />
                <TemperatureSlider label="Temperature" value={settings.playgroundTemperature} onChange={v => set('playgroundTemperature', v)} />
              </div>
            </div>
          </div>
        )}

        {/* ── Scoring Prompt ─────────────────────────────────────────── */}
        {activeTab === 'scoring' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Used when evaluating job relevance. The model receives this as the system prompt, then sees retrieved projects + job description as user message.</p>
            <PromptTextarea
              label="Scoring System Prompt"
              value={settings.systemPrompt_scoring}
              onChange={v => set('systemPrompt_scoring', v)}
              rows={22}
            />
          </div>
        )}

        {/* ── Proposal Prompts ───────────────────────────────────────── */}
        {activeTab === 'proposals' && (
          <div className="space-y-8">
            <p className="text-xs text-gray-500">Three prompts — Short, Medium, Detailed — used when generating proposals. Each receives the retrieved portfolio case studies + job description as user message.</p>
            <PromptTextarea
              label="Short Proposal (2-3 paragraphs)"
              value={settings.systemPrompt_proposal_short}
              onChange={v => set('systemPrompt_proposal_short', v)}
              rows={14}
            />
            <PromptTextarea
              label="Medium Proposal (4-6 paragraphs)"
              value={settings.systemPrompt_proposal_medium}
              onChange={v => set('systemPrompt_proposal_medium', v)}
              rows={14}
            />
            <PromptTextarea
              label="Detailed Proposal (full conviction piece)"
              value={settings.systemPrompt_proposal_detailed}
              onChange={v => set('systemPrompt_proposal_detailed', v)}
              rows={14}
            />
          </div>
        )}

        {/* ── Playground Prompt ──────────────────────────────────────── */}
        {activeTab === 'playground' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">System prompt for the BD Playground. The model sees retrieved case studies, full conversation history, and the user query.</p>
            <PromptTextarea
              label="Playground System Prompt"
              value={settings.systemPrompt_playground}
              onChange={v => set('systemPrompt_playground', v)}
              rows={18}
            />
          </div>
        )}

        {/* ── Rewrite Prompts ────────────────────────────────────────── */}
        {activeTab === 'rewrite' && (
          <div className="space-y-8">
            <p className="text-xs text-gray-500">
              Prompts used when rewriting project descriptions. Use <code className="bg-gray-100 px-1 rounded text-purple-700">{'{{rawInput}}'}</code> where the raw project text should be injected.
            </p>
            <PromptTextarea
              label="Semantic Rewrite Prompt (used for RAG embedding)"
              value={settings.projectRewrite_semantic}
              onChange={v => set('projectRewrite_semantic', v)}
              rows={18}
            />
            <PromptTextarea
              label="Portfolio Rewrite Prompt (used as LLM context in proposals)"
              value={settings.projectRewrite_portfolio}
              onChange={v => set('projectRewrite_portfolio', v)}
              rows={18}
            />
          </div>
        )}
      </div>

      {/* Sticky save reminder */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm px-6 py-2 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Changes
        </button>
      </div>
    </div>
  );
}
