'use client';

import React, { useEffect, useState } from 'react';
import { getBots } from '../apis/bots';
import { getBotSettings, updateBotSettings } from '../apis/botSettings';
import LoadingButton from '@/components/ui/loading-button';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

const BotSettingsPage = () => {
    const [botList, setBotList] = useState([]);
    const [selectedBotId, setSelectedBotId] = useState('');
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchBots = async () => {
        try {
            const bots = await getBots();
            setBotList(bots);
            if (bots.length > 0) setSelectedBotId(bots[0].botId);
        } catch (err) {
            toast.error('❌ Failed to load bot list');
            console.error(err);
        }
    };

    const fetchSettings = async (botId) => {
        try {
            const data = await getBotSettings(botId);
            setSettings(data);
        } catch (err) {
            if (err.response?.status === 404) {
                setSettings({
                    botId,
                    searchQuery: '',
                    cycleDelayMin: 20000,
                    cycleDelayMax: 40000,
                    jobScrapeDelayMin: 1000,
                    jobScrapeDelayMax: 2000,
                    cloudflareWaitBeforeClick: 3000,
                    cloudflareWaitAfterClick: 5000,
                    jobDetailPreScrapeDelayMin: 2000,
                    jobDetailPreScrapeDelayMax: 3000,
                    htmlLengthThreshold: 10000,
                    htmlWaitAfterShortLoad: 1500,
                    heartbeatInterval: 10000,
                    perPage: 50
                });
            } else {
                toast.error('❌ Failed to load bot settings');
                console.error(err);
            }
        }
    };

    const saveSettings = async () => {
        const s = settings;
        const errors = [];

        if (s.cycleDelayMin < 0 || s.cycleDelayMax < 0 || s.cycleDelayMax < s.cycleDelayMin)
            errors.push('Invalid cycle delay range');
        if (s.jobScrapeDelayMin < 0 || s.jobScrapeDelayMax < 0 || s.jobScrapeDelayMax < s.jobScrapeDelayMin)
            errors.push('Invalid job scrape delay range');
        if (s.jobDetailPreScrapeDelayMin < 0 || s.jobDetailPreScrapeDelayMax < 0 || s.jobDetailPreScrapeDelayMax < s.jobDetailPreScrapeDelayMin)
            errors.push('Invalid pre-scrape delay range');
        if (s.cloudflareWaitBeforeClick < 0 || s.cloudflareWaitAfterClick < 0)
            errors.push('Invalid Cloudflare wait values');
        if (s.htmlLengthThreshold < 1000)
            errors.push('HTML length threshold too low');
        if (s.htmlWaitAfterShortLoad < 0)
            errors.push('Invalid wait after short load');
        if (s.heartbeatInterval < 1000)
            errors.push('Heartbeat interval too low');
        if (s.perPage <= 0 || s.perPage > 100)
            errors.push('Jobs per page must be 1–100');

        if (errors.length > 0) {
            toast.error(`❌ ${errors.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            await updateBotSettings(selectedBotId, settings);
            toast.success('✅ Bot settings saved!');
        } catch (err) {
            toast.error('❌ Failed to save settings');
            console.error(err);
        }
        setLoading(false);
    };

    const handleInput = (key) => (e) => {
        const value = e.target.value;
        if (value === '') return;
        const num = Number(value);
        if (!isNaN(num)) {
            setSettings({ ...settings, [key]: num });
        }
    };

    const handleText = (key) => (e) => {
        setSettings({ ...settings, [key]: e.target.value });
    };

    useEffect(() => { fetchBots(); }, []);
    useEffect(() => { if (selectedBotId) fetchSettings(selectedBotId); }, [selectedBotId]);

    if (!settings) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-4 w-full max-w-screen-md space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold mb-2">🤖 Bot Settings</h1>
                <Select value={selectedBotId} onValueChange={setSelectedBotId}>
                    <SelectTrigger className="w-60">
                        <SelectValue placeholder="Select bot" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 rounded-md shadow-md">
                        {botList.map((bot) => (
                            <SelectItem key={bot.botId} value={bot.botId}>
                                {bot.botId}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="card space-y-6">
                <div>
                    <Label className="font-semibold">🔍 Search Query</Label>
                    <input
                        type="text"
                        className="input-field w-full"
                        value={settings.searchQuery}
                        onChange={handleText('searchQuery')}
                        placeholder="e.g. game development"
                    />
                    <div className="text-sm text-muted">Query used in the Upwork search URL.</div>
                </div>

                {[
                    {
                        keys: ['cycleDelayMin', 'cycleDelayMax'],
                        label: '🔁 Delay Between Cycles (ms)',
                        helper: 'Time between feed refreshes.',
                        min: 0, max: 60000
                    },
                    {
                        keys: ['jobScrapeDelayMin', 'jobScrapeDelayMax'],
                        label: '🧲 Delay Between Job Scrapes (ms)',
                        helper: 'Delay between scraping each job detail.',
                        min: 0, max: 10000
                    },
                    {
                        keys: ['jobDetailPreScrapeDelayMin', 'jobDetailPreScrapeDelayMax'],
                        label: '🧱 Pre-Scrape Delay on Job Page (ms)',
                        helper: 'Wait time before scraping a job after loading.',
                        min: 0, max: 10000
                    }
                ].map(({ keys, label, helper, min, max }) => (
                    <div key={label}>
                        <Label className="font-semibold">{label}</Label>
                        <div className="flex gap-4">
                            <input type="number" className="input-field w-32" min={min} max={max}
                                value={settings[keys[0]]} onChange={handleInput(keys[0])} />
                            <input type="number" className="input-field w-32" min={min} max={max}
                                value={settings[keys[1]]} onChange={handleInput(keys[1])} />
                        </div>
                        <div className="text-sm text-muted">{helper}</div>
                    </div>
                ))}

                <div>
                    <Label className="font-semibold">🧩 Cloudflare Wait Times (ms)</Label>
                    <div className="flex gap-4">
                        <input type="number" className="input-field w-32" min={0}
                            value={settings.cloudflareWaitBeforeClick}
                            onChange={handleInput('cloudflareWaitBeforeClick')} />
                        <input type="number" className="input-field w-32" min={0}
                            value={settings.cloudflareWaitAfterClick}
                            onChange={handleInput('cloudflareWaitAfterClick')} />
                    </div>
                    <div className="text-sm text-muted">Wait before and after clicking Cloudflare checkbox.</div>
                </div>

                <div>
                    <Label className="font-semibold">📏 HTML Length Threshold</Label>
                    <input
                        type="number"
                        className="input-field w-40"
                        min={1000}
                        value={settings.htmlLengthThreshold}
                        onChange={handleInput('htmlLengthThreshold')}
                    />
                    <div className="text-sm text-muted">Minimum HTML length for valid scrape.</div>
                </div>

                <div>
                    <Label className="font-semibold">⏱️ Water After Feed Page Load (ms)</Label>
                    <input
                        type="number"
                        className="input-field w-40"
                        min={0}
                        value={settings.waitAfterFeedPageLoad}
                        onChange={handleInput('waitAfterFeedPageLoad')}
                    />
                    <div className="text-sm text-muted">Delay added if HTML is smaller than threshold.</div>
                </div>

                <div>
                    <Label className="font-semibold">⏱️ Wait After Short Load (ms)</Label>
                    <input
                        type="number"
                        className="input-field w-40"
                        min={0}
                        value={settings.htmlWaitAfterShortLoad}
                        onChange={handleInput('htmlWaitAfterShortLoad')}
                    />
                    <div className="text-sm text-muted">Delay added if HTML is smaller than threshold.</div>
                </div>

                <div>
                    <Label className="font-semibold">📡 Heartbeat Interval (ms)</Label>
                    <input
                        type="number"
                        className="input-field w-40"
                        min={1000}
                        value={settings.heartbeatInterval}
                        onChange={handleInput('heartbeatInterval')}
                    />
                    <div className="text-sm text-muted">How often the bot sends status to server.</div>
                </div>

                <div>
                    <Label className="font-semibold">📦 Jobs Per Feed Page</Label>
                    <input
                        type="number"
                        className="input-field w-40"
                        min={1} max={100}
                        value={settings.perPage}
                        onChange={handleInput('perPage')}
                    />
                    <div className="text-sm text-muted">How many jobs to fetch per page (Upwork max: 50).</div>
                </div>

                <LoadingButton loading={loading} className="btn-primary btn-full mt-4" onClick={saveSettings}>
                    Save Changes
                </LoadingButton>
            </div>
        </div>
    );
};

export default BotSettingsPage;
