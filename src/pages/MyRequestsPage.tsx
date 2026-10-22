import React, { useState } from 'react';
import {
  FileText,
  Clock,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Edit3,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { GlobalItem, User } from '../types';
import { NavItemKey } from '../components/layout/Sidebar';

interface MyRequestsPageProps {
  currentUser: User;
  onNavigate: (tab: NavItemKey) => void;
  onEditItem: (item: GlobalItem) => void;
}

export const MyRequestsPage: React.FC<MyRequestsPageProps> = ({
  currentUser,
  onNavigate,
  onEditItem,
}) => {
  const items = masterStore.getItems();
  const branches = masterStore.getBranches();

  // Active filter tab
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED'>('ALL');

  // Filter items created by current user or within user branch
  const userItems = items.filter((item) => {
    // Show items created by this user or, if admin, show all
    const isOwner = item.createdBy === currentUser.id || currentUser.role === 'ORG_ADMIN' || currentUser.role === 'PLATFORM_ADMIN';
    if (!isOwner) return false;

    if (activeFilter === 'DRAFT') return item.status === 'Draft';
    if (activeFilter === 'SUBMITTED') return item.status === 'Submitted' || item.status === 'Under Review';
    if (activeFilter === 'RETURNED') return item.status === 'Returned for Correction';
    if (activeFilter === 'APPROVED') return item.status === 'Approved' || item.status === 'SAP Created' || item.status === 'SAP Pending';
    return true;
  });

  const handleDeleteDraft = (id: string) => {
    if (confirm('Are you sure you want to discard this draft item request?')) {
      const allItems = masterStore.getItems().filter((i) => i.id !== id);
      localStorage.setItem('kosh_item_master_items', JSON.stringify(allItems));
      masterStore.initIfEmpty();
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <FileText className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">My Master Data Requests</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track, revise, and manage your item creation submissions and draft requests.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create-item')}
          className="px-4 py-2 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Item Request</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-semibold">
        {[
          { key: 'ALL', label: 'All Requests' },
          { key: 'DRAFT', label: 'Drafts' },
          { key: 'SUBMITTED', label: 'Submitted (In Review)' },
          { key: 'RETURNED', label: 'Returned for Correction' },
          { key: 'APPROVED', label: 'Approved & SAP' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            className={`pb-2.5 px-1 border-b-2 transition-colors cursor-pointer ${
              activeFilter === tab.key
                ? 'border-[#060097] text-[#060097] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {userItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-500" />
            <p className="font-semibold text-slate-600">No requests in this category</p>
            <p className="text-xs text-slate-400 mt-1">
              Start by drafting or submitting a new global item request
            </p>
          </div>
        ) : (
          userItems.map((item) => {
            const originBranch = branches.find((b) => b.id === item.originBranchId);
            const latestAction = item.approvalHistory[item.approvalHistory.length - 1];

            return (
              <div
                key={item.id}
                className={`bg-white rounded-lg border p-4.5 shadow-xs transition-all ${
                  item.status === 'Returned for Correction'
                    ? 'border-orange-300 bg-orange-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-black text-sm text-[#060097]">
                        {item.itemCode}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'Approved' || item.status === 'SAP Created'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'Returned for Correction'
                            ? 'bg-orange-100 text-orange-800'
                            : item.status === 'Submitted'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Version {item.version} • {item.createdAt}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">{item.itemDescription}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>Category: <strong className="text-slate-700">{item.categoryCode}</strong></span>
                      <span>Plant: <strong className="text-slate-700">{originBranch ? originBranch.name.split('(')[0] : item.originBranchId}</strong></span>
                      {item.specification && (
                        <span>Spec: <strong className="text-slate-700">{item.specification}</strong></span>
                      )}
                    </div>

                    {/* Returned Comments Callout */}
                    {item.status === 'Returned for Correction' && latestAction && (
                      <div className="mt-2.5 p-3 bg-orange-100/70 border border-orange-200 rounded-md text-xs text-orange-950 flex items-start space-x-2">
                        <RotateCcw className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Checker Feedback ({latestAction.actorName}):</span>{' '}
                          {latestAction.comments}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0">
                    {(item.status === 'Draft' || item.status === 'Returned for Correction') && (
                      <button
                        onClick={() => {
                          onEditItem(item);
                          onNavigate('create-item');
                        }}
                        className="px-3.5 py-1.5 bg-[#060097] hover:bg-[#04006e] text-white rounded text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{item.status === 'Returned for Correction' ? 'Revise & Resubmit' : 'Edit Draft'}</span>
                      </button>
                    )}

                    {item.status === 'Draft' && (
                      <button
                        onClick={() => handleDeleteDraft(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="Delete Draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
