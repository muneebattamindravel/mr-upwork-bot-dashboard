import { useState, useEffect } from 'react';
import { getFileContent, saveFileContent } from '../apis/kb';

const ProfileEditor = ({ profile, fileType = 'keywords', onClose }) => {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchContent = async () => {
    try {
      const res = await getFileContent(profile, fileType);
      setContent(res.data.data.content);
    } catch (err) {
      console.error('Failed to fetch file content:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveFileContent(profile, fileType, content);
      setMessage(res.data.message);
    } catch (err) {
      console.error('Failed to save content');
      setMessage('Save failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [profile, fileType]);

  return (
    <div className="p-4 border rounded bg-white shadow-md max-w-3xl mx-auto mt-4">
      <h3 className="text-lg font-semibold mb-2">
        Editing: <span className="text-blue-600">{profile}/{fileType}.txt</span>
      </h3>

      <textarea
        className="w-full h-64 border rounded p-2 mb-4 font-mono"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-1 rounded"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="bg-gray-300 text-black px-4 py-1 rounded"
        >
          Close
        </button>
      </div>

      {message && <p className="text-green-600 mt-2">{message}</p>}
    </div>
  );
};

export default ProfileEditor;
