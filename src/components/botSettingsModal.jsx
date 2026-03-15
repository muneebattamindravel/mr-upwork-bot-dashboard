'use client';

import React, { useEffect, useState } from 'react';
import { getBotSettings, updateBotSettings, resetBotStats } from '../apis/bots';
import { getSettings } from '../apis/settings';
import LoadingButton from '@/components/ui/loading-button';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

const BotSettingsModal = ({ botId, onClose }) => {
    const [settings, setSettings] = useState(null);
    const [agentUrl, setAgentUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Scraper categories from global settings
    const [scraperCategories, setScraperCategories] = useState([]);

    const fetchSettings = async () => {
        try {
            const [botRes, globalRes] = await Promise.all([
                getBotSettings(botId),
                getSettings(),
            ]);
            setSettings(botRes.settings);
            setAgentUrl(botRes.agentUrl || '');
            setScraperCategories(globalRes.data?.data?.scraperCategories || []);
        } catch (err) {
            toast.error('❌ Failed to load scraper settings');
        }
    };

    useEffect(() => {
        if (botId) fetchSettings();
    }, [botId]);

    const saveSettings = async () => {
        const s = settings;
        const errors = [];

        if (s.cycleDelayMin < 0 || s.cycleDelayMax < 0 || s.cycleDelayMax < s.cycleDelayMin)
            errors.push('Invalid cycle delay range');
        if (s.delayBetweenJobsScrapingMin < 0 || s.delayBetweenJobsScrapingMax < 0 || s.delayBetweenJobsScrapingMax < s.delayBetweenJobsScrapingMin)
            errors.push('Invalid job scrape delay range');
        if (s.jobDetailPreScrapeDelayMin < 0 || s.jobDetailPreScrapeDelayMax < 0 || s.jobDetailPreScrapeDelayMax < s.jobDetailPreScrapeDelayMin)
            errors.push('Invalid pre-scrape delay range');
        if (s.cloudflareWaitBeforeClick < 0 || s.cloudflareWaitAfterClick < 0)
            errors.push('Invalid Cloudflare wait values');
        if (s.htmlLengthThreshold < 1000)
            errors.push('HTML length threshold too low');
        if (s.waitIfHtmlThresholdFailed < 0)
            errors.push('Invalid Wait If Html Is Less Than Threshold');
        if (s.heartbeatInterval < 1000)
            errors.push('Heartbeat interval too low');
        if (s.perPage <= 0 || s.perPage > 100)
            errors.push('Jobs per page must be 1–100');

        if (errors.length > 0) {
            toast.error(`❌ ${errors.join(', ')}`);
            return;
        }

        setIsSaving(true);
        try {
            await updateBotSettings(botId, {
                settings: s,
                agentUrl: agentUrl,
            });
            toast.success('✅ Scraper settings saved!');
            if (onClose) onClose();
        } catch {
            toast.error('❌ Failed to save settings');
        }
        setIsSaving(false);
    };

    const handleInput = (key) => (e) => {
        const num = Number(e.target.value);
        if (!isNaN(num)) {
            setSettings({ ...settings, [key]: num });
        }
    };

    const handleText = (key) => (e) => {
        setSettings({ ...settings, [key]: e.target.value });
    };

    // ── Category multi-select helpers ─────────────────────────────────────────
    const selectedUrls = new Set(settings?.searchQueries || []);

    const toggleCategory = (url) => {
        const current = settings.searchQueries || [];
        const updated = current.includes(url)
            ? current.filter(u => u !== url)
            : [...current, url];
        setSettings({ ...settings, searchQueries: updated });
    };

    const handleBool = (key) => (e) => setSettings({ ...settings, [key]: e.target.checked });

    if (!settings) return <div className="p-6">Loading...</div>;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl overflow-y-auto max-h-[90vh] relative"
            >
                {/* Close button */}
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-black"
                    onClick={onClose}
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold mb-4">⚙️ Scraper Settings for {botId}</h2>

                <div className="space-y-6">
                    {/* Agent URL */}
                    <div>
                        <Label className="font-semibold">🔗 Agent URL</Label>
                        <input
                            type="text"
                            className="input-field w-full"
                            value={agentUrl}
                            onChange={(e) => setAgentUrl(e.target.value)}
                        />
                    </div>

                    {/* Query mode toggle */}
                    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="font-semibold">🔍 Search Mode</Label>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {settings.customQuery
                                        ? 'Keyword mode — searches by text query'
                                        : 'Category mode — uses Upwork category URLs'}
                                </p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className={`text-xs font-medium ${!settings.customQuery ? 'text-purple-600' : 'text-gray-400'}`}>Category</span>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={!!settings.customQuery}
                                        onChange={handleBool('customQuery')}
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${settings.customQuery ? 'bg-purple-600' : 'bg-gray-300'}`} />
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.customQuery ? 'translate-x-5' : ''}`} />
                                </div>
                                <span className={`text-xs font-medium ${settings.customQuery ? 'text-purple-600' : 'text-gray-400'}`}>Keyword</span>
                            </label>
                        </div>

                        {settings.customQuery ? (
                            /* ── Keyword mode ── */
                            <div>
                                <Label className="text-sm text-gray-600">Search Query</Label>
                                <input
                                    type="text"
                                    className="input-field w-full mt-1"
                                    placeholder="e.g. game development, react native, AI engineer"
                                    value={settings.searchQuery || ''}
                                    onChange={handleText('searchQuery')}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Bot will search: upwork.com/nx/search/jobs/?q=YOUR_QUERY&sort=recency&location_type=worldwide
                                </p>
                            </div>
                        ) : (
                            /* ── Category mode ── */
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm text-gray-600">Categories to Target</Label>
                                    <span className="text-xs text-gray-400">{selectedUrls.size} selected</span>
                                </div>
                                {scraperCategories.length === 0 ? (
                                    <div className="border border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500 text-center">
                                        No categories configured yet.{' '}
                                        <span className="text-purple-600 font-medium">Go to Settings → 🔧 Scraper Configs</span>{' '}
                                        to add categories first.
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        {scraperCategories.map((cat, i) => {
                                            const isChecked = selectedUrls.has(cat.url);
                                            return (
                                                <label
                                                    key={i}
                                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                                        i < scraperCategories.length - 1 ? 'border-b border-gray-100' : ''
                                                    } ${isChecked ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleCategory(cat.url)}
                                                        className="accent-purple-600 w-4 h-4 shrink-0"
                                                    />
                                                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                                                    <span className="text-xs text-gray-400 truncate ml-auto hidden sm:block" title={cat.url}>
                                                        {cat.url.includes('category2_uid=')
                                                            ? `uid:${cat.url.split('category2_uid=')[1].split('&')[0]}`
                                                            : cat.url}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {[
                        {
                            keys: ['cycleDelayMin', 'cycleDelayMax'],
                            label: '🔁 Delay Between Cycles (ms)',
                            min: 0, max: 300000,
                        },
                        {
                            keys: ['delayBetweenJobsScrapingMin', 'delayBetweenJobsScrapingMax'],
                            label: '🧲 Delay Between Job Scrapes (ms)',
                            min: 0, max: 10000,
                        },
                        {
                            keys: ['jobDetailPreScrapeDelayMin', 'jobDetailPreScrapeDelayMax'],
                            label: '🧱 Pre-Scrape Delay on Job Page (ms)',
                            min: 0, max: 10000,
                        },
                    ].map(({ keys, label, min, max }) => (
                        <div key={label}>
                            <Label className="font-semibold">{label}</Label>
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    className="input-field w-32"
                                    min={min}
                                    max={max}
                                    value={settings[keys[0]]}
                                    onChange={handleInput(keys[0])}
                                />
                                <input
                                    type="number"
                                    className="input-field w-32"
                                    min={min}
                                    max={max}
                                    value={settings[keys[1]]}
                                    onChange={handleInput(keys[1])}
                                />
                            </div>
                        </div>
                    ))}

                    <div>
                        <Label className="font-semibold">⏸️ Stale Feed Wait (ms)</Label>
                        <p className="text-xs text-gray-400 mt-0.5 mb-1">
                            When a full cycle finds 0 new jobs (all dupes), wait this long before retrying.
                            Default: 300000 (5 min). Prevents hammering a stale feed every ~15s.
                        </p>
                        <input
                            type="number"
                            className="input-field w-40"
                            min={0}
                            max={3600000}
                            value={settings.staleCycleDelayMs ?? 300000}
                            onChange={handleInput('staleCycleDelayMs')}
                        />
                    </div>

                    <div>
                        <Label className="font-semibold">🧩 Cloudflare Wait Times (ms)</Label>
                        <div className="flex gap-4">
                            <input
                                type="number"
                                className="input-field w-32"
                                value={settings.cloudflareWaitBeforeClick}
                                onChange={handleInput('cloudflareWaitBeforeClick')}
                            />
                            <input
                                type="number"
                                className="input-field w-32"
                                value={settings.cloudflareWaitAfterClick}
                                onChange={handleInput('cloudflareWaitAfterClick')}
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="font-semibold">📏 HTML Length Threshold</Label>
                        <input
                            type="number"
                            className="input-field w-40"
                            value={settings.htmlLengthThreshold}
                            onChange={handleInput('htmlLengthThreshold')}
                        />
                    </div>

                    <div>
                        <Label className="font-semibold">🕐 Wait After Feed Page Load (ms)</Label>
                        <input
                            type="number"
                            className="input-field w-40"
                            value={settings.waitAfterFeedPageLoad}
                            onChange={handleInput('waitAfterFeedPageLoad')}
                        />
                    </div>

                    <div>
                        <Label className="font-semibold">⏱️ Wait If Html Is Less Than Threshold (ms)</Label>
                        <input
                            type="number"
                            className="input-field w-40"
                            value={settings.waitIfHtmlThresholdFailed}
                            onChange={handleInput('waitIfHtmlThresholdFailed')}
                        />
                    </div>

                    <div>
                        <Label className="font-semibold">📡 Heartbeat Interval (ms)</Label>
                        <input
                            type="number"
                            className="input-field w-40"
                            value={settings.heartbeatInterval}
                            onChange={handleInput('heartbeatInterval')}
                        />
                    </div>

                    <div>
                        <Label className="font-semibold">📦 Jobs Per Feed Page</Label>
                        <input
                            type="number"
                            className="input-field w-40"
                            value={settings.perPage}
                            onChange={handleInput('perPage')}
                        />
                    </div>

                    <div className="flex gap-4">
                        <LoadingButton loading={isSaving} onClick={saveSettings}>
                            Save Changes
                        </LoadingButton>
                        <LoadingButton
                            loading={isResetting}
                            className="btn-danger"
                            onClick={async () => {
                                setIsResetting(true);
                                try {
                                    await resetBotStats(botId);
                                    toast.success('✅ Bot stats reset!');
                                } catch {
                                    toast.error('❌ Failed to reset stats');
                                }
                                setIsResetting(false);
                            }}
                        >
                            Reset Stats
                        </LoadingButton>
                        <button className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BotSettingsModal;
