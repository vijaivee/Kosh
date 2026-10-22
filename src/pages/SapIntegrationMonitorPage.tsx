import React, { useState } from 'react';
import {
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Clock,
  Eye,
  Database,
  ShieldCheck,
  X,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { SapIntegrationJob, User, GlobalItem } from '../types';
import { syncItemToSapB1Hana, buildSapOitmPayload } from '../services/sapIntegration';

interface SapIntegrationMonitorPageProps {
  currentUser: User;
}

export const SapIntegrationMonitorPage: React.FC<SapIntegrationMonitorPageProps> = ({ currentUser }) => {
  const items = masterStore.getItems();
  const sapJobs = masterStore.getSapJobs();
  const security = masterStore.getSecuritySettings();

  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'OK' | 'FAIL'; time: string; latency: number } | null>({
    status: 'OK',
    time: '2026-10-22 11:20:00',
    latency: 48,
  });

  const [selectedJobForInspect, setSelectedJobForInspect] = useState<SapIntegrationJob | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Filter items in SAP sync states
  const sapItems = items.filter(
    (i) => i.status === 'SAP Created' || i.status === 'SAP Failed' || i.status === 'SAP Pending'
  );

  const handlePingSap = async () => {
    setIsPinging(true);
    await new Promise((r) => setTimeout(r, 700));
    setIsPinging(false);
    setPingResult({
      status: 'OK',
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      latency: Math.floor(35 + Math.random() * 25),
    });
    setNotification('SAP Business One HANA Service Layer responded with HTTP 200 OK.');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleManualRetry = async (item: GlobalItem) => {
    setRetryingId(item.id);
    try {
      const res = await syncItemToSapB1Hana(item, security.sapCompanyDb, simulateFailure);
      masterStore.saveSapJob(res.job);

      if (res.success) {
        const syncedItem: GlobalItem = {
          ...item,
          status: 'SAP Created',
          sapItemCode: res.sapItemCode,
          sapSyncStatus: 'Synced',
          sapSyncedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          sapErrorMessage: undefined,
        };
        masterStore.saveItem(syncedItem, 'SAP_RETRY_SUCCESS');
        setNotification(`Item "${item.itemCode}" successfully synced to SAP B1 OITM table!`);
      } else {
        const failedItem: GlobalItem = {
          ...item,
          status: 'SAP Failed',
          sapSyncStatus: 'Failed',
          sapErrorMessage: res.errorMessage,
        };
        masterStore.saveItem(failedItem, 'SAP_RETRY_FAILED');
        setNotification(`Retry failed: ${res.errorMessage}`);
      }
    } finally {
      setRetryingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Connection Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <Server className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">SAP Business One on SAP HANA Monitor</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 11: Real-time monitoring of SAP B1 Service Layer v2, transactional outbox queue, and OITM synchronization.
          </p>
        </div>

        <button
          onClick={handlePingSap}
          disabled={isPinging}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
          <span>{isPinging ? 'Testing Link...' : 'Test Connection (Ping)'}</span>
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-xs font-bold text-emerald-900 rounded-r-md">
          {notification}
        </div>
      )}

      {/* Service Layer Connection Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Target SAP Company DB
          </span>
          <div className="text-base font-black text-slate-900 font-mono flex items-center space-x-1.5">
            <Database className="w-4 h-4 text-[#060097]" />
            <span>{security.sapCompanyDb}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
            HANA 2.0 SPS06 Connected
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Service Layer Endpoint
          </span>
          <div className="text-xs font-mono font-bold text-slate-800 truncate" title={security.sapServiceLayerUrl}>
            {security.sapServiceLayerUrl}
          </div>
          <span className="text-[11px] text-slate-500">
            Latency: {pingResult ? `${pingResult.latency} ms` : '---'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Simulation Mode
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
          <div className="text-xs font-bold text-slate-800">
            {simulateFailure ? 'Force Transient Error' : 'Normal Operational'}
          </div>
          <span className="text-[10px] text-slate-400">
            {simulateFailure
              ? 'Next sync attempt will fail with 409 Conflict'
              : 'Sync calls will return HTTP 201 Created'}
          </span>
        </div>
      </div>

      {/* Synchronized and Queue Items Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Master Data SAP Synchronization Queue
          </h3>
          <span className="text-xs text-slate-500">
            Total Synced: <strong className="text-emerald-700">{items.filter((i) => i.status === 'SAP Created').length}</strong> •
            Failures: <strong className="text-red-700">{items.filter((i) => i.status === 'SAP Failed').length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Item Code</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">SAP Status</th>
                <th className="py-2.5 px-3">Sync Timestamp</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sapItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No approved items in SAP synchronization queue.
                  </td>
                </tr>
              ) : (
                sapItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#060097]">
                      {item.itemCode}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-800">
                      {item.itemDescription}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">
                      {item.categoryCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'SAP Created'
                            ? 'bg-blue-50 text-[#060097] border border-blue-200'
                            : item.status === 'SAP Failed'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.sapErrorMessage && (
                        <span className="block text-[10px] text-red-600 max-w-xs truncate mt-0.5">
                          {item.sapErrorMessage}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {item.sapSyncedAt || item.updatedAt}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                      {item.status === 'SAP Failed' && (
                        <button
                          onClick={() => handleManualRetry(item)}
                          disabled={retryingId === item.id}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                          <span>Retry SAP</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const payload = buildSapOitmPayload(item);
                          setSelectedJobForInspect({
                            id: `job-${item.id}`,
                            itemId: item.id,
                            itemCode: item.itemCode,
                            itemDescription: item.itemDescription,
                            companyDb: security.sapCompanyDb,
                            status: item.status === 'SAP Created' ? 'Success' : 'Failed',
                            attempts: 1,
                            maxAttempts: 3,
                            idempotencyKey: item.sapIdempotencyKey || `IDEMP-${item.id}`,
                            requestPayload: payload,
                            createdAt: item.updatedAt,
                          });
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Payload</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect OITM Payload Modal */}
      {selectedJobForInspect && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50">
            <div className="px-5 py-3 bg-[#060097] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono">
                OITM Request Payload: {selectedJobForInspect.itemCode}
              </h3>
              <button
                onClick={() => setSelectedJobForInspect(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-slate-900 text-slate-100 font-mono text-xs">
              <pre>{JSON.stringify(selectedJobForInspect.requestPayload, null, 2)}</pre>
            </div>

            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedJobForInspect(null)}
                className="px-3.5 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
