import React, { useState } from 'react';
import {
  Building2,
  User as UserIcon,
  ShieldCheck,
  Bell,
  ChevronDown,
  Globe,
  HelpCircle,
  RefreshCw,
  LogOut,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import { masterStore } from '../../services/storage';
import { User, Branch } from '../../types';

interface HeaderProps {
  currentUser: User;
  branches: Branch[];
  activeBranchId: string;
  onOpenDeploymentGuide: () => void;
  onResetData: () => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  branches,
  activeBranchId,
  onOpenDeploymentGuide,
  onResetData,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const users = masterStore.getUsers();
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
  const security = masterStore.getSecuritySettings();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Left: Mobile Toggle + Genuine Brand Logo & App Title */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="h-9 sm:h-10 w-auto flex items-center bg-white p-1 rounded border border-slate-100">
              <img
                src="/assets/brand/kosh-logo.webp"
                alt="Kosh Innovations"
                className="h-7 sm:h-8 max-w-[110px] sm:max-w-[140px] object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="h-7 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-[#060097] tracking-tight leading-tight truncate max-w-[190px] sm:max-w-none">
                  Kosh Global Item Creation
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#060097] border border-blue-200">
                  SAP B1 HANA Connected
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate max-w-[190px] sm:max-w-none">
                Global Item Master & Governance
              </p>
            </div>
          </div>
        </div>

        {/* Right: Branch Selector, Role Switcher, 2FA status, User Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {/* Active Branch Selector */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs">
            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-slate-500 font-medium">Branch / Plant:</span>
            <select
              aria-label="Branch or Plant Selector"
              value={activeBranchId}
              onChange={(e) => masterStore.setActiveBranchId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer max-w-[180px] truncate"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name.split('(')[0].trim()} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Role Simulator dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 bg-[#060097]/5 hover:bg-[#060097]/10 text-[#060097] border border-[#060097]/20 rounded-md text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer"
              title="Switch user to evaluate RBAC permissions"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#060097]" />
              <span className="hidden sm:inline">Role:</span>
              <span className="font-bold underline">{currentUser.role.replace('_', ' ')}</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Test Persona (RBAC Simulation)
                  </p>
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      masterStore.setCurrentUser(u.id);
                      setShowRoleSwitcher(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-slate-50 transition-colors ${
                      u.id === currentUser.id ? 'bg-blue-50/70 border-l-3 border-[#060097]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{u.displayName}</span>
                      <span className="px-1.5 py-0.5 text-[10px] rounded font-semibold bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2FA Status Indicator */}
          {security.isTwoFactorEmailEnabled && (
            <div
              className="hidden xl:flex items-center space-x-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[11px] font-medium border border-emerald-200"
              title="Email 2FA Security is Active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>2FA Active</span>
            </div>
          )}

          {/* Subdomain & Deployment Documentation Button */}
          <button
            onClick={onOpenDeploymentGuide}
            className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
            title="Subdomain & Deployment Specs (my.koshinnovations.com)"
          >
            <Globe className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Deployment Guide</span>
          </button>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#060097] text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-200">
                {currentUser.displayName.substring(0, 2).toUpperCase()}
              </div>
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">{currentUser.displayName}</p>
                  <p className="text-xs text-slate-500">{currentUser.email}</p>
                  <div className="mt-1.5 flex items-center space-x-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#060097] text-white">
                      {currentUser.role}
                    </span>
                    <span className="text-[11px] text-slate-400">ID: {currentUser.employeeId}</span>
                  </div>
                </div>

                <div className="px-4 py-2 text-xs text-slate-600 border-b border-slate-100">
                  <p className="font-semibold text-slate-500 mb-1">Assigned Plant Permissions:</p>
                  <p className="text-[11px] text-slate-700 font-medium">
                    {currentUser.assignedBranchIds.length === branches.length
                      ? 'Enterprise Access (All 5 Plants)'
                      : `${currentUser.assignedBranchIds.length} Plants authorized`}
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      onResetData();
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center space-x-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Master Data to Factory Seeds</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
