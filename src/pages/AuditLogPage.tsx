import React, { useState, useMemo } from 'react';
import { ShieldAlert, Search, Filter, Download, Database, User as UserIcon } from 'lucide-react';
import { masterStore } from '../services/storage';
import { AuditEvent, User } from '../types';

interface AuditLogPageProps {
  currentUser: User;
}

export const AuditLogPage: React.FC<AuditLogPageProps> = ({ currentUser }) => {
  const auditLogs = masterStore.getAuditLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchEntity = selectedEntity === 'ALL' || log.entityType === selectedEntity;
      const matchOutcome = selectedOutcome === 'ALL' || log.outcome === selectedOutcome;

      return matchSearch && matchEntity && matchOutcome;
    });
  }, [auditLogs, searchTerm, selectedEntity, selectedOutcome]);

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'ActorName', 'ActorRole', 'Action', 'EntityType', 'EntityId', 'Outcome', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.actorName,
      l.actorRole,
      l.action,
      l.entityType,
      l.entityId,
      l.outcome,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `kosh_audit_trail_${Date.now()}.csv`);
    dlAnchor.click();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Enterprise Audit Log Viewer</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 13: Append-only compliance log for logins, master-data revisions, code allocations, approvals, and SAP sync events.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by actor, action, details, or ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:bg-white focus:border-[#060097] outline-none"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Entity Types</option>
            <option value="Item">Item</option>
            <option value="Rule">Rule</option>
            <option value="Classification">Classification</option>
            <option value="SAP_Sync">SAP Sync</option>
            <option value="Security">Security</option>
            <option value="User">User</option>
          </select>
        </div>

        <div className="w-full sm:w-36">
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="WARNING">Warning</option>
            <option value="FAILURE">Failure</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor & Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity Type & ID</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-bold text-slate-800">{log.actorName}</span>
                    <span className="block text-[10px] text-slate-400">{log.actorRole}</span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-700">{log.entityType}</span>
                    <span className="block font-mono text-[10px] text-slate-400">{log.entityId}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-md">
                    {log.details}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
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
  );
};
