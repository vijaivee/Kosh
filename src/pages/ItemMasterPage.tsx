import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Filter,
  Download,
  Eye,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  FileCode,
  Tag,
  X,
  Server,
  Layers,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { GlobalItem, ItemStatus, User } from '../types';
import { buildSapOitmPayload } from '../services/sapIntegration';

interface ItemMasterPageProps {
  currentUser: User;
  onEditItem?: (item: GlobalItem) => void;
}

export const ItemMasterPage: React.FC<ItemMasterPageProps> = ({ currentUser, onEditItem }) => {
  const items = masterStore.getItems();
  const branches = masterStore.getBranches();
  const categories = masterStore.getClassificationsByDimension('Category');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Modal inspection state
  const [selectedItemForView, setSelectedItemForView] = useState<GlobalItem | null>(null);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      const matchesSearch =
        item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.specification && item.specification.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategory === 'ALL' || item.categoryCode === selectedCategory;

      // Status filter
      const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;

      // Branch filter
      const matchesBranch =
        selectedBranch === 'ALL' ||
        item.branchAvailability?.some((ba) => ba.branchId === selectedBranch && ba.isAvailable);

      return matchesSearch && matchesCategory && matchesStatus && matchesBranch;
    });
  }, [items, searchTerm, selectedCategory, selectedStatus, selectedBranch]);

  // Export helper
  const handleExportCsv = () => {
    const headers = [
      'ItemCode',
      'ItemDescription',
      'Category',
      'Material',
      'Type',
      'Status',
      'OriginBranch',
      'SAPItemCode',
      'CreatedAt',
    ];
    const rows = filteredItems.map((i) => [
      i.itemCode,
      `"${i.itemDescription.replace(/"/g, '""')}"`,
      i.categoryCode,
      i.materialCode,
      i.typeCode,
      i.status,
      i.originBranchId,
      i.sapItemCode || '',
      i.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kosh_item_master_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'SAP Created':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#060097] border border-blue-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-[#060097]" />
            SAP Created
          </span>
        );
      case 'Approved':
      case 'SAP Pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Approved
          </span>
        );
      case 'Submitted':
      case 'Under Review':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            Pending Review
          </span>
        );
      case 'Returned for Correction':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-300">
            <RotateCcw className="w-3 h-3 mr-1 text-orange-600" />
            Returned
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Draft
          </span>
        );
      case 'SAP Failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-300">
            <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
            SAP Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header and Quick Stats */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <Database className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Global Item Master Registry</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative, organization-wide item repository synchronized with SAP Business One HANA.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search text input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Item Code, Description, Spec, or Material..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:bg-white focus:border-[#060097] outline-none"
            />
          </div>

          {/* Category Dropdown Filter */}
          <div className="w-full md:w-48">
            <select
              aria-label="Filter by Category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.code} – {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown Filter */}
          <div className="w-full md:w-44">
            <select
              aria-label="Filter by Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SAP Created">SAP Created</option>
              <option value="Approved">Approved</option>
              <option value="Submitted">Pending Review</option>
              <option value="Returned for Correction">Returned</option>
              <option value="Draft">Draft</option>
              <option value="SAP Failed">SAP Failed</option>
            </select>
          </div>

          {/* Branch Availability Filter */}
          <div className="w-full md:w-52">
            <select
              aria-label="Filter by Plant Availability"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Manufacturing Plants</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name.split('(')[0].trim()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong className="text-slate-900">{filteredItems.length}</strong> of{' '}
            <strong className="text-slate-900">{items.length}</strong> total records
          </span>
          {(searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedBranch !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSelectedBranch('ALL');
              }}
              className="text-[#060097] font-semibold hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Items Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Generated Item Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Origin Plant</th>
                <th className="py-3 px-4">Plant Availability</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm text-slate-600">No items match the selected criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing your filters or create a new item</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const originBranch = branches.find((b) => b.id === item.originBranchId);
                  const availableCount = item.branchAvailability?.filter((ba) => ba.isAvailable).length || 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Item Code */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-[#060097] text-xs">
                          {item.itemCode}
                        </span>
                        {item.isCodeProvisional && (
                          <span className="block text-[9px] text-amber-600 font-semibold">Provisional</span>
                        )}
                      </td>

                      {/* Item Description */}
                      <td className="py-3 px-4 max-w-sm">
                        <span className="font-medium text-slate-900 block leading-snug">
                          {item.itemDescription}
                        </span>
                        {item.dimensions && (
                          <span className="text-[11px] text-slate-400">Dim: {item.dimensions}</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                          {item.categoryCode}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.materialCode}/{item.typeCode}
                        </span>
                      </td>

                      {/* Origin Plant */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <span className="font-medium text-slate-800">
                          {originBranch ? originBranch.name.split('(')[0].trim() : item.originBranchId}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          by {item.createdByName || 'System'}
                        </span>
                      </td>

                      {/* Plant Availability */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 className="w-3 h-3 mr-1 text-slate-500" />
                          {availableCount} / {branches.length} Plants
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedItemForView(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-[#060097] hover:text-white text-slate-700 rounded text-xs font-semibold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Detail & Governance Modal */}
      {selectedItemForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#060097] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold font-mono tracking-wide">
                    {selectedItemForView.itemCode}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
                    {selectedItemForView.status}
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">
                  {selectedItemForView.itemDescription}
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForView(null)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Classification Grid */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2.5">
                  1. Master Classification Dimensions
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Category</span>
                    <span className="font-bold text-slate-800">{selectedItemForView.categoryCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Material</span>
                    <span className="font-bold text-slate-800">{selectedItemForView.materialCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Type</span>
                    <span className="font-bold text-slate-800">{selectedItemForView.typeCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Material Form</span>
                    <span className="font-bold text-slate-800">{selectedItemForView.formCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Process</span>
                    <span className="font-bold text-slate-800">{selectedItemForView.processCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Colour</span>
                    <span className="font-bold text-slate-800">{selectedItemForView.colourCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Manufacturer / Brand</span>
                    <span className="font-bold text-slate-800">{selectedItemForView.manufacturerCode || 'Generic'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Dimensions</span>
                    <span className="font-bold text-slate-800">{selectedItemForView.dimensions || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* SAP B1 HANA Integration Inspection */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-600" />
                    <span>2. SAP Business One HANA OITM Payload</span>
                  </span>
                  <span className="text-blue-700 font-mono text-[10px]">
                    Database: KOSH_PROD_HANA
                  </span>
                </h4>
                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-[11px] overflow-x-auto">
                  <pre>
                    {JSON.stringify(buildSapOitmPayload(selectedItemForView), null, 2)}
                  </pre>
                </div>
              </div>

              {/* Maker-Checker Audit Trail */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2.5">
                  3. Maker-Checker Approval Trail
                </h4>
                {selectedItemForView.approvalHistory && selectedItemForView.approvalHistory.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItemForView.approvalHistory.map((step) => (
                      <div
                        key={step.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-start justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800">{step.actorName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                              {step.actorRole}
                            </span>
                            <span className="font-semibold text-emerald-700">{step.action}</span>
                          </div>
                          {step.comments && (
                            <p className="text-slate-600 mt-1 italic font-sans text-xs">
                              "{step.comments}"
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                          {step.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No approval decisions recorded yet.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedItemForView(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
