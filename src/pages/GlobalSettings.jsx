'use client';

import React, { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../apis/settings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import LoadingButton from '@/components/ui/loading-button';
import { toast } from 'sonner';

const GlobalSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await getSettings();
      setSettings(res.data.data);
    } catch (err) {
      console.error('Failed to load settings', err);
      toast.error('Failed to fetch global settings');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSwitch = (key) => (val) => {
    setSettings({ ...settings, [key]: val });
  };

  const handleSettingChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSettings(settings);
      toast.success('✅ Global settings saved!');
    } catch (err) {
      toast.error('❌ Failed to save settings');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-screen-xl w-full space-y-6 mx-auto">
      <h1 className="text-2xl font-semibold mb-4">⚙️ System-Wide Settings</h1>

      {settings ? (
        <div className="card space-y-6">

          <div className="flex justify-between items-center">
            <Label className="field-label">🧠 Use Semantic Search For Jobs?</Label>
            <Switch
              checked={settings.useSemanticSearch}
              onCheckedChange={handleSwitch('useSemanticSearch')}
            />
          </div>

          <div>
            <Label className="field-label">🎚️ Semantic Search Min Static Score</Label>
            <input
              type="number"
              min={0}
              max={100}
              className="input-field w-24"
              value={settings.semanticMinStaticScore}
              onChange={(e) =>
                handleSettingChange('semanticMinStaticScore', Number(e.target.value))
              }
            />
          </div>

          <div className="flex justify-between items-center">
            <Label className="field-label">🛰️ Enable Bot Alerts</Label>
            <Switch
              checked={settings.enableBotAlerts}
              onCheckedChange={handleSwitch('enableBotAlerts')}
            />
          </div>

          <div className="flex justify-between items-center">
            <Label className="field-label">💬 Enable Slack Alerts</Label>
            <Switch
              checked={settings.enableSlackAlerts}
              onCheckedChange={handleSwitch('enableSlackAlerts')}
            />
          </div>

          <div className="flex justify-between items-center">
            <Label className="field-label">📱 Enable Text Alerts (WhatsApp)</Label>
            <Switch
              checked={settings.enableTextAlerts}
              onCheckedChange={handleSwitch('enableTextAlerts')}
            />
          </div>

          <div className="flex justify-between items-center">
            <Label className="field-label">📌 Enable High-Relevancy Job Alerts</Label>
            <Switch
              checked={settings.enableHighRelevancyJobAlerts}
              onCheckedChange={handleSwitch('enableHighRelevancyJobAlerts')}
            />
          </div>

          <div>
            <Label className="field-label">🎯 High Relevancy Threshold</Label>
            <input
              type="number"
              className="input-field w-24"
              min={0}
              max={100}
              value={settings.highRelevancyThreshold}
              onChange={(e) =>
                handleSettingChange('highRelevancyThreshold', Number(e.target.value))
              }
            />
          </div>

          <LoadingButton
            loading={loading}
            className="btn-primary btn-full mt-4"
            onClick={handleSave}
          >
            Save Changes
          </LoadingButton>

        </div>
      ) : (
        <div className="p-4 bg-white rounded shadow text-gray-600">
          Loading global settings...
        </div>
      )}
    </div>
  );
};

export default GlobalSettings;
