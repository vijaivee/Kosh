import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Database,
  FileText,
  CheckSquare,
  Tags,
  Code,
  FileCode,
  History,
  Building,
  Users,
  Server,
  UploadCloud,
  ShieldAlert,
  Settings,
  GitBranch,
  X,
} from 'lucide-react';
import { User } from '../../types';
import { hasPermission } from '../../services/authAndRbac';

export type NavItemKey =
  | 'dashboard'
  | 'create-item'
  | 'item-master'
  | 'my-requests'
  | 'approval-inbox'
  | 'classifications'
  | 'code-rules'
  | 'desc-rules'
  | 'rule-history'
  | 'branch-availability'
  | 'org-branches'
  | 'user-admin'
  | 'sap-monitor'
  | 'import-export'
  | 'audit-logs'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  currentUser: User;
  counts: {
    pendingApprovals: number;
    drafts: number;
    sapFailures: number;
    returned: number;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  counts,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const role = currentUser.role;

  const navItems: {
    key: NavItemKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
    requiredPermission?: string;
  }[] = [
    {
      key: 'dashboard',
      label: '1. Dashboard',
      icon: LayoutDashboard,
    },
    {
      key: 'create-item',
      label: '2. Item Creation',
      icon: PlusCircle,
      requiredPermission: 'item.create',
    },
    {
      key: 'item-master',
      label: '3. Global Item Master',
      icon: Database,
    },
    {
      key: 'my-requests',
      label: '4. My Requests',
      icon: FileText,
      badge: counts.drafts + counts.returned > 0 ? counts.drafts + counts.returned : undefined,
      badgeColor: counts.returned > 0 ? 'bg-amber-500' : 'bg-slate-500',
    },
    {
      key: 'approval-inbox',
      label: '5. Approval Inbox',
      icon: CheckSquare,
      badge: counts.pendingApprovals > 0 ? counts.pendingApprovals : undefined,
      badgeColor: 'bg-red-500',
      requiredPermission: 'item.approve',
    },
    {
      key: 'classifications',
      label: '6. Classification Masters',
      icon: Tags,
      requiredPermission: 'classification.manage',
    },
    {
      key: 'code-rules',
      label: '7. Item Code Rules',
      icon: Code,
      requiredPermission: 'rule.manage',
    },
    {
      key: 'desc-rules',
      label: '8. Item Description Rules',
      icon: FileCode,
      requiredPermission: 'rule.manage',
    },
    {
      key: 'rule-history',
      label: '9. Rule Version History',
      icon: History,
      requiredPermission: 'rule.manage',
    },
    {
      key: 'branch-availability',
      label: '10. Branch Item Availability',
      icon: GitBranch,
    },
    {
      key: 'org-branches',
      label: '11. Org & Branch Mgmt',
      icon: Building,
      requiredPermission: 'branch.manage',
    },
    {
      key: 'user-admin',
      label: '12. User & Role Admin',
      icon: Users,
      requiredPermission: 'user.manage',
    },
    {
      key: 'sap-monitor',
      label: '13. SAP Integration Monitor',
      icon: Server,
      badge: counts.sapFailures > 0 ? counts.sapFailures : undefined,
      badgeColor: 'bg-red-600',
    },
    {
      key: 'import-export',
      label: '14. Import / Export',
      icon: UploadCloud,
    },
    {
      key: 'audit-logs',
      label: '15. Audit Logs',
      icon: ShieldAlert,
      requiredPermission: 'audit.read',
    },
    {
      key: 'settings',
      label: '16. System Settings',
      icon: Settings,
      requiredPermission: 'system.configure',
    },
  ];

  const visibleItems = navItems.filter((item) => {
    if (!item.requiredPermission) return true;
    return hasPermission(role, item.requiredPermission as any);
  });

  const sidebarContent = (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
          Enterprise Governance
        </p>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => {
                onSelectTab(item.key);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#060097] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white shrink-0 ${
                    item.badgeColor || 'bg-slate-500'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">Kosh Innovations</span>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 inline-block"></span>
            HANA v2
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          IATF 16949 / ISO 9001:2015
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 min-h-[calc(100vh-61px)]">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/50 backdrop-blur-xs flex">
          <div className="h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
