import React, { useState, useEffect } from 'react';
import { balesAPI } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    winter_warning_days: '7',
    summer_warning_days: '5',
    smhi_latitude: '59.3293',
    smhi_longitude: '18.0686',
    email_smtp_host: '',
    email_smtp_port: '587',
    email_smtp_user: '',
    email_smtp_password: '',
    email_to: '',
    email_notifications_enabled: 'false'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await balesAPI.getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await balesAPI.updateSettings({
        winterWarningDays: parseInt(settings.winter_warning_days),
        summerWarningDays: parseInt(settings.summer_warning_days),
        smhiLatitude: parseFloat(settings.smhi_latitude),
        smhiLongitude: parseFloat(settings.smhi_longitude),
        emailSmtpHost: settings.email_smtp_host,
        emailSmtpPort: parseInt(settings.email_smtp_port),
        emailSmtpUser: settings.email_smtp_user,
        emailSmtpPassword: settings.email_smtp_password,
        emailNotificationTo: settings.email_notification_to,
        emailEnabled: settings.email_enabled === 'true'
      });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="bg-white shadow-md rounded-lg p-6 space-y-8">
        {/* Warning Days Settings */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Bale Warning Thresholds</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Winter Warning Days
              </label>
              <input
                type="number"
                value={settings.winter_warning_days}
                onChange={(e) => setSettings({ ...settings, winter_warning_days: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Days a bale can be open in winter before warning</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summer Warning Days
              </label>
              <input
                type="number"
                value={settings.summer_warning_days}
                onChange={(e) => setSettings({ ...settings, summer_warning_days: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Days a bale can be open in summer before warning</p>
            </div>
          </div>
        </div>

        {/* SMHI Location Settings */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">SMHI Weather Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={settings.smhi_latitude}
                onChange={(e) => setSettings({ ...settings, smhi_latitude: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 59.3293 (Stockholm)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={settings.smhi_longitude}
                onChange={(e) => setSettings({ ...settings, smhi_longitude: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Default: 18.0686 (Stockholm)</p>
            </div>
          </div>
        </div>

        {/* Email Notification Settings */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Email Notifications</h2>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email_notifications_enabled === 'true'}
                onChange={(e) => setSettings({ ...settings, email_notifications_enabled: e.target.checked.toString() })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Enable Email Notifications</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Send email alerts when bales have been open too long</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Host
              </label>
              <input
                type="text"
                value={settings.email_smtp_host}
                onChange={(e) => setSettings({ ...settings, email_smtp_host: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Port
              </label>
              <input
                type="number"
                value={settings.email_smtp_port}
                onChange={(e) => setSettings({ ...settings, email_smtp_port: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="587"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Username
              </label>
              <input
                type="text"
                value={settings.email_smtp_user}
                onChange={(e) => setSettings({ ...settings, email_smtp_user: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="your-email@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Password
              </label>
              <input
                type="password"
                value={settings.email_smtp_password}
                onChange={(e) => setSettings({ ...settings, email_smtp_password: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="••••••••"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Email
              </label>
              <input
                type="email"
                value={settings.email_to}
                onChange={(e) => setSettings({ ...settings, email_to: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="alerts@yourdomain.com"
              />
              <p className="text-xs text-gray-500 mt-1">Email address to receive notifications</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
