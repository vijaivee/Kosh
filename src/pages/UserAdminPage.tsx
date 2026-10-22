import React, { useState } from 'react';
import {
  Users,
  Shield,
  Check,
  X,
  ShieldAlert,
  Key,
  UserCheck,
  GitBranch,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  Building,
  Award,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { User, ApprovalMatrixRule, HierarchyLevel, ClassificationRecord } from '../types';
import { ROLE_PERMISSIONS } from '../services/authAndRbac';

interface UserAdminPageProps {
  currentUser: User;
}

export const UserAdminPage: React.FC<UserAdminPageProps> = ({ currentUser }) => {
  const users = masterStore.getUsers();
  const branches = masterStore.getBranches();
  const categories = masterStore.getClassificationsByDimension('Category');
  const approvalRules = masterStore.getApprovalMatrixRules();

  const [activeTab, setActiveTab] = useState<'users' | 'hierarchy' | 'rules'>('users');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');

  // Modal states for Editing User Hierarchy
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formHierarchyLevel, setFormHierarchyLevel] = useState<HierarchyLevel>(1);
  const [formDesignation, setFormDesignation] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formManagerId, setFormManagerId] = useState<string>('');
  const [formAuthorizedCategories, setFormAuthorizedCategories] = useState<string[]>([]);

  // Modal state for Approval Matrix Rules
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalMatrixRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleBranchId, setRuleBranchId] = useState('ALL');
  const [ruleCategoryCode, setRuleCategoryCode] = useState('ALL');
  const [ruleRequiredLevel, setRuleRequiredLevel] = useState<HierarchyLevel>(2);
  const [ruleRequiresDirectManager, setRuleRequiresDirectManager] = useState(true);
  const [ruleRequiresCategorySpecialist, setRuleRequiresCategorySpecialist] = useState(false);
  const [ruleDescription, setRuleDescription] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setFormHierarchyLevel(user.hierarchyLevel || 1);
    setFormDesignation(user.designation || '');
    setFormDepartment(user.department || '');
    setFormManagerId(user.managerId || '');
    setFormAuthorizedCategories(user.authorizedCategoryCodes || ['*']);
  };

  const handleSaveUserHierarchy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    masterStore.updateUser(editingUser.id, {
      hierarchyLevel: formHierarchyLevel,
      designation: formDesignation.trim(),
      department: formDepartment.trim(),
      managerId: formManagerId ? formManagerId : undefined,
      authorizedCategoryCodes: formAuthorizedCategories,
    });

    setNotification(`Successfully updated hierarchy profile for ${editingUser.displayName}!`);
    setEditingUser(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const openNewRule = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleBranchId('ALL');
    setRuleCategoryCode('ALL');
    setRuleRequiredLevel(2);
    setRuleRequiresDirectManager(true);
    setRuleRequiresCategorySpecialist(false);
    setRuleDescription('');
    setIsRuleModalOpen(true);
  };

  const openEditRule = (rule: ApprovalMatrixRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleBranchId(rule.branchId);
    setRuleCategoryCode(rule.categoryCode);
    setRuleRequiredLevel(rule.requiredApproverLevel);
    setRuleRequiresDirectManager(rule.requiresDirectManager);
    setRuleRequiresCategorySpecialist(rule.requiresCategorySpecialist || false);
    setRuleDescription(rule.description);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const rule: ApprovalMatrixRule = {
      id: editingRule ? editingRule.id : `rule-mat-${Date.now()}`,
      name: ruleName.trim(),
      branchId: ruleBranchId,
      categoryCode: ruleCategoryCode,
      requiredApproverLevel: ruleRequiredLevel,
      requiresDirectManager: ruleRequiresDirectManager,
      requiresCategorySpecialist: ruleRequiresCategorySpecialist,
      description: ruleDescription.trim() || `Approval requirement for ${ruleCategoryCode} items.`,
      isActive: editingRule ? editingRule.isActive : true,
      priority: ruleCategoryCode !== 'ALL' ? 80 : 10,
    };

    masterStore.saveApprovalMatrixRule(rule);
    setNotification(`Saved approval governance rule "${rule.name}"!`);
    setIsRuleModalOpen(false);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleRule = (rule: ApprovalMatrixRule) => {
    masterStore.saveApprovalMatrixRule({
      ...rule,
      isActive: !rule.isActive,
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this approval matrix rule?')) {
      masterStore.deleteApprovalMatrixRule(ruleId);
      setNotification('Approval matrix rule deleted.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const getLevelBadge = (level?: HierarchyLevel) => {
    switch (level) {
      case 4:
        return <span className="whitespace-nowrap inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Level 4: Corporate Exec</span>;
      case 3:
        return <span className="whitespace-nowrap inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Level 3: Plant Manager</span>;
      case 2:
        return <span className="whitespace-nowrap inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Level 2: Shift Lead</span>;
      case 1:
      default:
        return <span className="whitespace-nowrap inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Level 1: Maker / Engineer</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <Users className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">User & Plant Hierarchy Governance</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 4 & 5: Employee hierarchy by Plant/Branch, reporting lines (Maker ➔ Supervisor ➔ Plant Head), and Category-based approval matrix rules.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'users'
                ? 'bg-white text-[#060097] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts & RBAC</span>
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'hierarchy'
                ? 'bg-white text-[#060097] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Plant Hierarchy Tree</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'rules'
                ? 'bg-white text-[#060097] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Approval Matrix Rules</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3.5 rounded-r-md text-xs font-bold text-emerald-900 animate-in fade-in-50">
          {notification}
        </div>
      )}

      {/* TAB 1: USERS & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Authorized System Users & Employee Hierarchy</h3>
                <p className="text-[11px] text-slate-400">
                  Every user has a designated Hierarchy Seniority Level (L1 to L4) and direct reporting manager line for Maker-Checker workflows.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">{users.length} Active Accounts</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Employee Details</th>
                    <th className="py-3 px-4">Hierarchy & Designation</th>
                    <th className="py-3 px-4">Reporting Manager</th>
                    <th className="py-3 px-4">Plant & Category Authority</th>
                    <th className="py-3 px-4">2FA & Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isCurrent = u.id === currentUser.id;
                    const manager = users.find((m) => m.id === u.managerId);
                    return (
                      <tr key={u.id} className={`hover:bg-slate-50/70 transition-colors ${isCurrent ? 'bg-blue-50/40' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#060097] text-white flex items-center justify-center font-bold text-[11px]">
                              {u.displayName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{u.displayName}</span>
                              <span className="text-slate-500 text-[11px]">{u.email}</span>
                              <span className="text-slate-400 text-[10px] font-mono">{u.employeeId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 space-y-1">
                          <div>{getLevelBadge(u.hierarchyLevel)}</div>
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {u.designation || u.role}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {u.department || 'Manufacturing Ops'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {manager ? (
                            <div className="flex items-center space-x-1 text-slate-700">
                              <span className="w-4 h-4 rounded-full bg-blue-100 text-[#060097] text-[9px] flex items-center justify-center font-bold">
                                L{manager.hierarchyLevel || 2}
                              </span>
                              <span className="font-semibold">{manager.displayName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Executive / Top Level</span>
                          )}
                        </td>
                        <td className="py-3 px-4 space-y-1">
                          <span className="font-semibold text-slate-700 block">
                            {u.assignedBranchIds.length === branches.length
                              ? 'Global (All 5 Plants)'
                              : `${u.assignedBranchIds.length} Plants`}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {u.authorizedCategoryCodes && u.authorizedCategoryCodes.length > 0 ? (
                              u.authorizedCategoryCodes.map((cat) => (
                                <span
                                  key={cat}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                                >
                                  {cat === '*' ? 'All Categories' : cat}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400">Maker Scoped</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.isTwoFactorEnabled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {u.isTwoFactorEnabled ? '2FA Active' : 'Standard'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => openEditUser(u)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-[#060097] bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer inline-flex items-center space-x-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Hierarchy</span>
                          </button>
                          {isCurrent ? (
                            <span className="px-2 py-1 text-[11px] font-bold text-[#060097] bg-white border border-[#060097]/30 rounded">
                              Current
                            </span>
                          ) : (
                            <button
                              onClick={() => masterStore.setCurrentUser(u.id)}
                              className="px-2 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                            >
                              Simulate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Capability Preview */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Enterprise RBAC Capability Matrix</h3>
            <p className="text-xs text-slate-500">
              Granular capabilities enforced in server and client services.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                <div key={role} className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                  <span className="font-bold text-xs text-slate-900 block">{role}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {perms.length} Granular Capabilities:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {perms.slice(0, 4).map((p) => (
                      <span key={p} className="px-1 py-0.2 rounded text-[9px] bg-white border border-slate-200 font-mono text-slate-600">
                        {p}
                      </span>
                    ))}
                    {perms.length > 4 && (
                      <span className="text-[9px] text-slate-400 font-medium">+{perms.length - 4} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLANT EMPLOYEE HIERARCHY TREE */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Plant Management Employee Hierarchy</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Organizational reporting structure per manufacturing branch. Approvals route upward from Maker to Section Lead and Plant Manager.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600">Filter Plant:</label>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
              >
                <option value="ALL">All Kosh Plants & Facilities</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name.split('(')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Plant Hierarchy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {branches
              .filter((b) => selectedBranchFilter === 'ALL' || b.id === selectedBranchFilter)
              .map((branch) => {
                const branchUsers = users.filter((u) => u.assignedBranchIds.includes(branch.id));
                const level4Users = branchUsers.filter((u) => (u.hierarchyLevel || 1) === 4);
                const level3Users = branchUsers.filter((u) => (u.hierarchyLevel || 1) === 3);
                const level2Users = branchUsers.filter((u) => (u.hierarchyLevel || 1) === 2);
                const level1Users = branchUsers.filter((u) => (u.hierarchyLevel || 1) === 1);

                return (
                  <div
                    key={branch.id}
                    className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs bg-[#060097] text-white px-2 py-0.5 rounded">
                            {branch.code}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{branch.name}</h4>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {branch.location} • {branchUsers.length} assigned personnel
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Active Plant
                      </span>
                    </div>

                    {/* Tier 3: Plant Operations Head / Manager */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                        <Award className="w-3.5 h-3.5 text-blue-700" />
                        <span>Level 3: Plant Management & Quality Gate</span>
                      </div>
                      {level3Users.length > 0 ? (
                        level3Users.map((u) => (
                          <div
                            key={u.id}
                            className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-md flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-[10px]">
                                L3
                              </div>
                              <div>
                                <span className="font-bold text-xs text-blue-950 block">{u.displayName}</span>
                                <span className="text-[10px] text-blue-700">{u.designation || 'Plant Quality Head'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => openEditUser(u)}
                              className="text-[11px] font-semibold text-blue-800 hover:underline cursor-pointer"
                            >
                              Edit Line
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded">
                          Covered by Corporate Executive Escalation
                        </p>
                      )}
                    </div>

                    {/* Tier 2: Shift / Section Supervisors */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                        <GitBranch className="w-3.5 h-3.5 text-amber-700" />
                        <span>Level 2: Section & Shift Supervisors (Checkers)</span>
                      </div>
                      {level2Users.length > 0 ? (
                        level2Users.map((u) => {
                          const reportsTo = users.find((m) => m.id === u.managerId);
                          return (
                            <div
                              key={u.id}
                              className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-md flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-bold text-[10px]">
                                  L2
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-amber-950 block">{u.displayName}</span>
                                  <span className="text-[10px] text-amber-700">
                                    {u.designation || 'Shift Supervisor'} • Reports to:{' '}
                                    <strong>{reportsTo?.displayName || 'Plant Head'}</strong>
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => openEditUser(u)}
                                className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
                              >
                                Edit Line
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded">
                          No Level 2 supervisors configured for this plant
                        </p>
                      )}
                    </div>

                    {/* Tier 1: Makers / Item Creators */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                        <Users className="w-3.5 h-3.5 text-slate-600" />
                        <span>Level 1: Makers & Item Creators (Originators)</span>
                      </div>
                      {level1Users.length > 0 ? (
                        level1Users.map((u) => {
                          const reportsTo = users.find((m) => m.id === u.managerId);
                          return (
                            <div
                              key={u.id}
                              className="bg-slate-50 border border-slate-200 p-2.5 rounded-md flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold text-[10px]">
                                  L1
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-slate-900 block">{u.displayName}</span>
                                  <span className="text-[10px] text-slate-500">
                                    {u.designation || 'Tooling Engineer'} • Reports to:{' '}
                                    <strong className="text-slate-700">{reportsTo?.displayName || 'Unassigned'}</strong>
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => openEditUser(u)}
                                className="text-[11px] font-semibold text-slate-700 hover:underline cursor-pointer"
                              >
                                Edit Line
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded">
                          No Level 1 makers configured
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: APPROVAL MATRIX & GOVERNANCE RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Category & Classification Approval Matrix</h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure approval authority gates based on Item Category (e.g., Finished Goods FG, Raw Materials RM, Machinery Spares MA), Branch/Plant scope, and required employee hierarchy level.
              </p>
            </div>
            <button
              onClick={openNewRule}
              className="px-3.5 py-2 bg-[#060097] hover:bg-[#04006e] text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Approval Matrix Rule</span>
            </button>
          </div>

          {/* Matrix Rules Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Rule Name & Classification Gate</th>
                    <th className="py-3 px-4">Target Category</th>
                    <th className="py-3 px-4">Plant Scope</th>
                    <th className="py-3 px-4">Required Seniority Level</th>
                    <th className="py-3 px-4">Governance Criteria</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvalRules.map((rule) => {
                    const branch = branches.find((b) => b.id === rule.branchId);
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block text-xs">{rule.name}</span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">{rule.description}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              rule.categoryCode === 'ALL'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-[#060097]/10 text-[#060097] border border-[#060097]/20'
                            }`}
                          >
                            {rule.categoryCode === 'ALL' ? 'ALL Categories' : `Category: ${rule.categoryCode}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-700">
                            {rule.branchId === 'ALL' ? 'Enterprise-Wide (All Plants)' : branch?.name.split('(')[0] || rule.branchId}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getLevelBadge(rule.requiredApproverLevel)}
                        </td>
                        <td className="py-3 px-4 space-y-1">
                          {rule.requiresDirectManager && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 mr-1">
                              ✓ Direct Reporting Manager
                            </span>
                          )}
                          {rule.requiresCategorySpecialist && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              ✓ Category Specialist Certified
                            </span>
                          )}
                          {!rule.requiresDirectManager && !rule.requiresCategorySpecialist && (
                            <span className="text-[10px] text-slate-400">Level-based Seniority Gate</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleRule(rule)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              rule.isActive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {rule.isActive ? 'Active Gate' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => openEditRule(rule)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-[#060097] cursor-pointer"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Hierarchy Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-[#060097]" />
                <span>Configure Employee Hierarchy: {editingUser.displayName}</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserHierarchy} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hierarchy Seniority Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={formHierarchyLevel}
                  onChange={(e) => setFormHierarchyLevel(Number(e.target.value) as HierarchyLevel)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800 focus:bg-white focus:border-[#060097] outline-none"
                >
                  <option value={1}>Level 1: Maker / Tooling Engineer / Plant Data Clerk</option>
                  <option value={2}>Level 2: Shift Production Supervisor / Section Lead (Checker)</option>
                  <option value={3}>Level 3: Plant Operations Head / Quality General Manager</option>
                  <option value={4}>Level 4: Corporate Master Data Head / VP Operations / Org Admin</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Higher levels inherit approval escalation authority for subordinate requests.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Designation</label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="e.g. Senior Tooling Engineer"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800 focus:bg-white focus:border-[#060097] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plant Department</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="e.g. Injection Moulding Design"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800 focus:bg-white focus:border-[#060097] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Direct Reporting Manager (Superior in Hierarchy)
                </label>
                <select
                  value={formManagerId}
                  onChange={(e) => setFormManagerId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800 focus:bg-white focus:border-[#060097] outline-none"
                >
                  <option value="">None (Top Level Executive / Independent)</option>
                  {users
                    .filter((u) => u.id !== editingUser.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} (Level {u.hierarchyLevel || 1} • {u.designation || u.role})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Standard items created by this employee route to this reporting manager for Level 2 verification.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Authorized Item Categories for Approval
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded max-h-32 overflow-y-auto">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formAuthorizedCategories.includes('*')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormAuthorizedCategories(['*']);
                        } else {
                          setFormAuthorizedCategories([]);
                        }
                      }}
                      className="rounded text-[#060097]"
                    />
                    <span>* All Categories (Universal Sign-Off)</span>
                  </label>
                  {categories.map((cat) => {
                    const isChecked = formAuthorizedCategories.includes(cat.code) || formAuthorizedCategories.includes('*');
                    return (
                      <label key={cat.code} className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-700">
                        <input
                          type="checkbox"
                          disabled={formAuthorizedCategories.includes('*')}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAuthorizedCategories([...formAuthorizedCategories, cat.code]);
                            } else {
                              setFormAuthorizedCategories(formAuthorizedCategories.filter((c) => c !== cat.code));
                            }
                          }}
                          className="rounded text-[#060097]"
                        />
                        <span>{cat.code} ({cat.name})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#060097] hover:bg-[#04006e] text-white rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Hierarchy Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Approval Matrix Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#060097]" />
                <span>{editingRule ? 'Edit Approval Matrix Rule' : 'New Category & Plant Approval Gate'}</span>
              </h3>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rule Name / Policy Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Finished Goods Executive Gate"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800 focus:bg-white focus:border-[#060097] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Item Category Scope</label>
                  <select
                    value={ruleCategoryCode}
                    onChange={(e) => setRuleCategoryCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
                  >
                    <option value="ALL">ALL Categories (Default)</option>
                    {categories.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} – {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plant / Branch Scope</label>
                  <select
                    value={ruleBranchId}
                    onChange={(e) => setRuleBranchId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
                  >
                    <option value="ALL">All Kosh Plants</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} – {b.name.split('(')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Minimum Required Approver Seniority Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={ruleRequiredLevel}
                  onChange={(e) => setRuleRequiredLevel(Number(e.target.value) as HierarchyLevel)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
                >
                  <option value={2}>Level 2: Shift Lead / Production Supervisor</option>
                  <option value={3}>Level 3: Plant Operations Head / Quality General Manager</option>
                  <option value={4}>Level 4: Corporate Master Data Head / VP</option>
                </select>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 rounded border border-slate-200">
                <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={ruleRequiresDirectManager}
                    onChange={(e) => setRuleRequiresDirectManager(e.target.checked)}
                    className="rounded text-[#060097]"
                  />
                  <span>Enforce Maker Employee Reporting Line (Direct Manager Check)</span>
                </label>
                <p className="text-[10px] text-slate-500 pl-5">
                  Approver must be in the direct upward reporting chain of the submitting maker or hold Plant Head escalation authority.
                </p>

                <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-800 pt-1">
                  <input
                    type="checkbox"
                    checked={ruleRequiresCategorySpecialist}
                    onChange={(e) => setRuleRequiresCategorySpecialist(e.target.checked)}
                    className="rounded text-[#060097]"
                  />
                  <span>Require Certified Category Specialist Authorization</span>
                </label>
                <p className="text-[10px] text-slate-500 pl-5">
                  Approver must have this specific item category explicitly listed in their authorized category portfolio.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Governance Policy Description</label>
                <textarea
                  rows={2}
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Explain why this level of approval is required (e.g., IATF 16949 audit compliance)..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800 focus:bg-white focus:border-[#060097] outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#060097] hover:bg-[#04006e] text-white rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Approval Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
