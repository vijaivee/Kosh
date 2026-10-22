import React, { useState } from 'react';
import { GitBranch, Building2, Check, X, ShieldAlert, Search } from 'lucide-react';
import { masterStore } from '../services/storage';
import { User, GlobalItem } from '../types';

interface BranchAvailabilityPageProps {
  currentUser: User;
}

export const BranchAvailabilityPage: React.FC<BranchAvailabilityPageProps> = ({ currentUser }) => {
  const items = masterStore.getItems();
  const branches = masterStore.getBranches();
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const filteredItems = items.filter(
    (i) =>
      i.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.itemDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleBranch = (item: GlobalItem, branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    const existing = item.branchAvailability || [];
    const entry = existing.find((ba) => ba.branchId === branchId);

    let updatedAvailability;
    let newStatus = true;

    if (entry) {
      newStatus = !entry.isAvailable;
      updatedAvailability = existing.map((ba) =>
        ba.branchId === branchId
          ? {
              ...ba,
              isAvailable: newStatus,
              inventoryStatus: newStatus ? ('Active' as const) : ('Inactive' as const),
              activatedAt: newStatus ? new Date().toISOString().split('T')[0] : ba.activatedAt,
              activatedBy: newStatus ? currentUser.displayName : ba.activatedBy,
            }
          : ba
      );
    } else {
      updatedAvailability = [
        ...existing,
        {
          branchId,
          branchName: branch ? branch.name.split('(')[0].trim() : branchId,
          isAvailable: true,
          inventoryStatus: 'Active' as const,
          activatedAt: new Date().toISOString().split('T')[0],
          activatedBy: currentUser.displayName,
        },
      ];
    }

    const updatedItem: GlobalItem = {
      ...item,
      branchAvailability: updatedAvailability,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    masterStore.saveItem(updatedItem, 'BRANCH_AVAILABILITY_CHANGE');
    setNotification(
      `Item ${item.itemCode} is now ${newStatus ? 'ENABLED' : 'DISABLED'} for ${branch?.name.split('(')[0]}.`
    );
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <GitBranch className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Branch Item Availability Matrix</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 3: Decouple global item identity from plant availability. Control which manufacturing plants are authorized to stock, produce, or procure each item.
          </p>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-xs font-bold text-emerald-900 rounded-r-md">
          {notification}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by code or description..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:bg-white focus:border-[#060097] outline-none"
          />
        </div>
      </div>

      {/* Availability Matrix Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Global Item</th>
                <th className="py-3 px-3">Category</th>
                {branches.map((b) => (
                  <th key={b.id} className="py-3 px-3 text-center whitespace-nowrap">
                    <span className="block text-slate-900 font-bold">{b.code}</span>
                    <span className="text-[9px] text-slate-400 normal-case font-medium">
                      {b.name.split('(')[0].trim().replace('Plant ', 'P')}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[#060097] block">
                      {item.itemCode}
                    </span>
                    <span className="text-slate-600 line-clamp-1">{item.itemDescription}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                      {item.categoryCode}
                    </span>
                  </td>
                  {branches.map((b) => {
                    const isAvailable =
                      item.branchAvailability?.some((ba) => ba.branchId === b.id && ba.isAvailable) ??
                      false;

                    return (
                      <td key={b.id} className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleBranch(item, b.id)}
                          className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition-all cursor-pointer ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={`${isAvailable ? 'Enabled' : 'Disabled'} for ${b.name}`}
                        >
                          {isAvailable ? <Check className="w-4 h-4 font-bold" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
