import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Building,
  User as UserIcon,
  Server,
  Layers,
  Send,
  X,
  GitBranch,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Award,
  ChevronRight,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { GlobalItem, User, HierarchyLevel } from '../types';
import { evaluateApprovalAuthority, getReportingChain } from '../services/approvalHierarchy';
import { syncItemToSapB1Hana } from '../services/sapIntegration';

interface ApprovalInboxPageProps {
  currentUser: User;
}

export const ApprovalInboxPage: React.FC<ApprovalInboxPageProps> = ({ currentUser }) => {
  const items = masterStore.getItems();
  const branches = masterStore.getBranches();
  const users = masterStore.getUsers();
  const approvalRules = masterStore.getApprovalMatrixRules();

  // Dialog state for Return or Reject
  const [modalItem, setModalItem] = useState<{
    item: GlobalItem;
    action: 'Return' | 'Reject';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Items requiring checker approval
  const pendingItems = items.filter(
    (item) => item.status === 'Submitted' || item.status === 'Under Review'
  );

  const handleApprove = async (item: GlobalItem) => {
    const authEval = evaluateApprovalAuthority(currentUser, item, users, approvalRules);
    if (!authEval.allowed) {
      alert(`Approval Denied: ${authEval.reason}`);
      return;
    }

    setProcessingId(item.id);

    try {
      // Step 1: Record Approval Decision with Hierarchy metadata
      const approvalEntry = {
        id: `app-${Date.now()}`,
        action: 'Approved' as const,
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        actorRole: currentUser.role,
        comments: `Approved via ${authEval.matchType || 'HIERARCHY_RULE'} (Level ${authEval.userLevel} - ${currentUser.designation || currentUser.role}). ${authEval.applicableRule.name}.`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        itemVersionSnapshot: item.version,
      };

      const approvedItem: GlobalItem = {
        ...item,
        status: 'Approved',
        approvalRoutingRuleId: authEval.applicableRule.id,
        approvalRoutingReason: authEval.reason,
        targetApproverId: currentUser.id,
        requiredApproverLevel: authEval.requiredLevel,
        approvalHistory: [...item.approvalHistory, approvalEntry],
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      masterStore.saveItem(approvedItem, 'ITEM_APPROVED');

      // Step 2: Automatic SAP B1 HANA Synchronization
      const sapResult = await syncItemToSapB1Hana(approvedItem, 'KOSH_PROD_HANA');

      if (sapResult.success) {
        masterStore.saveSapJob(sapResult.job);
        const syncedItem: GlobalItem = {
          ...approvedItem,
          status: 'SAP Created',
          sapItemCode: sapResult.sapItemCode,
          sapCompanyDb: 'KOSH_PROD_HANA',
          sapSyncStatus: 'Synced',
          sapSyncedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };
        masterStore.saveItem(syncedItem, 'SAP_SYNC_COMPLETED');
        setNotification(`Item "${item.itemCode}" approved by Level ${authEval.userLevel} authority and successfully synced to SAP HANA!`);
      } else {
        masterStore.saveSapJob(sapResult.job);
        const failedItem: GlobalItem = {
          ...approvedItem,
          status: 'SAP Failed',
          sapSyncStatus: 'Failed',
          sapErrorMessage: sapResult.errorMessage,
        };
        masterStore.saveItem(failedItem, 'SAP_SYNC_FAILED');
        setNotification(`Item "${item.itemCode}" approved, but SAP B1 queue failed. Check SAP Monitor.`);
      }
    } finally {
      setProcessingId(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleConfirmDecision = () => {
    if (!modalItem) return;
    if (!actionReason.trim() || actionReason.trim().length < 5) {
      setReasonError('Please provide a descriptive explanation (at least 5 characters).');
      return;
    }

    const { item, action } = modalItem;
    const isReturn = action === 'Return';

    const historyEntry = {
      id: `app-${Date.now()}`,
      action: isReturn ? ('Returned for Correction' as const) : ('Rejected' as const),
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      actorRole: currentUser.role,
      comments: actionReason.trim(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      itemVersionSnapshot: item.version,
    };

    const updatedItem: GlobalItem = {
      ...item,
      status: isReturn ? 'Returned for Correction' : 'Rejected',
      approvalHistory: [...item.approvalHistory, historyEntry],
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    masterStore.saveItem(updatedItem, isReturn ? 'ITEM_RETURNED' : 'ITEM_REJECTED');
    setNotification(
      `Item "${item.itemCode}" has been ${isReturn ? 'returned for revision' : 'rejected'} by ${currentUser.displayName}.`
    );
    setModalItem(null);
    setActionReason('');
    setReasonError(null);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <CheckSquare className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Maker-Checker & Hierarchy Approval Inbox</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 5: Multi-tier approvals governed by Maker employee reporting lines, plant hierarchy (Levels 1-4), and classification category gates.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1.5 rounded-md font-bold bg-amber-50 text-amber-800 border border-amber-200">
            {pendingItems.length} Pending Review
          </span>
        </div>
      </div>

      {/* Interactive Persona Switcher for Live Hierarchy Testing */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
            <GitBranch className="w-4 h-4 text-[#060097]" />
            <span>Interactive Employee Hierarchy Persona Switcher</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Current Persona: <strong className="text-[#060097]">{currentUser.displayName}</strong> (Level {currentUser.hierarchyLevel || 1} • {currentUser.designation || currentUser.role})
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Switch personas below to test approval eligibility across different plant hierarchy tiers, reporting manager lines, and category specialist gates:
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {users.map((u) => {
            const isSelected = u.id === currentUser.id;
            const levelLabel = `L${u.hierarchyLevel || 1}`;
            return (
              <button
                key={u.id}
                onClick={() => masterStore.setCurrentUser(u.id)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center space-x-1.5 border ${
                  isSelected
                    ? 'bg-[#060097] text-white border-[#060097] shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <span
                  className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {levelLabel}
                </span>
                <span>{u.displayName}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                  ({u.designation ? u.designation.split(' - ')[0] : u.role})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3.5 rounded-r-md text-xs font-bold text-emerald-900 animate-in fade-in-50">
          {notification}
        </div>
      )}

      {/* Pending Items List */}
      <div className="space-y-4">
        {pendingItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
            <p className="font-semibold text-slate-700 text-sm">Approval Inbox is Empty</p>
            <p className="text-xs text-slate-400 mt-1">
              All submitted master data requests have been reviewed and processed according to hierarchy governance.
            </p>
          </div>
        ) : (
          pendingItems.map((item) => {
            const originBranch = branches.find((b) => b.id === item.originBranchId);
            const authEval = evaluateApprovalAuthority(currentUser, item, users, approvalRules);
            const makerUser = users.find((u) => u.id === item.createdBy);
            const reportingChain = makerUser ? getReportingChain(makerUser.id, users) : [];

            return (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4"
              >
                {/* Item Summary Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-base text-[#060097]">
                        {item.itemCode}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {item.status}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Submitted: {item.createdAt}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {item.itemDescription}
                    </h3>
                  </div>

                  {/* Maker Identity & Hierarchy Origin */}
                  <div className="text-left md:text-right text-xs">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                      Originating Maker & Plant:
                    </span>
                    <span className="font-bold text-slate-800">
                      {item.createdByName}{' '}
                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-normal">
                        L{makerUser?.hierarchyLevel || 1}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {makerUser?.designation || 'Item Creator'} • {originBranch ? originBranch.name.split('(')[0] : item.originBranchId}
                    </span>
                  </div>
                </div>

                {/* Maker Employee Hierarchy Path & Governance Gate */}
                <div className="bg-slate-50/80 rounded-md border border-slate-200 p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
                      <GitBranch className="w-3.5 h-3.5 text-[#060097]" />
                      <span>Employee Reporting Line & Governance Gate:</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        Rule: {authEval.applicableRule.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        Required Level: L{authEval.applicableRule.requiredApproverLevel}+
                      </span>
                    </div>
                  </div>

                  {/* Linear Hierarchy Chain Representation */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">
                    <div className="flex items-center space-x-1">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                        M
                      </span>
                      <span className="font-semibold text-slate-900">{item.createdByName}</span>
                      <span className="text-[10px] text-slate-500">(Maker - L{makerUser?.hierarchyLevel || 1})</span>
                    </div>

                    {reportingChain.length > 0 ? (
                      reportingChain.map((manager, idx) => (
                        <React.Fragment key={manager.id}>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="flex items-center space-x-1">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-[#060097] flex items-center justify-center text-[10px] font-bold">
                              L{manager.hierarchyLevel || 2}
                            </span>
                            <span className="font-semibold text-slate-800">{manager.displayName}</span>
                            <span className="text-[10px] text-slate-500">
                              ({idx === 0 ? 'Direct Mgr' : manager.designation?.split(' - ')[0] || manager.role})
                            </span>
                          </div>
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No higher managers designated</span>
                    )}
                  </div>
                </div>

                {/* Classification Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs bg-slate-50 p-3 rounded border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Category</span>
                    <span className="font-bold text-slate-800">{item.categoryCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Material</span>
                    <span className="font-bold text-slate-800">{item.materialCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Type</span>
                    <span className="font-bold text-slate-800">{item.typeCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Process</span>
                    <span className="font-bold text-slate-800">{item.processCode || '---'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Colour</span>
                    <span className="font-bold text-slate-800">{item.colourCode || '---'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Dimensions</span>
                    <span className="font-bold text-slate-800">{item.dimensions || '---'}</span>
                  </div>
                </div>

                {/* Hierarchy Authority Evaluation Result Banner */}
                {authEval.allowed ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded text-xs text-emerald-900 flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Approval Authority Granted:</span> {authEval.reason}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-300 p-3 rounded text-xs text-amber-900 flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Approval Ineligible for Current Persona ({currentUser.displayName}):</span>{' '}
                      {authEval.reason}
                    </div>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-500">
                    Target ERP: <strong className="text-blue-900">SAP Business One HANA</strong>
                    {authEval.applicableRule.requiresCategorySpecialist && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold">
                        Category Specialist Gate
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setModalItem({ item, action: 'Return' })}
                      disabled={!authEval.allowed}
                      title={!authEval.allowed ? authEval.reason : 'Return item for maker correction'}
                      className="px-3.5 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return for Correction</span>
                    </button>

                    <button
                      onClick={() => setModalItem({ item, action: 'Reject' })}
                      disabled={!authEval.allowed}
                      title={!authEval.allowed ? authEval.reason : 'Reject item request'}
                      className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(item)}
                      disabled={!authEval.allowed || processingId === item.id}
                      title={!authEval.allowed ? authEval.reason : 'Approve and trigger SAP B1 creation'}
                      className="px-4 py-1.5 bg-[#060097] hover:bg-[#04006e] text-white rounded text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>
                        {processingId === item.id ? 'Creating in SAP B1...' : 'Approve & Create in SAP'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Return / Reject Reason Modal */}
      {modalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg p-5 space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                {modalItem.action === 'Return' ? (
                  <RotateCcw className="w-4 h-4 text-orange-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span>
                  {modalItem.action === 'Return' ? 'Return Item for Correction' : 'Reject Item Request'}
                </span>
              </h3>
              <button
                onClick={() => {
                  setModalItem(null);
                  setReasonError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600 mb-2">
                Item:{' '}
                <strong className="text-slate-900 font-mono">{modalItem.item.itemCode}</strong> –{' '}
                {modalItem.item.itemDescription}
              </p>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Required Modifications <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => {
                  setActionReason(e.target.value);
                  if (reasonError) setReasonError(null);
                }}
                placeholder="Explain required changes (e.g., Verify material grade, correct drawing part number, verify tolerance)..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-medium text-slate-900 focus:bg-white focus:border-[#060097] outline-none"
              />
              {reasonError && (
                <p className="text-[11px] text-red-600 font-semibold mt-1">{reasonError}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setModalItem(null);
                  setReasonError(null);
                }}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecision}
                className={`px-4 py-1.5 text-white rounded text-xs font-bold transition-colors ${
                  modalItem.action === 'Return'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {modalItem.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
