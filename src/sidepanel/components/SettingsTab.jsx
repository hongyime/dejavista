import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsTab() {
  const { user, supabase, signOut } = useAuth();
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadUserPhoto();
  }, [user, supabase]);

  const loadSettings = async () => {
    const result = await chrome.storage.local.get(['incognitoMode']);
    setIncognitoMode(result.incognitoMode || false);
  };

  const loadUserPhoto = async () => {
    if (!user || !supabase) return;

    try {
      const { data } = await supabase.storage
        .from('user_photos')
        .download(`${user.id}/reference.jpg`);

      if (data) {
        const url = URL.createObjectURL(data);
        setPhotoPreview(url);
      }
    } catch (error) {
      // Photo doesn't exist
    }
  };

  const handleIncognitoToggle = async (value) => {
    setIncognitoMode(value);
    await chrome.storage.local.set({ incognitoMode: value });
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user || !supabase) return;

    setUploading(true);
    try {
      // Preview
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);

      // Upload to Supabase
      const { error } = await supabase.storage
        .from('user_photos')
        .upload(`${user.id}/reference.jpg`, file, {
          upsert: true,
          contentType: file.type,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handlePurgeMemory = async () => {
    if (!confirm('Are you sure? This will delete all your browsing history and photos.')) {
      return;
    }

    if (!user || !supabase) return;

    try {
      // Delete all closet items
      const { error: itemsError } = await supabase
        .from('closet_items')
        .delete()
        .eq('user_id', user.id);

      if (itemsError) throw itemsError;

      // Delete user photo
      await supabase.storage
        .from('user_photos')
        .remove([`${user.id}/reference.jpg`]);

      // Clear local cache
      await chrome.storage.local.clear();

      alert('Memory purged successfully');
      setPhotoPreview(null);
    } catch (error) {
      console.error('Error purging memory:', error);
      alert('Failed to purge memory');
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Account
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          {user?.email}
        </p>
        <button className="btn btn-secondary" onClick={signOut}>
          Sign Out
        </button>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Reference Photo
        </h3>
        {photoPreview && (
          <img
            src={photoPreview}
            alt="Your reference"
            className="product-image"
            style={{ marginBottom: '12px' }}
            referrerPolicy="no-referrer"
          />
        )}
        <label className="btn btn-secondary" style={{ display: 'block', textAlign: 'center' }}>
          {photoPreview ? 'Change Photo' : 'Upload Photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
        {uploading && (
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Privacy
        </h3>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontWeight: 500, marginBottom: '4px' }}>Incognito Mode</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Pause syncing while browsing
            </p>
          </div>
          <button
            className={`toggle ${incognitoMode ? 'active' : ''}`}
            onClick={() => handleIncognitoToggle(!incognitoMode)}
            type="button"
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Data
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
          Delete all your browsing history and uploaded photos
        </p>
        <button className="btn btn-destructive" onClick={handlePurgeMemory}>
          Purge Memory
        </button>
      </div>
    </div>
  );
}
