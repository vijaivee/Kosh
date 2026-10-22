import React from 'react';
import { History, ShieldCheck, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { masterStore } from '../services/storage';
import { User } from '../types';

interface RuleVersionHistoryPageProps {
  currentUser: User;
}

export const RuleVersionHistoryPage: React.FC<RuleVersionHistoryPageProps> = ({ currentUser }) => {
  const codeRules = masterStore.getCodeRules();
  const descRules = masterStore.getDescriptionRules();
  const auditLogs = masterStore.getAuditLogs().filter((l) => l.entityType === 'Rule');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 bg-[#060097] text-white rounded-md">
            <History className="w-4 h-4" />
          </span>
          <h2 className="text-xl font-bold text-slate-900">Rule Versioning & Audit History</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Section 20.7: Every rule change creates an immutable, auditable version. Existing approved items remain protected from silent modification.
        </p>
      </div>

      {/* Active Code Rules */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Active Item Code Rule Versions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Rule Name</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Scope</th>
                <th className="py-2.5 px-3">Max Length</th>
                <th className="py-2.5 px-3">Created By</th>
                <th className="py-2.5 px-3">Effective Date</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {codeRules.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{r.name}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#060097]">v{r.version}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-600">{r.sequenceScope}</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.maxLength} chars</td>
                  <td className="py-2.5 px-3 text-slate-700">{r.createdBy}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{r.createdAt}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log for Rule Changes */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Governance Audit Trail for Rule Engine Changes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Actor</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Change Details</th>
                <th className="py-2 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No recent rule modifications recorded. Initial system seeds active.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{log.actorName}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-700 bg-slate-50">{log.action}</td>
                    <td className="py-2 px-3 text-slate-600">{log.details}</td>
                    <td className="py-2 px-3 font-bold text-emerald-700">{log.outcome}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
