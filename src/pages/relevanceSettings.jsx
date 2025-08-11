'use client';

import React, { useEffect, useState } from 'react';
import { getProfile, updateProfile, getKBList } from '../apis/kb';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import LoadingButton from '@/components/ui/loading-button';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RelevanceSettings = () => {
  const [profile, setProfile] = useState(null);
  const [profileList, setProfileList] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfiles = async () => {
    try {
      const res = await getKBList();
      const profiles = res.data?.data?.profiles || [];
      setProfileList(profiles);

      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        setProfile(null);
        setSettings(null);
      }
    } catch (err) {
      console.error('Failed to load profiles', err);
      setProfileList([]);
      setProfile(null);
      setSettings(null);
    }
  };

  const fetchSettings = async (profileObj) => {
    if (!profileObj?._id) return;
    try {
      const res = await getProfile(profileObj._id);
      setSettings(res.data.data.profile.relevanceSettings || {});
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
    } else {
      setSettings(null);
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
    if (!profile?._id) return;
    setLoading(true);
    try {
      await updateProfile(profile._id, { relevanceSettings: settings });
      toast.success('✅ Relevance settings saved!');
    } catch (err) {
      toast.error('❌ Failed to save settings');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 max-w-screen-xl w-full space-y-6 mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">🎯 Relevance Engine Settings</h1>
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
      </div>

      {profile && settings ? (
        <div className="card space-y-6">
          <div>
            <Label className="field-label">🔠 Keyword Weight %</Label>
            <Slider
              value={[settings.keywordWeightPercent]}
              onValueChange={handleSlider('keywordWeightPercent')}
            />
            <p className="text-sm text-gray-500 mt-1">
              Balance: {settings.keywordWeightPercent}% keyword / {settings.fieldWeightPercent}% field
            </p>
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
            <Switch checked={settings.useSubstringMatch} onCheckedChange={handleSwitch('useSubstringMatch')} />
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

          <div className="flex justify-between items-center">
            <Label className="field-label">🧠 Use Semantic Search For Jobs?</Label>
            <Switch
              checked={settings.useSemanticSearch}
              onCheckedChange={handleSwitch('useSemanticSearch')}
            />
          </div>

          <div>
            <Label className="field-label">🎚️ Semantic Search Minimum Required Static Score</Label>
            <input
              type="number"
              className="input-field w-24"
              min={0}
              max={100}
              value={settings.semanticMinStaticScore ?? 0}
              onChange={(e) =>
                handleSettingChange('semanticMinStaticScore', Number(e.target.value))
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
          {profileList.length === 0
            ? 'No profiles found. Please create one first.'
            : 'Please select a profile to edit its settings.'}
        </div>
      )}
    </div>
  );
};

export default RelevanceSettings;
