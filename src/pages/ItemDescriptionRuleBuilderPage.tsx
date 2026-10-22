import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Save,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  HelpCircle,
  Layers,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import {
  ItemDescriptionRule,
  ItemDescriptionRuleSegment,
  DescriptionSegmentField,
  User,
  ClassificationRecord,
} from '../types';
import { generateItemDescription, ItemFormValues } from '../services/ruleEngine';

interface ItemDescriptionRuleBuilderPageProps {
  currentUser: User;
}

const ALL_CATEGORY_OPTIONS = [
  { code: 'FG', name: 'Finished Goods' },
  { code: 'RM', name: 'Raw Material' },
  { code: 'SF', name: 'Semi-Finished Goods' },
  { code: 'BO', name: 'Bought Out Items' },
  { code: 'MA', name: 'Maintenance & Spares' },
  { code: 'PM', name: 'Packaging Material' },
  { code: 'CO', name: 'Consumables' },
  { code: 'MO', name: 'Mould & Tooling' },
  { code: 'ALL', name: 'Global Default (Fallback)' },
];

export const ItemDescriptionRuleBuilderPage: React.FC<ItemDescriptionRuleBuilderPageProps> = ({ currentUser }) => {
  const descRules = masterStore.getDescriptionRules();
  const [selectedCatCode, setSelectedCatCode] = useState<string>('FG');

  // Classification lookup map
  const classificationsMap = useMemo(() => {
    const map: Record<string, ClassificationRecord> = {};
    for (const c of masterStore.getClassifications()) {
      map[`${c.dimension}:${c.code}`] = c;
    }
    return map;
  }, []);

  const materials = masterStore.getClassificationsByDimension('Material');
  const forms = masterStore.getClassificationsByDimension('Material Form');
  const colours = masterStore.getClassificationsByDimension('Colour');
  const types = masterStore.getClassificationsByDimension('Type');
  const processes = masterStore.getClassificationsByDimension('Process');

  // Find or default rule for selected category
  const currentRule = useMemo(() => {
    return (
      descRules.find((r) => r.categoryCode === selectedCatCode) || {
        id: `rule-desc-${selectedCatCode.toLowerCase()}`,
        version: 1,
        categoryCode: selectedCatCode,
        categoryName: ALL_CATEGORY_OPTIONS.find((c) => c.code === selectedCatCode)?.name || selectedCatCode,
        patternDisplay: 'Material Name – Rating / Size / Dimension – Specification / Name – Colour – Form',
        segments: [
          { id: 's1', position: 1, field: 'MATERIAL_NAME' as DescriptionSegmentField, separator: ' – ', isRequired: true },
          { id: 's2', position: 2, field: 'RATING_SIZE_DIMENSION' as DescriptionSegmentField, separator: ' – ', isRequired: false },
          { id: 's3', position: 3, field: 'SPECIFICATION' as DescriptionSegmentField, separator: ' – ', isRequired: true },
          { id: 's4', position: 4, field: 'COLOUR_NAME' as DescriptionSegmentField, separator: ' – ', isRequired: false },
          { id: 's5', position: 5, field: 'FORM_NAME' as DescriptionSegmentField, separator: '', isRequired: false },
        ],
        status: 'Active' as const,
        maxLength: 100,
        createdBy: currentUser.displayName,
        createdAt: new Date().toISOString().split('T')[0],
      }
    );
  }, [descRules, selectedCatCode, currentUser]);

  const [segments, setSegments] = useState<ItemDescriptionRuleSegment[]>([...currentRule.segments]);
  const [maxLength, setMaxLength] = useState<number>(currentRule.maxLength || 100);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync segments when category changes
  const handleSelectCategory = (catCode: string) => {
    setSelectedCatCode(catCode);
    const r = descRules.find((rule) => rule.categoryCode === catCode);
    if (r) {
      setSegments([...r.segments]);
      setMaxLength(r.maxLength || 100);
    } else {
      setSegments([
        { id: 's1', position: 1, field: 'MATERIAL_NAME', separator: ' – ', isRequired: true },
        { id: 's2', position: 2, field: 'RATING_SIZE_DIMENSION', separator: ' – ', isRequired: false },
        { id: 's3', position: 3, field: 'SPECIFICATION', separator: ' – ', isRequired: true },
        { id: 's4', position: 4, field: 'COLOUR_NAME', separator: ' – ', isRequired: false },
        { id: 's5', position: 5, field: 'FORM_NAME', separator: '', isRequired: false },
      ]);
      setMaxLength(100);
    }
  };

  // Test simulation values
  const [testMaterial, setTestMaterial] = useState('PA');
  const [testSpec, setTestSpec] = useState('Corrugated Hose Assembly');
  const [testRatingDim, setTestRatingDim] = useState('12MM, 200x80mm');
  const [testColour, setTestColour] = useState('LG');
  const [testForm, setTestForm] = useState('PO');
  const [testCustomerBrand, setTestCustomerBrand] = useState('Bosch');
  const [testPartNumber, setTestPartNumber] = useState('B0010');
  const [testType, setTestType] = useState('O');
  const [testProcess, setTestProcess] = useState('EX');

  const draftRule: ItemDescriptionRule = useMemo(() => {
    return {
      ...currentRule,
      segments,
      maxLength,
    };
  }, [currentRule, segments, maxLength]);

  const simValues: ItemFormValues = useMemo(
    () => ({
      categoryCode: selectedCatCode,
      materialCode: testMaterial,
      typeCode: testType,
      formCode: testForm,
      processCode: testProcess,
      colourCode: testColour,
      ratingSizeDimension: testRatingDim,
      dimensions: testRatingDim,
      ratingSize: testRatingDim,
      specification: testSpec,
      customerBrand: testCustomerBrand,
      manufacturerCode: testCustomerBrand,
      partModelNumber: testPartNumber,
    }),
    [
      selectedCatCode,
      testMaterial,
      testType,
      testForm,
      testProcess,
      testColour,
      testRatingDim,
      testSpec,
      testCustomerBrand,
      testPartNumber,
    ]
  );

  const simResult = useMemo(() => {
    return generateItemDescription(draftRule, simValues, classificationsMap);
  }, [draftRule, simValues, classificationsMap]);

  const handleMoveSegment = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= segments.length) return;

    const copy = [...segments];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    copy.forEach((s, idx) => {
      s.position = idx + 1;
    });
    setSegments(copy);
  };

  const handleFieldChange = (index: number, field: DescriptionSegmentField) => {
    const copy = [...segments];
    copy[index].field = field;
    setSegments(copy);
  };

  const handleSeparatorChange = (index: number, sep: string) => {
    const copy = [...segments];
    copy[index].separator = sep;
    setSegments(copy);
  };

  const handleRequiredChange = (index: number, isRequired: boolean) => {
    const copy = [...segments];
    copy[index].isRequired = isRequired;
    setSegments(copy);
  };

  const handleLiteralTextChange = (index: number, text: string) => {
    const copy = [...segments];
    copy[index].literalText = text;
    setSegments(copy);
  };

  const handleAddSegment = () => {
    const newSeg: ItemDescriptionRuleSegment = {
      id: `s-${Date.now()}`,
      position: segments.length + 1,
      field: 'SPECIFICATION',
      separator: ' – ',
      isRequired: false,
    };
    setSegments([...segments, newSeg]);
  };

  const handleDeleteSegment = (index: number) => {
    if (segments.length <= 1) {
      alert('A description template must have at least one segment.');
      return;
    }
    const filtered = segments.filter((_, idx) => idx !== index);
    filtered.forEach((s, idx) => {
      s.position = idx + 1;
    });
    setSegments(filtered);
  };

  const handleResetToStandard = () => {
    const standardSegments: ItemDescriptionRuleSegment[] = [
      { id: `s-${Date.now()}-1`, position: 1, field: 'MATERIAL_NAME', separator: ' – ', isRequired: true },
      { id: `s-${Date.now()}-2`, position: 2, field: 'RATING_SIZE_DIMENSION', separator: ' – ', isRequired: false },
      { id: `s-${Date.now()}-3`, position: 3, field: 'SPECIFICATION', separator: ' – ', isRequired: true },
      { id: `s-${Date.now()}-4`, position: 4, field: 'COLOUR_NAME', separator: ' – ', isRequired: false },
      { id: `s-${Date.now()}-5`, position: 5, field: 'FORM_NAME', separator: '', isRequired: false },
    ];
    setSegments(standardSegments);
  };

  const handleSaveAsNewVersion = () => {
    const patternStr = segments.map((s) => s.field).join(' – ');
    const updatedRule: ItemDescriptionRule = {
      ...currentRule,
      version: currentRule.version + 1,
      categoryCode: selectedCatCode,
      categoryName: ALL_CATEGORY_OPTIONS.find((c) => c.code === selectedCatCode)?.name || selectedCatCode,
      patternDisplay: patternStr,
      segments,
      maxLength,
      createdBy: currentUser.displayName,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    masterStore.saveDescriptionRule(updatedRule);
    setNotification(
      `Description template for ${selectedCatCode} (${updatedRule.categoryName}) saved and activated as Version ${updatedRule.version}!`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <FileCode className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Configurable Item Description Rule Builder
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build category-based description templates incorporating Classification Masters (Material, Form, Colour, Process, Type, Category) and User Technical Specifications.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetToStandard}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Load standard pattern: Material Name – Rating/Size/Dimension – Specification/Name – Colour – Form"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard</span>
          </button>

          <button
            onClick={handleSaveAsNewVersion}
            className="px-4 py-2 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Activate Template v{currentRule.version + 1}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-xs font-bold text-emerald-900 rounded-r-md">
          {notification}
        </div>
      )}

      {/* Category Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Select Category Template:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORY_OPTIONS.map((c) => {
            const isSelected = selectedCatCode === c.code;
            const hasRule = descRules.some((r) => r.categoryCode === c.code);
            return (
              <button
                key={c.code}
                onClick={() => handleSelectCategory(c.code)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#060097] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{c.code} – {c.name}</span>
                {hasRule && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Builder & Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template Segments Builder */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-[#060097]" />
                <span>
                  Template Segments for {selectedCatCode} (
                  {ALL_CATEGORY_OPTIONS.find((c) => c.code === selectedCatCode)?.name})
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Configure sequence, tokens, and separators. Pruned automatically if optional segment is blank.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#060097] border border-blue-200">
                v{currentRule.version}
              </span>
              <button
                type="button"
                onClick={handleAddSegment}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Segment</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {segments.map((seg, idx) => (
              <div
                key={seg.id || idx}
                className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="w-5 h-5 rounded bg-[#060097] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>

                    {/* Field Selector with optgroups */}
                    <select
                      value={seg.field}
                      onChange={(e) => handleFieldChange(idx, e.target.value as DescriptionSegmentField)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-[#060097] outline-none"
                    >
                      <optgroup label="── Classification Masters (Names & Codes) ──">
                        <option value="MATERIAL_NAME">Material Name (e.g. Polyamide, HDPE)</option>
                        <option value="MATERIAL_CODE">Material Code (e.g. PA, HD)</option>
                        <option value="CATEGORY_NAME">Category Name (e.g. Raw Material, Finished Goods)</option>
                        <option value="CATEGORY_CODE">Category Code (e.g. RM, FG)</option>
                        <option value="FORM_NAME">Material Form Name (e.g. Powder, Granules, Liquid)</option>
                        <option value="FORM_CODE">Material Form Code (e.g. PO, GR)</option>
                        <option value="COLOUR_NAME">Colour Name (e.g. Light Grey, Natural White)</option>
                        <option value="COLOUR_CODE">Colour Code (e.g. LG, NW)</option>
                        <option value="PROCESS_NAME">Process Name (e.g. Extrusion, Injection)</option>
                        <option value="PROCESS_CODE">Process Code (e.g. EX, IN)</option>
                        <option value="TYPE_NAME">Type Name (e.g. Original, Generic)</option>
                        <option value="TYPE_CODE">Type Code (e.g. O, G)</option>
                      </optgroup>

                      <optgroup label="── Technical Specifications & Dimensions (User Input) ──">
                        <option value="RATING_SIZE_DIMENSION">
                          Rating / Size / Thickness-GSM / Cavity / Capacity / Dimension (e.g. 12MM, 200x80mm)
                        </option>
                        <option value="SPECIFICATION">
                          Specification / Key Specification / Item Name (e.g. Hose Tube Assembly)
                        </option>
                        <option value="CUSTOMER_BRAND">
                          Customer / Manufacturer / Brand (User Input e.g. Bosch, Tata)
                        </option>
                        <option value="PART_NUMBER">
                          Part / Model / Drawing Number (e.g. B0010, DWG-8820)
                        </option>
                        <option value="LITERAL">
                          Fixed Literal Text (Custom text string)
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Move Up / Down & Delete buttons */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveSegment(idx, 'up')}
                      className="p-1 rounded bg-white border border-slate-200 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === segments.length - 1}
                      onClick={() => handleMoveSegment(idx, 'down')}
                      className="p-1 rounded bg-white border border-slate-200 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSegment(idx)}
                      className="p-1 rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Remove Segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Literal Text input if LITERAL */}
                {seg.field === 'LITERAL' && (
                  <div className="flex items-center space-x-2 pl-7">
                    <span className="text-[10px] text-slate-500 font-semibold">Literal Value:</span>
                    <input
                      type="text"
                      value={seg.literalText || ''}
                      onChange={(e) => handleLiteralTextChange(idx, e.target.value)}
                      placeholder="e.g. STD, GRADE-A, REV-1"
                      className="w-full max-w-xs p-1 bg-white border border-slate-200 rounded font-semibold text-xs"
                    />
                  </div>
                )}

                {/* Sub-bar: Separator and Required toggle */}
                <div className="flex items-center justify-between pl-7 text-[11px] text-slate-500 pt-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seg.isRequired}
                      onChange={(e) => handleRequiredChange(idx, e.target.checked)}
                      className="rounded border-slate-300 text-[#060097] focus:ring-[#060097]"
                    />
                    <span className="font-semibold text-slate-700">
                      {seg.isRequired ? 'Mandatory Segment' : 'Optional Segment'}
                    </span>
                  </label>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-400">Separator After:</span>
                    <input
                      type="text"
                      value={seg.separator}
                      onChange={(e) => handleSeparatorChange(idx, e.target.value)}
                      placeholder="e.g.  –  "
                      className="w-20 p-1 bg-white border border-slate-300 rounded font-mono text-center text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Max Description Length:</span>
              <input
                type="number"
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value) || 100)}
                className="w-16 p-1 bg-white border border-slate-300 rounded font-bold text-center text-xs"
              />
              <span className="text-[10px] text-slate-400">characters</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Total configured segments: {segments.length}
            </span>
          </div>
        </div>

        {/* Right: Live Template Simulator */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <Play className="w-4 h-4 text-emerald-600" />
              <span>Live Description Simulator</span>
            </h3>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Instant Preview
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Material */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Classification: Material
              </label>
              <select
                value={testMaterial}
                onChange={(e) => setTestMaterial(e.target.value)}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs"
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.code}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Merged Rating / Size / Dimension */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Technical Spec: Rating / Size / Thickness-GSM / Dimension
              </label>
              <input
                type="text"
                value={testRatingDim}
                onChange={(e) => setTestRatingDim(e.target.value)}
                placeholder="e.g. 12MM, 200x80mm"
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs"
              />
            </div>

            {/* Specification / Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Technical Spec: Specification / Key Specification / Name
              </label>
              <input
                type="text"
                value={testSpec}
                onChange={(e) => setTestSpec(e.target.value)}
                placeholder="e.g. Corrugated Hose Assembly"
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Colour */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Classification: Colour
                </label>
                <select
                  value={testColour}
                  onChange={(e) => setTestColour(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs"
                >
                  <option value="">(None)</option>
                  {colours.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Material Form */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Classification: Form
                </label>
                <select
                  value={testForm}
                  onChange={(e) => setTestForm(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs"
                >
                  <option value="">(None)</option>
                  {forms.map((f) => (
                    <option key={f.id} value={f.code}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Customer / Brand */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Customer / Manufacturer / Brand
                </label>
                <input
                  type="text"
                  value={testCustomerBrand}
                  onChange={(e) => setTestCustomerBrand(e.target.value)}
                  placeholder="e.g. Bosch"
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs"
                />
              </div>

              {/* Part / Model Number */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  Part / Model / Drawing No
                </label>
                <input
                  type="text"
                  value={testPartNumber}
                  onChange={(e) => setTestPartNumber(e.target.value)}
                  placeholder="e.g. B0010"
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Generated Result Box */}
          <div className="bg-slate-50 border-2 border-[#060097]/30 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#060097] flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulated Description Output</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Rule: {selectedCatCode}
              </span>
            </div>

            <div className="text-sm font-bold text-slate-900 py-1 bg-white p-3 rounded border border-slate-200 select-all min-h-[48px] flex items-center">
              {simResult.description || '(none generated - check required fields)'}
            </div>

            {/* Tokens decomposition preview */}
            {simResult.segmentsBreakdown.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 block">
                  Resolved Segment Breakdown:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {simResult.segmentsBreakdown.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700"
                    >
                      <strong className="text-slate-900">{s.field}:</strong> {s.value || '(empty)'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              <span>
                Length: <strong className="text-slate-900">{simResult.length}</strong> / {maxLength} chars
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  simResult.isValid
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {simResult.isValid ? 'Valid Template' : 'Validation Error'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
