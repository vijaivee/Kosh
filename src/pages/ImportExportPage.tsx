import React, { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Database,
  ArrowRight,
  Filter,
  RefreshCw,
  Building,
  Check,
  Send,
  Save,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { masterStore } from '../services/storage';
import { User, GlobalItem } from '../types';
import {
  parseCsvToItemRows,
  validateBulkItemRows,
  createGlobalItemsFromBulkRows,
  BulkValidationSummary,
} from '../services/bulkImport';

interface ImportExportPageProps {
  currentUser: User;
  onNavigate?: (tab: any) => void;
}

export const ImportExportPage: React.FC<ImportExportPageProps> = ({ currentUser, onNavigate }) => {
  const items = masterStore.getItems();
  const branches = masterStore.getBranches();
  const codeRules = masterStore.getCodeRules();
  const descRules = masterStore.getDescriptionRules();
  const classifications = masterStore.getClassifications();
  const activeCodeRule = codeRules[0];

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode and text state
  const [importMode, setImportMode] = useState<'upload' | 'text'>('upload');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);

  // Validation report state
  const [validationSummary, setValidationSummary] = useState<BulkValidationSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'error'>('all');

  // Finalization options
  const [targetStatus, setTargetStatus] = useState<'Draft' | 'Submitted'>('Submitted');
  const [defaultBranchId, setDefaultBranchId] = useState<string>(
    currentUser.defaultBranchId || branches[0].id
  );
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccessMessage, setCommitSuccessMessage] = useState<string | null>(null);

  // CSV Template generator
  const handleDownloadCsvTemplate = () => {
    const headers = [
      'Category',
      'Material',
      'Type',
      'MaterialForm',
      'Process',
      'Colour',
      'Manufacturer',
      'Specification',
      'Dimensions',
      'PartModelNumber',
      'RatingSize',
      'TargetBranch',
    ];

    const sampleRows = [
      ['FG', 'HD', 'M', '', 'CR', 'GY', 'AF', 'Corrugated Hose Assembly 25mm', '25mm x 1.5m', 'DIX001', 'Heavy Duty', 'PLANT-1'],
      ['RM', 'PP', 'O', 'PL', '', 'NT', 'AA', 'Natural Polypropylene Pellets', '', '', 'Prime Grade', 'PLANT-1'],
      ['SF', 'SS', 'A', 'SH', 'SB', '', '', 'Sheet Metal Bracket Sub-Assembly', '200x50mm', 'BR-200', '', 'PLANT-2'],
      ['BO', 'BR', 'O', '', '', '', 'AC', 'Brass Bushing Sleeve', '15mm ID', 'BB-4420', 'Tolerance ±0.05', 'PLANT-4'],
      ['MA', 'PA', 'L', '', '', 'BL', '', 'Injection Moulding Core Pin', '5mm Dia', 'CP-5', '', 'PLANT-1'],
    ];

    const csvText = [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'kosh_bulk_item_creation_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sample batch loader
  const handleLoadSampleBatch = () => {
    const sampleCsv = `Category,Material,Type,MaterialForm,Process,Colour,Manufacturer,Specification,Dimensions,PartModelNumber,RatingSize,TargetBranch
FG,HD,M,,CR,GY,AF,"Corrugated Hose Assembly",25mm x 1.5m,DIX001,Heavy Duty,PLANT-1
RM,PP,O,PL,,NT,AA,"Polypropylene Homopolymer Pellets",,,Prime Grade,PLANT-1
SF,SS,A,SH,SB,,,Sheet Metal Mounting Bracket,200x50mm,BR-200,,PLANT-2
BO,BR,O,,,AC,"Brass Bushing Component",15mm ID,BB-4420,Tolerance ±0.05,PLANT-4
MA,PA,L,,,BL,,"Moulding Core Pin Spares",5mm Dia,CP-5,,PLANT-1
FG,INVALID_CODE,M,,CR,GY,AF,"Item with Bad Material Code",10mm,,,PLANT-1`;

    setCsvContent(sampleCsv);
    setFileName('kosh_sample_manufacturing_batch.csv');
    runValidation(sampleCsv);
  };

  // Handle file select
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      runValidation(text);
    };
    reader.readAsText(file);
  };

  // Run validation using rule engine
  const runValidation = (text: string) => {
    setCommitSuccessMessage(null);
    const { rows, parseErrors } = parseCsvToItemRows(text);

    if (parseErrors.length > 0 && rows.length === 0) {
      setValidationSummary({
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        duplicateWarningRows: 0,
        rows: [],
      });
      return;
    }

    const startSeq = masterStore.getItems().length + 1;
    const summary = validateBulkItemRows(
      rows,
      items,
      activeCodeRule,
      descRules,
      classifications,
      branches,
      startSeq
    );

    setValidationSummary(summary);
  };

  // Commit valid items
  const handleCommitImport = async () => {
    if (!validationSummary || validationSummary.validRows === 0) return;

    setIsCommitting(true);
    try {
      // Simulate rapid batch processing with visual feedback
      await new Promise((r) => setTimeout(r, 600));

      const newItems = createGlobalItemsFromBulkRows(
        validationSummary.rows,
        currentUser,
        branches,
        defaultBranchId,
        targetStatus,
        activeCodeRule.id,
        descRules[0].id
      );

      newItems.forEach((item) => {
        masterStore.saveItem(
          item,
          targetStatus === 'Submitted' ? 'BULK_ITEM_SUBMITTED' : 'BULK_ITEM_DRAFT'
        );
      });

      masterStore.addAuditLog({
        action: 'BULK_CSV_IMPORT_COMMITTED',
        entityType: 'Item',
        entityId: `batch-${Date.now()}`,
        outcome: 'SUCCESS',
        details: `Created ${newItems.length} items from CSV (${targetStatus} status) evaluated against Rule Engine v${activeCodeRule.version}.`,
      });

      setCommitSuccessMessage(
        `Successfully imported ${newItems.length} items into the system with status "${targetStatus}"! All items are compliant with active Rule Engine v${activeCodeRule.version}.`
      );

      // Clear pending table
      setValidationSummary(null);
      setCsvContent('');
      setFileName(null);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleExportFullJson = () => {
    const fullData = {
      exportedAt: new Date().toISOString(),
      organization: 'Kosh Innovations Pvt Ltd',
      itemMasterCount: items.length,
      items,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `kosh_global_item_master_full_${Date.now()}.json`);
    dlAnchor.click();
  };

  const filteredPreviewRows = useMemo(() => {
    if (!validationSummary) return [];
    if (previewFilter === 'valid') return validationSummary.rows.filter((r) => r.isValid);
    if (previewFilter === 'error') return validationSummary.rows.filter((r) => !r.isValid);
    return validationSummary.rows;
  }, [validationSummary, previewFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-[#060097] text-white rounded-md">
              <UploadCloud className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Bulk Item Creation via CSV Upload
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Batch item onboarding with live validation against Item Code rules, description templates, and duplicate detection.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <a
            href="/kosh-global-item-creation-system.zip"
            download="kosh-global-item-creation-system.zip"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Source Code (.ZIP)</span>
          </a>
          <button
            onClick={handleDownloadCsvTemplate}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Template</span>
          </button>
          <button
            onClick={handleExportFullJson}
            className="px-4 py-2 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Registry (JSON)</span>
          </button>
        </div>
      </div>

      {commitSuccessMessage && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-md text-xs font-bold text-emerald-900 flex items-center justify-between animate-in fade-in-50">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{commitSuccessMessage}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate(targetStatus === 'Submitted' ? 'approval-inbox' : 'my-requests')}
              className="ml-4 px-3 py-1 bg-emerald-700 text-white text-xs font-semibold rounded hover:bg-emerald-800 transition-colors"
            >
              {targetStatus === 'Submitted' ? 'Go to Approval Inbox →' : 'Go to My Requests →'}
            </button>
          )}
        </div>
      )}

      {/* Upload & CSV Input Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-900">
              Step 1: Upload or Paste CSV Dataset
            </span>
            <span className="text-xs text-slate-400 font-medium">
              (Evaluated by Rule Engine v{activeCodeRule.version})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLoadSampleBatch}
              className="px-3 py-1.5 bg-blue-50 text-[#060097] hover:bg-blue-100 border border-blue-200 rounded text-xs font-bold transition-colors cursor-pointer"
            >
              ⚡ Load Sample Manufacturing Batch
            </button>
            <div className="border-l border-slate-200 h-5 mx-1"></div>
            <button
              type="button"
              onClick={() => setImportMode('upload')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                importMode === 'upload'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              File Upload
            </button>
            <button
              type="button"
              onClick={() => setImportMode('text')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                importMode === 'text'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Paste Raw CSV
            </button>
          </div>
        </div>

        {importMode === 'upload' ? (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#060097] rounded-lg p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all"
            >
              <UploadCloud className="w-10 h-10 mx-auto text-[#060097] mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {fileName ? `Uploaded: ${fileName}` : 'Click or Drag & Drop CSV File here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports columns: Category, Material, Type, MaterialForm, Process, Colour, Manufacturer, Specification, Dimensions, PartNumber, Rating
              </p>
              {fileName && (
                <span className="inline-block mt-3 px-3 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
                  File loaded • Ready for Rule Engine evaluation
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={7}
              value={csvContent}
              onChange={(e) => {
                setCsvContent(e.target.value);
                runValidation(e.target.value);
              }}
              placeholder={`Category,Material,Type,MaterialForm,Process,Colour,Specification,Dimensions\nFG,HD,M,,CR,GY,"Corrugated Hose Assembly",25mm x 1.5m\nRM,PP,O,PL,,NT,"Polypropylene Pellets",`}
              className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-md outline-none"
            />
            <p className="text-[11px] text-slate-400">
              Paste standard comma-separated lines. The header row is automatically mapped.
            </p>
          </div>
        )}
      </div>

      {/* Validation Summary & KPI Banner */}
      {validationSummary && (
        <div className="space-y-4 animate-in fade-in-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total CSV Rows
              </span>
              <div className="text-2xl font-black text-slate-900">{validationSummary.totalRows}</div>
              <span className="text-[11px] text-slate-500 font-medium">Parsed from upload</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Valid & Ready
              </span>
              <div className="text-2xl font-black text-emerald-600">{validationSummary.validRows}</div>
              <span className="text-[11px] text-emerald-700 font-medium">Rule engine compliant</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-red-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-1">
                Rows with Errors
              </span>
              <div className="text-2xl font-black text-red-600">{validationSummary.errorRows}</div>
              <span className="text-[11px] text-red-700 font-medium">Violations blocked</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                Duplicate Warnings
              </span>
              <div className="text-2xl font-black text-amber-600">
                {validationSummary.duplicateWarningRows}
              </div>
              <span className="text-[11px] text-amber-700 font-medium">Detected collisions</span>
            </div>
          </div>

          {/* Validation Data Table Preview */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-[#060097]" />
                  <span>Step 2: Rule Engine Validation Preview</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect generated Item Codes, formatted descriptions, and rule diagnostics before committing.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    previewFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All ({validationSummary.totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('valid')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    previewFilter === 'valid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700'
                  }`}
                >
                  Valid ({validationSummary.validRows})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('error')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    previewFilter === 'error' ? 'bg-red-600 text-white shadow-xs' : 'text-red-700'
                  }`}
                >
                  Errors ({validationSummary.errorRows})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Row #</th>
                    <th className="py-2.5 px-3">Validation Status</th>
                    <th className="py-2.5 px-3">Generated Item Code</th>
                    <th className="py-2.5 px-3">Generated Item Description</th>
                    <th className="py-2.5 px-3">Classifications</th>
                    <th className="py-2.5 px-3">Rule Diagnostics / Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No rows matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewRows.map((v, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          !v.isValid ? 'bg-red-50/20' : v.isDuplicate ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">
                          #{v.row.rowIndex}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {v.isValid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Ready to Commit
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                              <XCircle className="w-3 h-3 mr-1 text-red-600" />
                              Invalid (Blocked)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#060097] text-xs">
                            {v.generatedCode || '---'}
                          </span>
                          {v.generatedCode && (
                            <span className="block text-[9px] text-slate-400 font-mono">
                              Length: {v.generatedCode.length}/20 chars
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <span className="font-medium text-slate-800 block line-clamp-2">
                            {v.generatedDescription || '---'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                          <span className="font-bold text-slate-800">
                            {v.row.categoryCode || '?'}-{v.row.materialCode || '?'}-{v.row.typeCode || '?'}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {v.row.formCode || '-'} / {v.row.processCode || '-'} / {v.row.colourCode || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          {v.errors.length > 0 && (
                            <div className="space-y-0.5 mb-1">
                              {v.errors.map((err, eIdx) => (
                                <span
                                  key={eIdx}
                                  className="inline-block text-[10px] font-semibold text-red-700 bg-red-100/70 px-1.5 py-0.2 rounded mr-1"
                                >
                                  ✖ {err}
                                </span>
                              ))}
                            </div>
                          )}
                          {v.warnings.length > 0 && (
                            <div className="space-y-0.5">
                              {v.warnings.map((warn, wIdx) => (
                                <span
                                  key={wIdx}
                                  className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded mr-1"
                                >
                                  ⚠ {warn}
                                </span>
                              ))}
                            </div>
                          )}
                          {v.errors.length === 0 && v.warnings.length === 0 && (
                            <span className="text-[11px] text-emerald-700 font-semibold">
                              ✓ Verified against Rule Engine
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Finalization Commit Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    Commit Target Status:
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <label className="flex items-center space-x-1 cursor-pointer font-bold text-slate-800">
                      <input
                        type="radio"
                        name="bulkStatus"
                        value="Submitted"
                        checked={targetStatus === 'Submitted'}
                        onChange={() => setTargetStatus('Submitted')}
                        className="text-[#060097]"
                      />
                      <span>Submitted (Maker-Checker Review)</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer font-medium text-slate-600">
                      <input
                        type="radio"
                        name="bulkStatus"
                        value="Draft"
                        checked={targetStatus === 'Draft'}
                        onChange={() => setTargetStatus('Draft')}
                        className="text-[#060097]"
                      />
                      <span>Save as Drafts</span>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    Default Origin Plant:
                  </span>
                  <select
                    value={defaultBranchId}
                    onChange={(e) => setDefaultBranchId(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 mt-0.5"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name.split('(')[0]} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setValidationSummary(null);
                    setCsvContent('');
                    setFileName(null);
                  }}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  Discard Batch
                </button>

                <button
                  type="button"
                  disabled={validationSummary.validRows === 0 || isCommitting}
                  onClick={handleCommitImport}
                  className="px-5 py-2.5 bg-[#060097] hover:bg-[#04006e] text-white text-xs font-bold rounded-md shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Items...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        Finalize & Create {validationSummary.validRows} Valid Items
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export & Backup Specifications Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Database className="w-4 h-4 text-slate-700" />
            <span>Master Data Repository Exports & Full Backups</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Total Items: <strong className="text-slate-900">{items.length}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Exported datasets contain complete multi-branch availability mappings, approval history timelines, and SAP B1 HANA OITM schema payloads for backup and external BI audits.
        </p>

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            onClick={handleExportFullJson}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Complete Item Master (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
