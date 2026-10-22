import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Mail,
  Lock,
  Globe,
  Database,
  CheckCircle2,
  Save,
  Server,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { SystemSecuritySettings, User } from '../types';

interface SystemSettingsPageProps {
  currentUser: User;
  onOpenDeploymentGuide: () => void;
}

export const SystemSettingsPage: React.FC<SystemSettingsPageProps> = ({
  currentUser,
  onOpenDeploymentGuide,
}) => {
  const settings = masterStore.getSecuritySettings();

  // Settings State
  const [is2faEnabled, setIs2faEnabled] = useState(settings.isTwoFactorEmailEnabled);
  const [sessionTimeout, setSessionTimeout] = useState(settings.sessionTimeoutMinutes);
  const [minPasswordLength, setMinPasswordLength] = useState(settings.passwordMinLength);
  const [accountLockout, setAccountLockout] = useState(settings.accountLockoutAttempts);
  const [requireSpecialChar, setRequireSpecialChar] = useState(settings.requireSpecialChar);
  const [sapServiceLayerUrl, setSapServiceLayerUrl] = useState(settings.sapServiceLayerUrl);
  const [sapCompanyDb, setSapCompanyDb] = useState(settings.sapCompanyDb);

  // 2FA Test Simulation State
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [inputOtp, setInputOtp] = useState('');
  const [otpVerifyResult, setOtpVerifyResult] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const handleSaveSettings = () => {
    const updated: SystemSecuritySettings = {
      ...settings,
      isTwoFactorEmailEnabled: is2faEnabled,
      sessionTimeoutMinutes: sessionTimeout,
      passwordMinLength: minPasswordLength,
      accountLockoutAttempts: accountLockout,
      requireSpecialChar,
      sapServiceLayerUrl,
      sapCompanyDb,
    };
    masterStore.saveSecuritySettings(updated);
    setNotification('Security & System configurations saved and applied across the enterprise!');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGenerateTestOtp = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setMockOtp(code);
    setInputOtp('');
    setOtpVerifyResult(null);
  };

  const handleVerifyTestOtp = () => {
    if (inputOtp.trim() === mockOtp) {
      setOtpVerifyResult('SUCCESS: 2FA Email OTP code verified successfully!');
      masterStore.addAuditLog({
        action: '2FA_OTP_VERIFIED',
        entityType: 'Security',
        entityId: currentUser.id,
        outcome: 'SUCCESS',
        details: `Interactive 2FA simulation passed for ${currentUser.email}.`,
      });
    } else {
      setOtpVerifyResult('FAILED: Invalid OTP code entered. Please retry.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <Settings className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">System Security & Enterprise Configuration</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 1 & 2: Email 2FA Security, Session timeout policies, and SAP Business One HANA connection settings.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="px-4 py-2 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save System Settings</span>
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-xs font-bold text-emerald-900 rounded-r-md">
          {notification}
        </div>
      )}

      {/* Cloud & Email 2FA Section (Crucial user requirement) */}
      <div className="bg-white rounded-lg border-2 border-[#060097]/30 p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Email-Based Two-Factor Authentication (2FA)
              </h3>
              <p className="text-xs text-slate-500">
                Required for cloud deployment readiness. Provides OTP verification upon sign-in.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700">
              {is2faEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={is2faEnabled}
                onChange={(e) => setIs2faEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#060097]"></div>
            </label>
          </div>
        </div>

        {/* 2FA Interactive Simulation & Testing Panel */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-[#060097]" />
              <span>Interactive 2FA OTP Delivery & Verification Test</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Recipient: {currentUser.email}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Click below to generate a temporary OTP authorization token and verify authentication flow:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerateTestOtp}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded cursor-pointer"
            >
              Generate & Dispatch Email OTP
            </button>

            {mockOtp && (
              <div className="flex items-center space-x-2 animate-in fade-in-50">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={inputOtp}
                  onChange={(e) => setInputOtp(e.target.value)}
                  className="w-36 p-1.5 text-xs font-mono font-bold tracking-widest text-center bg-white border border-slate-300 rounded outline-none focus:border-[#060097]"
                />
                <button
                  onClick={handleVerifyTestOtp}
                  className="px-3 py-1.5 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded cursor-pointer"
                >
                  Verify Code
                </button>
              </div>
            )}
          </div>

          {mockOtp && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
              <strong>Simulated Email Delivered to {currentUser.email}:</strong> Your one-time Kosh master governance authorization code is{' '}
              <strong className="font-mono text-sm underline">{mockOtp}</strong>. Valid for 10 minutes.
            </div>
          )}

          {otpVerifyResult && (
            <div
              className={`p-2.5 rounded text-xs font-bold ${
                otpVerifyResult.startsWith('SUCCESS')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-red-50 text-red-800 border border-red-300'
              }`}
            >
              {otpVerifyResult}
            </div>
          )}
        </div>
      </div>

      {/* Security Policies */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Lock className="w-4 h-4 text-slate-700" />
          <span>Access Control & Password Policies</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Session Timeout (Minutes)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 30)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Default: 30 minutes</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Minimum Password Length
            </label>
            <input
              type="number"
              min={8}
              max={32}
              value={minPasswordLength}
              onChange={(e) => setMinPasswordLength(parseInt(e.target.value) || 10)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Argon2id hashing compliant</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Account Lockout Threshold
            </label>
            <input
              type="number"
              min={3}
              max={10}
              value={accountLockout}
              onChange={(e) => setAccountLockout(parseInt(e.target.value) || 5)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Failed attempts before lockout</span>
          </div>
        </div>
      </div>

      {/* SAP Business One HANA Connection Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Server className="w-4 h-4 text-blue-700" />
          <span>SAP Business One HANA Service Layer Parameters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Service Layer Base URL
            </label>
            <input
              type="text"
              value={sapServiceLayerUrl}
              onChange={(e) => setSapServiceLayerUrl(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Target SAP HANA Company Database
            </label>
            <input
              type="text"
              value={sapCompanyDb}
              onChange={(e) => setSapCompanyDb(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* Subdomain & Hosting Blueprint */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Globe className="w-4 h-4 text-slate-600" />
            <span>Corporate Subdomain Deployment Guide</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Production URL: <strong className="text-[#060097]">https://my.koshinnovations.com/</strong> | UAT: <strong className="text-slate-700">http://localhost/mykoshinnovations</strong>
          </p>
        </div>

        <button
          onClick={onOpenDeploymentGuide}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold cursor-pointer"
        >
          View Full Guide →
        </button>
      </div>
    </div>
  );
};
