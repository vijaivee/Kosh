import React, { useState, useMemo } from 'react';
import {
  Code,
  ArrowUp,
  ArrowDown,
  Play,
  Save,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { ItemCodeRule, ItemCodeRuleComponent, User } from '../types';
import { generateItemCode, ItemFormValues } from '../services/ruleEngine';

interface ItemCodeRuleBuilderPageProps {
  currentUser: User;
}

export const ItemCodeRuleBuilderPage: React.FC<ItemCodeRuleBuilderPageProps> = ({ currentUser }) => {
  const codeRules = masterStore.getCodeRules();
  const [selectedRule, setSelectedRule] = useState<ItemCodeRule>(codeRules[0]);
  const [components, setComponents] = useState<ItemCodeRuleComponent[]>([...selectedRule.components]);
  const [sequenceScope, setSequenceScope] = useState<'GLOBAL' | 'CATEGORY' | 'BRANCH'>(selectedRule.sequenceScope);
  const [sequencePadding, setSequencePadding] = useState<number>(selectedRule.sequencePadding);
  const [maxLength, setMaxLength] = useState<number>(selectedRule.maxLength || 20);

  // Simulator Test Data
  const [simCategory, setSimCategory] = useState('RM');
  const [simMaterial, setSimMaterial] = useState('PA');
  const [simType, setSimType] = useState('O');
  const [simForm, setSimForm] = useState('PO');
  const [simProcess, setSimProcess] = useState('EX');
  const [simColour, setSimColour] = useState('LG');
  const [simSeq, setSimSeq] = useState(1);

  const [notification, setNotification] = useState<string | null>(null);

  // Live simulation of current modified rule draft
  const draftRule: ItemCodeRule = useMemo(() => {
    return {
      ...selectedRule,
      components,
      sequenceScope,
      sequencePadding,
      maxLength,
    };
  }, [selectedRule, components, sequenceScope, sequencePadding, maxLength]);

  const simValues: ItemFormValues = {
    categoryCode: simCategory,
    materialCode: simMaterial,
    typeCode: simType,
    formCode: simForm || undefined,
    processCode: simProcess || undefined,
    colourCode: simColour || undefined,
  };

  const simResult = useMemo(() => {
    return generateItemCode(draftRule, simValues, simSeq);
  }, [draftRule, simValues, simSeq]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= components.length) return;

    const newComps = [...components];
    const temp = newComps[index];
    newComps[index] = newComps[targetIndex];
    newComps[targetIndex] = temp;

    // Re-index positions
    newComps.forEach((c, idx) => {
      c.position = idx + 1;
    });

    setComponents(newComps);
  };

  const handleToggleRequired = (index: number) => {
    const newComps = [...components];
    newComps[index] = {
      ...newComps[index],
      isRequired: !newComps[index].isRequired,
    };
    setComponents(newComps);
  };

  const handleSaveAsNewVersion = () => {
    const updatedRule: ItemCodeRule = {
      ...selectedRule,
      version: selectedRule.version + 1,
      components,
      sequenceScope,
      sequencePadding,
      maxLength,
      createdBy: currentUser.displayName,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    masterStore.saveCodeRule(updatedRule);
    setSelectedRule(updatedRule);
    setNotification(`Rule successfully saved and activated as Version ${updatedRule.version}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <Code className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Configurable Item Code Rule Builder</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Section 20.3: Graphically configure code component sequences, padding, and constraints without redeploying code.
          </p>
        </div>

        <button
          onClick={handleSaveAsNewVersion}
          className="px-4 py-2 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Activate as Version {selectedRule.version + 1}</span>
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-xs font-bold text-emerald-900 rounded-r-md">
          {notification}
        </div>
      )}

      {/* Main Grid: Component Arranger vs Rule Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Component Order Builder */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                1. Code Structure Components Order
              </h3>
              <p className="text-[11px] text-slate-500">
                Reorder components to change how Item Codes are constructed.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#060097] border border-blue-200">
              Active v{selectedRule.version}
            </span>
          </div>

          <div className="space-y-2">
            {components.map((comp, idx) => (
              <div
                key={comp.id}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md text-xs hover:border-[#060097]/40 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded bg-[#060097] text-white flex items-center justify-center font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800">{comp.name}</span>
                    <span className="block text-[10px] font-mono text-slate-400">
                      Type: {comp.type} {comp.padding ? `(Pad: ${comp.padding})` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleRequired(idx)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      comp.isRequired
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {comp.isRequired ? 'Required' : 'Optional'}
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === components.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sequence Settings */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sequence Scope & Length Constraints
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Sequence Scope
                </label>
                <select
                  aria-label="Sequence Scope"
                  value={sequenceScope}
                  onChange={(e) => setSequenceScope(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800"
                >
                  <option value="CATEGORY">Per Category (e.g. FG0001, RM0001)</option>
                  <option value="GLOBAL">Global Enterprise Counter</option>
                  <option value="BRANCH">Per Plant Counter</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Sequence Padding
                </label>
                <input
                  type="number"
                  min={3}
                  max={6}
                  value={sequencePadding}
                  onChange={(e) => setSequencePadding(parseInt(e.target.value) || 4)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  SAP Max Code Length
                </label>
                <input
                  type="number"
                  min={10}
                  max={20}
                  value={maxLength}
                  onChange={(e) => setMaxLength(parseInt(e.target.value) || 20)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Interactive Rule Simulator & Test Runner */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-1.5">
              <Play className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                2. Live Test Simulator (Section 20.6)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              Zero Sequence Consumption
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Verify code format with sample input parameters before activation:
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500">Category Code</label>
              <input
                type="text"
                value={simCategory}
                onChange={(e) => setSimCategory(e.target.value.toUpperCase())}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500">Material Code</label>
              <input
                type="text"
                value={simMaterial}
                onChange={(e) => setSimMaterial(e.target.value.toUpperCase())}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500">Type Code</label>
              <input
                type="text"
                value={simType}
                onChange={(e) => setSimType(e.target.value.toUpperCase())}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500">Form Code</label>
              <input
                type="text"
                value={simForm}
                onChange={(e) => setSimForm(e.target.value.toUpperCase())}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500">Process Code</label>
              <input
                type="text"
                value={simProcess}
                onChange={(e) => setSimProcess(e.target.value.toUpperCase())}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500">Colour Code</label>
              <input
                type="text"
                value={simColour}
                onChange={(e) => setSimColour(e.target.value.toUpperCase())}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold uppercase"
              />
            </div>
          </div>

          {/* Simulator Output Box */}
          <div className="bg-[#060097]/5 border-2 border-[#060097]/30 rounded-lg p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#060097] block">
              Simulated Output Code
            </span>
            <div className="font-mono text-2xl font-black text-[#060097] tracking-wider py-1">
              {simResult.code || '---'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-[#060097]/15">
              <span>Length: <strong>{simResult.length}</strong> / {maxLength} chars</span>
              <span className={`font-bold ${simResult.isValid ? 'text-emerald-700' : 'text-red-700'}`}>
                {simResult.isValid ? 'Valid SAP Code' : 'Invalid Rule Format'}
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 block">Decomposition:</span>
            <div className="flex flex-wrap gap-1.5">
              {simResult.componentsBreakdown.map((b, idx) => (
                <div key={idx} className="bg-slate-100 px-2 py-1 rounded text-[10px] font-mono">
                  <span className="text-slate-400">{b.label}:</span>{' '}
                  <strong className="text-slate-800">{b.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
