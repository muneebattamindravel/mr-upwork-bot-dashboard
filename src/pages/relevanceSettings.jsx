'use client';

import React, { useEffect, useState } from 'react';
import { loadFile, saveFile, getKBList } from '../apis/kb';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import LoadingButton from '@/components/ui/loading-button';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RelevanceSettings = () => {
  const [profile, setProfile] = useState('');
  const [profileList, setProfileList] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfiles = async () => {
    try {
      const res = await getKBList();
      setProfileList(res.data?.data?.profiles || []);
      if (res.data.data.profiles.length) {
        setProfile(res.data.data.profiles[0]);
      }
    } catch (err) {
      console.error('Failed to load profiles', err);
    }
  };

  const fetchSettings = async (profileName) => {
    try {
      const res = await loadFile(profileName, 'relevanceSettings.json');
      const parsed = JSON.parse(res.data.data.content);
      setSettings(parsed);
    } catch (err) {
      console.error('Failed to load relevanceSettings', err);
      setSettings(null);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchSettings(profile);
    }
  }, [profile]);

  const handleSlider = (key) => (val) => {
    const newSettings = { ...settings, [key]: val[0] };
    if (key === 'keywordWeightPercent') {
      newSettings.fieldWeightPercent = 100 - val[0];
    }
    setSettings(newSettings);
  };

  const handleSwitch = (key) => (val) => {
    setSettings({ ...settings, [key]: val });
  };

  const handleSettingChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveFile(profile, 'relevanceSettings.json', JSON.stringify(settings, null, 2));
      toast.success('✅ Relevance settings saved!');
    } catch (err) {
      toast.error('❌ Failed to save settings');
      console.error(err);
    }
    setLoading(false);
  };

  if (!settings) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 max-w-screen-xl w-full space-y-6 mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">🎯 Relevance Engine Settings</h1>
        <Select value={profile} onValueChange={setProfile}>
          <SelectTrigger className="select-trigger w-60">
            <SelectValue placeholder="Select profile" />
          </SelectTrigger>
          <SelectContent className="select-content">
            {profileList.map((p) => (
              <SelectItem key={p} value={p} className="select-item">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card space-y-6">
        <div>
          <Label className="field-label">🔠 Keyword Weight %</Label>
          <Slider value={[settings.keywordWeightPercent]} onValueChange={handleSlider('keywordWeightPercent')} />
          <p className="text-sm text-gray-500 mt-1">Balance: {settings.keywordWeightPercent}% keyword / {settings.fieldWeightPercent}% field</p>
        </div>

        <div className="flex justify-between items-center">
          <Label className="field-label">✅ Exact Match Only</Label>
          <Switch checked={settings.exactMatchOnly} onCheckedChange={handleSwitch('exactMatchOnly')} />
        </div>

        <div className="flex justify-between items-center">
          <Label className="field-label">🔍 Case Sensitive</Label>
          <Switch checked={settings.caseSensitive} onCheckedChange={handleSwitch('caseSensitive')} />
        </div>

        <div className="flex justify-between items-center">
          <Label className="field-label">📌 Match as Substring</Label>
          <Switch checked={settings.substringMatch} onCheckedChange={handleSwitch('substringMatch')} />
        </div>

        <div>
          <Label className="field-label">🔢 Min Unique Keyword Hits</Label>
          <input
            type="number"
            className="input-field w-24"
            value={settings.minKeywordHits}
            onChange={(e) => handleSettingChange('minKeywordHits', Number(e.target.value))}
          />
        </div>

        <div className="flex justify-between items-center">
          <Label className="field-label">🎯 Cap Score at 100</Label>
          <Switch checked={settings.capScoreAt100} onCheckedChange={handleSwitch('capScoreAt100')} />
        </div>

        <LoadingButton loading={loading} className="btn-primary btn-full mt-4" onClick={handleSave}>
          Save Changes
        </LoadingButton>
      </div>
    </div>
  );
};

export default RelevanceSettings;
