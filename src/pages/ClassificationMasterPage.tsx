import React, { useState, useMemo } from 'react';
import {
  Tags,
  Search,
  Plus,
  Check,
  X,
  Edit2,
  Power,
  Layers,
  Database,
  Building,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { ClassificationRecord, User } from '../types';

interface ClassificationMasterPageProps {
  currentUser: User;
}

type DimensionType = ClassificationRecord['dimension'];

const DIMENSIONS: DimensionType[] = [
  'Category',
  'Material',
  'Type',
  'Material Form',
  'Process',
  'Colour',
  'Manufacturer',
];

export const ClassificationMasterPage: React.FC<ClassificationMasterPageProps> = ({ currentUser }) => {
  const classifications = masterStore.getClassifications();
  const [activeTab, setActiveTab] = useState<DimensionType>('Category');
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit Modal
  const [editingRecord, setEditingRecord] = useState<ClassificationRecord | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [display, setDisplay] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    return classifications.filter((c) => {
      const matchDim = c.dimension === activeTab;
      const matchSearch =
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.display.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDim && matchSearch;
    });
  }, [classifications, activeTab, searchTerm]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setCode('');
    setName('');
    setDisplay('');
    setFormError(null);
    setIsAddMode(true);
  };

  const handleOpenEdit = (rec: ClassificationRecord) => {
    setEditingRecord(rec);
    setCode(rec.code);
    setName(rec.name);
    setDisplay(rec.display);
    setFormError(null);
    setIsAddMode(true);
  };

  const handleSave = () => {
    if (!code.trim() || !name.trim()) {
      setFormError('Code and Name are mandatory.');
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanDisplay = display.trim() || `${cleanName} (${cleanCode})`;

    // Check duplicate code
    const existing = classifications.find(
      (c) =>
        c.dimension === activeTab &&
        c.code === cleanCode &&
        c.id !== editingRecord?.id
    );

    if (existing) {
      setFormError(`Code "${cleanCode}" already exists for ${activeTab}. Duplicate codes are forbidden.`);
      return;
    }

    const newRecord: ClassificationRecord = {
      id: editingRecord?.id || `cls-${Date.now()}`,
      dimension: activeTab,
      code: cleanCode,
      name: cleanName,
      display: cleanDisplay,
      isActive: editingRecord ? editingRecord.isActive : true,
      createdBy: editingRecord?.createdBy || currentUser.displayName,
      createdAt: editingRecord?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    masterStore.saveClassification(newRecord);
    setIsAddMode(false);
  };

  const handleToggleActive = (rec: ClassificationRecord) => {
    const updated: ClassificationRecord = {
      ...rec,
      isActive: !rec.isActive,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    masterStore.saveClassification(updated);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <Tags className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Classification Masters</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Database-backed master dimensions governing Item Code components and description formatting.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add {activeTab} Value</span>
        </button>
      </div>

      {/* Dimension Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 p-1.5 shadow-xs flex flex-wrap gap-1">
        {DIMENSIONS.map((dim) => {
          const count = classifications.filter((c) => c.dimension === dim).length;
          const isActive = activeTab === dim;
          return (
            <button
              key={dim}
              onClick={() => {
                setActiveTab(dim);
                setSearchTerm('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-[#060097] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{dim}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab} by code, title, or display...`}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-800 focus:bg-white focus:border-[#060097] outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Name / Title</th>
                <th className="py-2.5 px-4">Dropdown Display</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#060097]">
                    {rec.code}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">
                    {rec.name}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {rec.display}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {rec.isActive ? 'Active' : 'Inactive (Archived)'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => handleOpenEdit(rec)}
                      className="p-1 text-slate-600 hover:text-[#060097] rounded hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(rec)}
                      className={`p-1 rounded transition-colors ${
                        rec.isActive
                          ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={rec.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRecord ? `Edit ${activeTab}: ${editingRecord.code}` : `Add New ${activeTab} Dimension Value`}
              </h3>
              <button onClick={() => setIsAddMode(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-semibold">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Code (e.g. PP, BK, IM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FG"
                  className="w-full uppercase font-mono p-2 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-900 focus:bg-white focus:border-[#060097] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Finished Goods"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#060097] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dropdown Display Format
                </label>
                <input
                  type="text"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  placeholder="e.g. Finished Goods (FG)"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-900 focus:bg-white focus:border-[#060097] outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Leave blank to auto-format as "Name (Code)".
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsAddMode(false)}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-[#060097] hover:bg-[#04006e] text-white rounded text-xs font-bold transition-colors"
              >
                Save Classification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
