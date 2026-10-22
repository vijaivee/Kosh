import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Save,
  Send,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  Info,
  Hash,
  FileText,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { User, GlobalItem, ClassificationRecord } from '../types';
import {
  generateItemCode,
  generateItemDescription,
  ItemFormValues,
} from '../services/ruleEngine';
import { getApplicableApprovalRule } from '../services/approvalHierarchy';
import { NavItemKey } from '../components/layout/Sidebar';

interface ItemCreationPageProps {
  currentUser: User;
  onNavigate: (tab: NavItemKey) => void;
  editingItem?: GlobalItem | null;
  onClearEditingItem?: () => void;
}

export const ItemCreationPage: React.FC<ItemCreationPageProps> = ({
  currentUser,
  onNavigate,
  editingItem,
  onClearEditingItem,
}) => {
  const branches = masterStore.getBranches();
  const codeRules = masterStore.getCodeRules();
  const descRules = masterStore.getDescriptionRules();
  const activeCodeRule = codeRules[0];

  // Load classification lists
  const categories = masterStore.getClassificationsByDimension('Category');
  const materials = masterStore.getClassificationsByDimension('Material');
  const types = masterStore.getClassificationsByDimension('Type');
  const forms = masterStore.getClassificationsByDimension('Material Form');
  const processes = masterStore.getClassificationsByDimension('Process');
  const colours = masterStore.getClassificationsByDimension('Colour');
  const manufacturers = masterStore.getClassificationsByDimension('Manufacturer');

  // Classification lookup map
  const classificationsMap = useMemo(() => {
    const map: Record<string, ClassificationRecord> = {};
    for (const c of masterStore.getClassifications()) {
      map[`${c.dimension}:${c.code}`] = c;
    }
    return map;
  }, []);

  // Form State
  const [originBranchId, setOriginBranchId] = useState<string>(
    editingItem?.originBranchId || currentUser.defaultBranchId || branches[0].id
  );
  const [categoryCode, setCategoryCode] = useState<string>(editingItem?.categoryCode || 'RM');
  const [materialCode, setMaterialCode] = useState<string>(editingItem?.materialCode || 'PA');
  const [typeCode, setTypeCode] = useState<string>(editingItem?.typeCode || 'O');
  const [formCode, setFormCode] = useState<string>(editingItem?.formCode || 'PO');
  const [processCode, setProcessCode] = useState<string>(editingItem?.processCode || 'EX');
  const [colourCode, setColourCode] = useState<string>(editingItem?.colourCode || 'LG');
  const [ratingSizeDimension, setRatingSizeDimension] = useState<string>(
    editingItem?.ratingSizeDimension || editingItem?.ratingSize || editingItem?.dimensions || '12MM'
  );
  const [partModelNumber, setPartModelNumber] = useState<string>(editingItem?.partModelNumber || 'B0010');
  const [customerBrand, setCustomerBrand] = useState<string>(
    editingItem?.customerBrand || editingItem?.manufacturerCode || ''
  );
  const [specification, setSpecification] = useState<string>(editingItem?.specification || 'Item Name');

  // Validation & alerts
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Category Description Rule
  const activeDescRule = useMemo(() => {
    return (
      descRules.find((r) => r.categoryCode === categoryCode) ||
      descRules.find((r) => r.categoryCode === 'FG') ||
      descRules[0]
    );
  }, [descRules, categoryCode]);

  // Current sequence number preview
  const sequenceNum = useMemo(() => {
    return masterStore.getNextSequenceNumber(categoryCode);
  }, [categoryCode]);

  // Form values bundle
  const currentFormValues: ItemFormValues = useMemo(
    () => ({
      categoryCode,
      materialCode,
      typeCode,
      formCode: formCode || undefined,
      processCode: processCode || undefined,
      colourCode: colourCode || undefined,
      customerBrand: customerBrand || undefined,
      manufacturerCode: customerBrand || undefined,
      ratingSizeDimension: ratingSizeDimension || undefined,
      dimensions: ratingSizeDimension || undefined,
      ratingSize: ratingSizeDimension || undefined,
      partModelNumber: partModelNumber || undefined,
      specification: specification || undefined,
    }),
    [
      categoryCode,
      materialCode,
      typeCode,
      formCode,
      processCode,
      colourCode,
      customerBrand,
      ratingSizeDimension,
      partModelNumber,
      specification,
    ]
  );

  // Live Item Code Generation
  const codeGenResult = useMemo(() => {
    return generateItemCode(activeCodeRule, currentFormValues, sequenceNum);
  }, [activeCodeRule, currentFormValues, sequenceNum]);

  // Live Item Description Generation
  const descGenResult = useMemo(() => {
    return generateItemDescription(activeDescRule, currentFormValues, classificationsMap);
  }, [activeDescRule, currentFormValues, classificationsMap]);

  // Real-time Duplicate Check
  useEffect(() => {
    const existing = masterStore.getItems();
    const match = existing.find(
      (item) =>
        item.id !== editingItem?.id &&
        item.categoryCode === categoryCode &&
        item.materialCode === materialCode &&
        item.typeCode === typeCode &&
        item.formCode === formCode &&
        item.processCode === processCode &&
        item.colourCode === colourCode
    );

    if (match) {
      setDuplicateWarning(
        `Notice: A similar item with code "${match.itemCode}" (${match.itemDescription}) already exists in status "${match.status}". Please ensure this new item is distinct.`
      );
    } else {
      setDuplicateWarning(null);
    }
  }, [categoryCode, materialCode, typeCode, formCode, processCode, colourCode, editingItem]);

  const handleValidate = () => {
    const errors: string[] = [];
    if (!categoryCode) errors.push('Category selection is mandatory.');
    if (!materialCode) errors.push('Material selection is mandatory.');
    if (!typeCode) errors.push('Type selection is mandatory.');
    if (!codeGenResult.isValid) errors.push(...codeGenResult.errors);
    if (!descGenResult.isValid) errors.push(...descGenResult.errors);

    setValidationErrors(errors);
    if (errors.length === 0) {
      setSuccessMessage('Item validation passed cleanly against all SAP Business One HANA constraints.');
      setTimeout(() => setSuccessMessage(null), 4000);
      return true;
    }
    return false;
  };

  const handleSaveDraft = () => {
    const newItem: GlobalItem = {
      id: editingItem?.id || `item-${Date.now()}`,
      organizationId: 'org-kosh-01',
      originBranchId,
      itemCode: codeGenResult.code || `DRAFT-${Date.now()}`,
      isCodeProvisional: true,
      itemDescription: descGenResult.description || 'Draft Item Description',
      categoryCode,
      materialCode,
      typeCode,
      formCode: formCode || undefined,
      processCode: processCode || undefined,
      colourCode: colourCode || undefined,
      customerBrand: customerBrand || undefined,
      manufacturerCode: customerBrand || undefined,
      ratingSizeDimension: ratingSizeDimension || undefined,
      dimensions: ratingSizeDimension || undefined,
      ratingSize: ratingSizeDimension || undefined,
      partModelNumber: partModelNumber || undefined,
      specification: specification || undefined,
      status: 'Draft',
      version: (editingItem?.version || 0) + 1,
      codeRuleVersionId: activeCodeRule.id,
      descriptionRuleVersionId: activeDescRule.id,
      createdBy: editingItem?.createdBy || currentUser.id,
      createdByName: editingItem?.createdByName || currentUser.displayName,
      createdByEmail: editingItem?.createdByEmail || currentUser.email,
      createdAt: editingItem?.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      approvalHistory: editingItem?.approvalHistory || [],
      branchAvailability: branches.map((b) => ({
        branchId: b.id,
        branchName: b.name.split('(')[0].trim(),
        isAvailable: b.id === originBranchId,
        inventoryStatus: b.id === originBranchId ? 'Pending Stock' : 'Inactive',
      })),
      sapSyncStatus: 'Not Synced',
    };

    masterStore.saveItem(newItem, editingItem ? 'ITEM_DRAFT_UPDATE' : 'ITEM_DRAFT_CREATE');
    setSuccessMessage(`Draft item saved successfully: ${newItem.itemCode}`);
    if (onClearEditingItem) onClearEditingItem();
    setTimeout(() => {
      onNavigate('my-requests');
    }, 1000);
  };

  const approvalRules = masterStore.getApprovalMatrixRules();
  const liveRoutingRule = useMemo(() => {
    const provisional: GlobalItem = {
      id: editingItem?.id || 'provisional',
      organizationId: 'org-kosh-01',
      originBranchId,
      itemCode: codeGenResult.code,
      isCodeProvisional: true,
      itemDescription: descGenResult.description,
      categoryCode,
      materialCode,
      typeCode,
      status: 'Submitted',
      version: 1,
      codeRuleVersionId: activeCodeRule.id,
      descriptionRuleVersionId: activeDescRule.id,
      createdBy: currentUser.id,
      createdByName: currentUser.displayName,
      createdByEmail: currentUser.email,
      createdAt: '',
      updatedAt: '',
      approvalHistory: [],
      branchAvailability: [],
      sapSyncStatus: 'Not Synced',
    };
    return getApplicableApprovalRule(provisional, currentUser, approvalRules);
  }, [editingItem, originBranchId, codeGenResult.code, descGenResult.description, categoryCode, materialCode, typeCode, activeCodeRule.id, activeDescRule.id, currentUser, approvalRules]);

  const handleSubmitForApproval = () => {
    if (!handleValidate()) return;

    const isResubmission = editingItem?.status === 'Returned for Correction';

    const historyEntry = {
      id: `app-${Date.now()}`,
      action: isResubmission ? ('Resubmitted' as const) : ('Submitted' as const),
      actorId: currentUser.id,
      actorName: currentUser.displayName,
      actorRole: currentUser.role,
      comments: isResubmission
        ? 'Resubmitted with requested revisions.'
        : `Initial submission for maker-checker review under ${liveRoutingRule.name}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      itemVersionSnapshot: (editingItem?.version || 0) + 1,
    };

    const newItem: GlobalItem = {
      id: editingItem?.id || `item-${Date.now()}`,
      organizationId: 'org-kosh-01',
      originBranchId,
      itemCode: codeGenResult.code,
      isCodeProvisional: false, // Permanently allocated upon formal submission
      itemDescription: descGenResult.description,
      categoryCode,
      materialCode,
      typeCode,
      formCode: formCode || undefined,
      processCode: processCode || undefined,
      colourCode: colourCode || undefined,
      customerBrand: customerBrand || undefined,
      manufacturerCode: customerBrand || undefined,
      ratingSizeDimension: ratingSizeDimension || undefined,
      dimensions: ratingSizeDimension || undefined,
      ratingSize: ratingSizeDimension || undefined,
      partModelNumber: partModelNumber || undefined,
      specification: specification || undefined,
      status: 'Submitted',
      version: (editingItem?.version || 0) + 1,
      codeRuleVersionId: activeCodeRule.id,
      descriptionRuleVersionId: activeDescRule.id,
      approvalRoutingRuleId: liveRoutingRule.id,
      approvalRoutingReason: liveRoutingRule.description,
      requiredApproverLevel: liveRoutingRule.requiredApproverLevel,
      createdBy: editingItem?.createdBy || currentUser.id,
      createdByName: editingItem?.createdByName || currentUser.displayName,
      createdByEmail: editingItem?.createdByEmail || currentUser.email,
      createdAt: editingItem?.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      approvalHistory: [...(editingItem?.approvalHistory || []), historyEntry],
      branchAvailability: branches.map((b) => ({
        branchId: b.id,
        branchName: b.name.split('(')[0].trim(),
        isAvailable: b.id === originBranchId,
        inventoryStatus: b.id === originBranchId ? 'Active' : 'Inactive',
      })),
      sapSyncStatus: 'Not Synced',
    };

    masterStore.saveItem(newItem, 'ITEM_SUBMIT');
    setSuccessMessage(`Item "${newItem.itemCode}" submitted for Maker-Checker approval under rule "${liveRoutingRule.name}"!`);
    if (onClearEditingItem) onClearEditingItem();
    setTimeout(() => {
      onNavigate('my-requests');
    }, 1200);
  };

  const handleReset = () => {
    setCategoryCode('RM');
    setMaterialCode('PA');
    setTypeCode('O');
    setFormCode('PO');
    setProcessCode('EX');
    setColourCode('LG');
    setCustomerBrand('');
    setRatingSizeDimension('12MM');
    setPartModelNumber('B0010');
    setSpecification('Item Name');
    setValidationErrors([]);
    setSuccessMessage(null);
    if (onClearEditingItem) onClearEditingItem();
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* Title & Origin Plant Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              {editingItem ? `Edit Item Request: ${editingItem.itemCode}` : 'Create Global Item Master Request'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardized multi-branch item classification with real-time rule engine allocation.
          </p>
        </div>

        {/* Origin Branch Selection */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
          <Building className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500 font-medium">Origin Plant:</span>
          <select
            value={originBranchId}
            onChange={(e) => setOriginBranchId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name.split('(')[0].trim()} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prominent Live Generated Preview Cards (Section 6) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Item Code Live Preview */}
        <div className="bg-white rounded-lg border-2 border-[#060097]/40 p-4.5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-[#060097]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Generated Item Code (Auto)
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                editingItem && !editingItem.isCodeProvisional
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {editingItem && !editingItem.isCodeProvisional ? 'PERMANENTLY ALLOCATED' : 'PROVISIONAL PREVIEW'}
            </span>
          </div>

          <div className="font-mono text-2xl font-black text-[#060097] tracking-wider py-1 select-all">
            {codeGenResult.code || '---'}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Pattern: {activeCodeRule.name}</span>
            <span className="font-semibold text-slate-700">
              Length: {codeGenResult.length}/20 chars (SAP Compliant)
            </span>
          </div>
        </div>

        {/* Item Description Live Preview */}
        <div className="bg-white rounded-lg border-2 border-slate-300 p-4.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Generated Item Description (Auto)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
              Template: {activeDescRule.categoryCode}
            </span>
          </div>

          <div className="text-base font-bold text-slate-900 py-1 min-h-[36px] flex items-center">
            {descGenResult.description || 'Enter specifications below to generate description...'}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate max-w-xs">{activeDescRule.patternDisplay}</span>
            <span className="font-semibold text-slate-700">
              Length: {descGenResult.length}/100 chars
            </span>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Alert */}
      {duplicateWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-md flex items-start space-x-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">
            <span className="font-bold">Duplicate Detection Alert:</span> {duplicateWarning}
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3.5 rounded-r-md flex items-start space-x-2.5">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs font-bold text-emerald-900">{successMessage}</div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center space-x-2 text-red-800 font-bold text-xs mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Please resolve the following master data validation errors:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-red-700">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Structured Form (Section 6 & 7) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs divide-y divide-slate-100">
        {/* Section A: Classification Dimensions */}
        <div className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              1. Master Classification Dimensions
            </h3>
            <p className="text-xs text-slate-500">
              Centrally governed classification dropdowns driving the Item Code & Description engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.display}
                  </option>
                ))}
              </select>
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Material <span className="text-red-500">*</span>
              </label>
              <select
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.code}>
                    {m.display}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              >
                {types.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.display}
                  </option>
                ))}
              </select>
            </div>

            {/* Material Form */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Material Form
              </label>
              <select
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              >
                <option value="">(None / Not Applicable)</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.code}>
                    {f.display}
                  </option>
                ))}
              </select>
            </div>

            {/* Process */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Process
              </label>
              <select
                value={processCode}
                onChange={(e) => setProcessCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              >
                <option value="">(None / Not Applicable)</option>
                {processes.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.display}
                  </option>
                ))}
              </select>
            </div>

            {/* Colour */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Colour
              </label>
              <select
                value={colourCode}
                onChange={(e) => setColourCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              >
                <option value="">(None / Not Applicable)</option>
                {colours.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.display}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section B: User Entered Specifications */}
        <div className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              2. Technical Specifications & Dimensions (User Input)
            </h3>
            <p className="text-xs text-slate-500">
              User-specified attributes including merged dimension/rating specs, customer/brand attribution, and drawing/part numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
            {/* Specification / Key Specification / Item Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Specification / Key Specification / Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                placeholder="e.g. Item Name, Hose Tube Assembly, Injection Moulded Core"
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Primary descriptive title incorporated into the Item Description.
              </span>
            </div>

            {/* Rating / Size / Thickness / GSM / Cavity / Capacity / Dimension (Merged) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rating / Size / Thickness-GSM / Cavity / Capacity / Dimension (e.g. 12MM, 200x80mm)
              </label>
              <input
                type="text"
                value={ratingSizeDimension}
                onChange={(e) => setRatingSizeDimension(e.target.value)}
                placeholder="e.g. 12MM, 200x80mm, 15mm ID, 8 Cavity, 120 GSM"
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Unified dimensional and sizing specification for manufacturing and procurement.
              </span>
            </div>

            {/* Customer / Manufacturer / Brand (User Input) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer / Manufacturer / Brand
              </label>
              <input
                type="text"
                value={customerBrand}
                onChange={(e) => setCustomerBrand(e.target.value)}
                placeholder="e.g. Bosch, Tata Motors, Parker, Aerosol OEM"
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Target client, proprietary OEM, or source manufacturer brand name.
              </span>
            </div>

            {/* Part / Model / Drawing Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Part / Model / Drawing Number
              </label>
              <input
                type="text"
                value={partModelNumber}
                onChange={(e) => setPartModelNumber(e.target.value)}
                placeholder="e.g. B0010, DIX001, DWG-8820"
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-[#060097] focus:ring-1 focus:ring-[#060097] outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Engineering drawing or vendor part identifier.
              </span>
            </div>
          </div>
        </div>

        {/* Section C: Rule Component Breakdown (Audit & Transparency) */}
        <div className="p-5 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Rule Engine Token Decomposition</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Sequence allocated: #{String(sequenceNum).padStart(4, '0')}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {codeGenResult.componentsBreakdown.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 px-2.5 py-1.5 rounded text-xs shadow-2xs"
              >
                <span className="text-[10px] text-slate-400 block font-semibold">{item.label}</span>
                <span className="font-mono font-bold text-[#060097]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="p-4 bg-slate-50 space-y-3">
          {/* Live Governance Routing Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/80 border border-blue-200 p-2.5 rounded-md text-xs">
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-[#060097] shrink-0" />
              <span className="text-slate-800">
                Approval Governance Pathway: <strong className="text-[#060097]">{liveRoutingRule.name}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-blue-900 border border-blue-200">
                Requires Level {liveRoutingRule.requiredApproverLevel}+ {liveRoutingRule.requiresDirectManager ? '(Reporting Line)' : ''}
              </span>
              {liveRoutingRule.requiresCategorySpecialist && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Category Specialist Gate
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Fields</span>
            </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleValidate}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Validate Rules
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitForApproval}
              className="px-5 py-2 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Maker-Checker Approval</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
