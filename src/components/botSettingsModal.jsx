'use client';

import React, { useEffect, useState } from 'react';
import { getBotSettings, updateBotSettings, resetBotStats } from '../apis/bots';
import LoadingButton from '@/components/ui/loading-button';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

const BotSettingsModal = ({ botId, onClose }) => {
    const [settings, setSettings] = useState(null);
    const [agentUrl, setAgentUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const fetchSettings = async () => {
        try {
            const data = await getBotSettings(botId);
            setSettings(data.settings);
            setAgentUrl(data.agentUrl || '');
        } catch (err) {
            toast.error('❌ Failed to load bot settings');
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
            toast.success('✅ Bot settings saved!');
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

    if (!settings) return <div className="p-6">Loading...</div>;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl overflow-y-auto max-h-[90vh] relative"
            >
                {/* ❌ Cross button */}
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-black"
                    onClick={onClose}
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold mb-4">⚙️ Settings for {botId}</h2>

                <div className="space-y-6">
                    {/* ✅ Agent URL */}
                    <div>
                        <Label className="font-semibold">🔗 Agent URL</Label>
                        <input
                            type="text"
                            className="input-field w-full"
                            value={agentUrl}
                            onChange={(e) => setAgentUrl(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="font-semibold">🔍 Search Query</Label>
                        <input
                            type="text"
                            className="input-field w-full"
                            value={settings.searchQuery}
                            onChange={handleText('searchQuery')}
                        />
                    </div>

                    {[
                        {
                            keys: ['cycleDelayMin', 'cycleDelayMax'],
                            label: '🔁 Delay Between Cycles (ms)',
                            min: 0, max: 60000,
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
