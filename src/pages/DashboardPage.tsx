import React from 'react';
import {
  PackageCheck,
  FileEdit,
  Clock,
  RotateCcw,
  Server,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { User } from '../types';
import { NavItemKey } from '../components/layout/Sidebar';

interface DashboardPageProps {
  currentUser: User;
  onNavigate: (tab: NavItemKey) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, onNavigate }) => {
  const items = masterStore.getItems();
  const sapJobs = masterStore.getSapJobs();
  const branches = masterStore.getBranches();
  const auditLogs = masterStore.getAuditLogs().slice(0, 7);

  // Real-time metric calculations
  const totalApproved = items.filter((i) => i.status === 'Approved' || i.status === 'SAP Created' || i.status === 'SAP Pending').length;
  const drafts = items.filter((i) => i.status === 'Draft').length;
  const pendingApprovals = items.filter((i) => i.status === 'Submitted' || i.status === 'Under Review').length;
  const returnedRequests = items.filter((i) => i.status === 'Returned for Correction').length;
  const awaitingSap = items.filter((i) => i.status === 'Approved' || i.status === 'SAP Pending').length;
  const sapFailures = items.filter((i) => i.status === 'SAP Failed').length;
  const sapSynced = items.filter((i) => i.status === 'SAP Created').length;

  // Plant distribution
  const plantBreakdown = branches.map((b) => {
    const count = items.filter((item) =>
      item.branchAvailability?.some((ba) => ba.branchId === b.id && ba.isAvailable)
    ).length;
    return {
      branch: b,
      count,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 className="text-xl font-bold text-slate-900">
              Kosh Master Data Governance Dashboard
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manufacturing Operations & Master Item Creation • Connected to SAP B1 HANA (KOSH_PROD_HANA)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('create-item')}
            className="px-4 py-2 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <span>+ Create New Item</span>
          </button>
          {pendingApprovals > 0 && (
            <button
              onClick={() => onNavigate('approval-inbox')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Review Pending ({pendingApprovals})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div
          onClick={() => onNavigate('item-master')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-[#060097] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved Items</span>
            <PackageCheck className="w-4 h-4 text-[#060097]" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalApproved}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Globally Active</span>
        </div>

        <div
          onClick={() => onNavigate('my-requests')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-slate-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Draft Requests</span>
            <FileEdit className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{drafts}</div>
          <span className="text-[10px] text-slate-500 font-medium">In preparation</span>
        </div>

        <div
          onClick={() => onNavigate('approval-inbox')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{pendingApprovals}</div>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting checker</span>
        </div>

        <div
          onClick={() => onNavigate('my-requests')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-orange-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-orange-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Returned</span>
            <RotateCcw className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-600">{returnedRequests}</div>
          <span className="text-[10px] text-orange-600 font-medium">Need correction</span>
        </div>

        <div
          onClick={() => onNavigate('sap-monitor')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-blue-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">SAP Synced</span>
            <Server className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{sapSynced}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Live in HANA OITM</span>
        </div>

        <div
          onClick={() => onNavigate('sap-monitor')}
          className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs hover:border-red-400 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">SAP Failures</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600">{sapFailures}</div>
          <span className="text-[10px] text-red-600 font-medium">Requires attention</span>
        </div>
      </div>

      {/* Main Operational Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant Availability Breakdown */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[#060097]" />
              <span>Plant Item Availability</span>
            </h3>
            <button
              onClick={() => onNavigate('branch-availability')}
              className="text-xs text-[#060097] hover:underline font-semibold"
            >
              View Matrix →
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Global Item Master availability across Kosh manufacturing plants:
          </p>

          <div className="space-y-3.5">
            {plantBreakdown.map(({ branch, count }) => {
              const percentage = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
              return (
                <div key={branch.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{branch.name.split('(')[0].trim()}</span>
                    <span className="font-bold text-slate-900">{count} items ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#060097] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Global Item Definitions:</span>
            <span className="font-bold text-slate-900">{items.length} items</span>
          </div>
        </div>

        {/* Recent Authorized Master Data Activity */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#060097]" />
              <span>Recent Authorized Master Data Activities</span>
            </h3>
            <button
              onClick={() => onNavigate('audit-logs')}
              className="text-xs text-[#060097] hover:underline font-semibold"
            >
              Complete Audit Trail →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor & Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-slate-800">{log.actorName}</span>
                      <span className="block text-[10px] text-slate-400">{log.actorRole}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.outcome === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
