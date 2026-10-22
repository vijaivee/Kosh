import React, { useState, useEffect } from 'react';
import { masterStore } from './services/storage';
import { User, Branch, GlobalItem } from './types';
import { Header } from './components/layout/Header';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ItemCreationPage } from './pages/ItemCreationPage';
import { ItemMasterPage } from './pages/ItemMasterPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { ApprovalInboxPage } from './pages/ApprovalInboxPage';
import { ClassificationMasterPage } from './pages/ClassificationMasterPage';
import { ItemCodeRuleBuilderPage } from './pages/ItemCodeRuleBuilderPage';
import { ItemDescriptionRuleBuilderPage } from './pages/ItemDescriptionRuleBuilderPage';
import { RuleVersionHistoryPage } from './pages/RuleVersionHistoryPage';
import { BranchAvailabilityPage } from './pages/BranchAvailabilityPage';
import { OrgBranchManagementPage } from './pages/OrgBranchManagementPage';
import { UserAdminPage } from './pages/UserAdminPage';
import { SapIntegrationMonitorPage } from './pages/SapIntegrationMonitorPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SystemSettingsPage } from './pages/SystemSettingsPage';
import { DeploymentGuideModal } from './components/DeploymentGuideModal';

export default function App() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = masterStore.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const currentUser = masterStore.getCurrentUser();
  const branches = masterStore.getBranches();
  const activeBranchId = masterStore.getActiveBranchId();
  const items = masterStore.getItems();

  // Navigation & UI state
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [editingItem, setEditingItem] = useState<GlobalItem | null>(null);
  const [isDeploymentGuideOpen, setIsDeploymentGuideOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Badge counts
  const pendingApprovalsCount = items.filter(
    (i) => i.status === 'Submitted' || i.status === 'Under Review'
  ).length;
  const draftsCount = items.filter((i) => i.status === 'Draft').length;
  const sapFailuresCount = items.filter((i) => i.status === 'SAP Failed').length;
  const returnedCount = items.filter((i) => i.status === 'Returned for Correction').length;

  const handleEditItem = (item: GlobalItem) => {
    setEditingItem(item);
    setCurrentTab('create-item');
  };

  const handleClearEditingItem = () => {
    setEditingItem(null);
  };

  const handleResetData = () => {
    if (confirm('Reset entire system database to initial factory seeds?')) {
      masterStore.initIfEmpty(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F5F7] flex flex-col font-sans">
      {/* Top Application Header with Kosh Logo & Role Switcher */}
      <Header
        currentUser={currentUser}
        branches={branches}
        activeBranchId={activeBranchId}
        onOpenDeploymentGuide={() => setIsDeploymentGuideOpen(true)}
        onResetData={handleResetData}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Permission-Aware Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'create-item') setEditingItem(null);
          }}
          currentUser={currentUser}
          counts={{
            pendingApprovals: pendingApprovalsCount,
            drafts: draftsCount,
            sapFailures: sapFailuresCount,
            returned: returnedCount,
          }}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Page Surface */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto max-h-[calc(100vh-61px)]">
          {currentTab === 'dashboard' && (
            <DashboardPage currentUser={currentUser} onNavigate={setCurrentTab} />
          )}

          {currentTab === 'create-item' && (
            <ItemCreationPage
              currentUser={currentUser}
              onNavigate={setCurrentTab}
              editingItem={editingItem}
              onClearEditingItem={handleClearEditingItem}
            />
          )}

          {currentTab === 'item-master' && (
            <ItemMasterPage currentUser={currentUser} onEditItem={handleEditItem} />
          )}

          {currentTab === 'my-requests' && (
            <MyRequestsPage
              currentUser={currentUser}
              onNavigate={setCurrentTab}
              onEditItem={handleEditItem}
            />
          )}

          {currentTab === 'approval-inbox' && (
            <ApprovalInboxPage currentUser={currentUser} />
          )}

          {currentTab === 'classifications' && (
            <ClassificationMasterPage currentUser={currentUser} />
          )}

          {currentTab === 'code-rules' && (
            <ItemCodeRuleBuilderPage currentUser={currentUser} />
          )}

          {currentTab === 'desc-rules' && (
            <ItemDescriptionRuleBuilderPage currentUser={currentUser} />
          )}

          {currentTab === 'rule-history' && (
            <RuleVersionHistoryPage currentUser={currentUser} />
          )}

          {currentTab === 'branch-availability' && (
            <BranchAvailabilityPage currentUser={currentUser} />
          )}

          {currentTab === 'org-branches' && (
            <OrgBranchManagementPage currentUser={currentUser} />
          )}

          {currentTab === 'user-admin' && (
            <UserAdminPage currentUser={currentUser} />
          )}

          {currentTab === 'sap-monitor' && (
            <SapIntegrationMonitorPage currentUser={currentUser} />
          )}

          {currentTab === 'import-export' && (
            <ImportExportPage currentUser={currentUser} onNavigate={setCurrentTab} />
          )}

          {currentTab === 'audit-logs' && (
            <AuditLogPage currentUser={currentUser} />
          )}

          {currentTab === 'settings' && (
            <SystemSettingsPage
              currentUser={currentUser}
              onOpenDeploymentGuide={() => setIsDeploymentGuideOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Subdomain & Deployment Documentation Modal */}
      <DeploymentGuideModal
        isOpen={isDeploymentGuideOpen}
        onClose={() => setIsDeploymentGuideOpen(false)}
      />
    </div>
  );
}
