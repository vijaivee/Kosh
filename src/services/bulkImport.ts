import {
  ItemCodeRule,
  ItemDescriptionRule,
  ClassificationRecord,
  GlobalItem,
  User,
  Branch,
} from '../types';
import {
  generateItemCode,
  generateItemDescription,
  ItemFormValues,
} from './ruleEngine';

export interface CsvItemRow {
  rowIndex: number;
  categoryCode: string;
  materialCode: string;
  typeCode: string;
  formCode?: string;
  processCode?: string;
  colourCode?: string;
  customerBrand?: string;
  manufacturerCode?: string;
  ratingSizeDimension?: string;
  dimensions?: string;
  partModelNumber?: string;
  ratingSize?: string;
  specification?: string;
  targetBranchId?: string;
}

export interface ValidatedBulkItemRow {
  row: CsvItemRow;
  generatedCode: string;
  generatedDescription: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

export interface BulkValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateWarningRows: number;
  rows: ValidatedBulkItemRow[];
}

/**
 * Parses raw CSV string into structured CsvItemRow objects
 */
export function parseCsvToItemRows(csvText: string): { rows: CsvItemRow[]; parseErrors: string[] } {
  const parseErrors: string[] = [];
  const rows: CsvItemRow[] = [];

  if (!csvText || !csvText.trim()) {
    return { rows, parseErrors: ['CSV content is empty'] };
  }

  // Split lines accounting for \r\n and \n
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { rows, parseErrors: ['No readable data rows found in CSV'] };
  }

  // Simple and robust CSV line splitter handling quoted commas
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headerLine = parseCsvLine(rawLines[0]);
  const headerMap: Record<string, number> = {};
  headerLine.forEach((h, idx) => {
    // Normalize header names, e.g. "Category", "CategoryCode", "Category Code"
    const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    headerMap[normalized] = idx;
  });

  const getCol = (cells: string[], names: string[]): string => {
    for (const name of names) {
      const idx = headerMap[name];
      if (idx !== undefined && idx < cells.length) {
        return cells[idx] || '';
      }
    }
    return '';
  };

  for (let i = 1; i < rawLines.length; i++) {
    const cells = parseCsvLine(rawLines[i]);
    // Skip empty lines
    if (cells.every((c) => c === '')) continue;

    const categoryCode = getCol(cells, ['category', 'categorycode', 'cat']).toUpperCase();
    const materialCode = getCol(cells, ['material', 'materialcode', 'mat']).toUpperCase();
    const typeCode = getCol(cells, ['type', 'typecode', 'typ']).toUpperCase();
    const formCode = getCol(cells, ['form', 'formcode', 'materialform', 'materialformcode']).toUpperCase();
    const processCode = getCol(cells, ['process', 'processcode', 'prc']).toUpperCase();
    const colourCode = getCol(cells, ['colour', 'color', 'colourcode', 'colorcode']).toUpperCase();
    const manufacturerCode = getCol(cells, ['manufacturer', 'brand', 'manufacturercode', 'mfg']).toUpperCase();
    const customerBrand = getCol(cells, ['customerbrand', 'customer', 'manufacturer', 'brand', 'manufacturercode', 'mfg']);
    const dimensions = getCol(cells, ['dimensions', 'dimension', 'dim']);
    const partModelNumber = getCol(cells, ['partmodelnumber', 'partnumber', 'modelnumber', 'partno']);
    const ratingSize = getCol(cells, ['ratingsize', 'rating', 'size', 'thickness', 'gsm', 'capacity', 'cavity']);
    const ratingSizeDimension = getCol(cells, [
      'ratingsizedimension',
      'ratingsize',
      'dimension',
      'dimensions',
      'rating',
      'size',
      'thickness',
      'gsm',
      'capacity',
      'cavity',
    ]) || ratingSize || dimensions;
    const specification = getCol(cells, ['specification', 'itemname', 'productname', 'spec', 'name']);
    const targetBranchId = getCol(cells, ['branch', 'branchid', 'plant', 'plantid']);

    rows.push({
      rowIndex: i + 1,
      categoryCode,
      materialCode,
      typeCode,
      formCode: formCode || undefined,
      processCode: processCode || undefined,
      colourCode: colourCode || undefined,
      customerBrand: customerBrand || undefined,
      manufacturerCode: manufacturerCode || customerBrand || undefined,
      ratingSizeDimension: ratingSizeDimension || undefined,
      dimensions: dimensions || ratingSizeDimension || undefined,
      partModelNumber: partModelNumber || undefined,
      ratingSize: ratingSize || ratingSizeDimension || undefined,
      specification: specification || undefined,
      targetBranchId: targetBranchId || undefined,
    });
  }

  return { rows, parseErrors };
}

/**
 * Validates each parsed CSV row against active classification records, Item Code Rule,
 * and Category Description Rule, checking duplicate collisions
 */
export function validateBulkItemRows(
  csvRows: CsvItemRow[],
  existingItems: GlobalItem[],
  codeRule: ItemCodeRule,
  descRules: ItemDescriptionRule[],
  classifications: ClassificationRecord[],
  branches: Branch[],
  startSequenceNumber: number
): BulkValidationSummary {
  const classMap: Record<string, ClassificationRecord> = {};
  for (const c of classifications) {
    classMap[`${c.dimension}:${c.code}`] = c;
  }

  const validatedRows: ValidatedBulkItemRow[] = [];
  let seqCounter = startSequenceNumber;
  const batchGeneratedCodes = new Set<string>();

  for (const row of csvRows) {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isDuplicate = false;

    // 1. Mandatory classification existence check
    if (!row.categoryCode) {
      errors.push('Category code is missing');
    } else if (!classMap[`Category:${row.categoryCode}`]) {
      errors.push(`Invalid Category code "${row.categoryCode}"`);
    }

    if (!row.materialCode) {
      errors.push('Material code is missing');
    } else if (!classMap[`Material:${row.materialCode}`]) {
      errors.push(`Invalid Material code "${row.materialCode}"`);
    }

    if (!row.typeCode) {
      errors.push('Type code is missing');
    } else if (!classMap[`Type:${row.typeCode}`]) {
      errors.push(`Invalid Type code "${row.typeCode}"`);
    }

    // Optional classification checks if provided
    if (row.formCode && !classMap[`Material Form:${row.formCode}`]) {
      errors.push(`Invalid Material Form code "${row.formCode}"`);
    }
    if (row.processCode && !classMap[`Process:${row.processCode}`]) {
      errors.push(`Invalid Process code "${row.processCode}"`);
    }
    if (row.colourCode && !classMap[`Colour:${row.colourCode}`]) {
      errors.push(`Invalid Colour code "${row.colourCode}"`);
    }
    if (row.manufacturerCode && !classMap[`Manufacturer:${row.manufacturerCode}`]) {
      errors.push(`Invalid Manufacturer code "${row.manufacturerCode}"`);
    }

    // Branch check if provided
    if (row.targetBranchId) {
      const bFound = branches.find((b) => b.id === row.targetBranchId || b.code === row.targetBranchId);
      if (!bFound) {
        warnings.push(`Target branch "${row.targetBranchId}" not found, default branch will be used.`);
      }
    }

    // 2. Rule Engine Evaluation
    const formValues: ItemFormValues = {
      categoryCode: row.categoryCode,
      materialCode: row.materialCode,
      typeCode: row.typeCode,
      formCode: row.formCode,
      processCode: row.processCode,
      colourCode: row.colourCode,
      customerBrand: row.customerBrand || row.manufacturerCode,
      manufacturerCode: row.manufacturerCode || row.customerBrand,
      ratingSizeDimension: row.ratingSizeDimension || row.dimensions || row.ratingSize,
      dimensions: row.dimensions || row.ratingSizeDimension,
      partModelNumber: row.partModelNumber,
      ratingSize: row.ratingSize || row.ratingSizeDimension,
      specification: row.specification,
    };

    const codeResult = generateItemCode(codeRule, formValues, seqCounter);
    if (!codeResult.isValid) {
      errors.push(...codeResult.errors);
    }

    const categoryDescRule =
      descRules.find((r) => r.categoryCode === row.categoryCode) ||
      descRules.find((r) => r.categoryCode === 'FG') ||
      descRules[0];

    const descResult = generateItemDescription(categoryDescRule, formValues, classMap);
    if (!descResult.isValid) {
      errors.push(...descResult.errors);
    }

    // 3. Duplicate checks against database & batch
    const codeMatch = existingItems.find((i) => i.itemCode === codeResult.code);
    if (codeMatch) {
      isDuplicate = true;
      warnings.push(`Item code "${codeResult.code}" already exists in Master Registry (Status: ${codeMatch.status}).`);
    }

    if (batchGeneratedCodes.has(codeResult.code)) {
      isDuplicate = true;
      warnings.push(`Item code "${codeResult.code}" is duplicated within this CSV batch.`);
    }

    // Duplicate classification fingerprint check
    const fingerprintMatch = existingItems.find(
      (i) =>
        i.categoryCode === row.categoryCode &&
        i.materialCode === row.materialCode &&
        i.typeCode === row.typeCode &&
        i.formCode === row.formCode &&
        i.processCode === row.processCode &&
        i.colourCode === row.colourCode
    );
    if (fingerprintMatch) {
      warnings.push(`Similar classification combination exists as "${fingerprintMatch.itemCode}".`);
    }

    if (codeResult.code) {
      batchGeneratedCodes.add(codeResult.code);
    }

    seqCounter++;

    validatedRows.push({
      row,
      generatedCode: codeResult.code,
      generatedDescription: descResult.description,
      isValid: errors.length === 0,
      errors,
      warnings,
      isDuplicate,
    });
  }

  const validRows = validatedRows.filter((r) => r.isValid).length;
  const errorRows = validatedRows.filter((r) => !r.isValid).length;
  const duplicateWarningRows = validatedRows.filter((r) => r.isDuplicate || r.warnings.length > 0).length;

  return {
    totalRows: validatedRows.length,
    validRows,
    errorRows,
    duplicateWarningRows,
    rows: validatedRows,
  };
}

/**
 * Creates GlobalItem objects from validated rows
 */
export function createGlobalItemsFromBulkRows(
  validatedRows: ValidatedBulkItemRow[],
  currentUser: User,
  branches: Branch[],
  defaultBranchId: string,
  importStatus: 'Draft' | 'Submitted',
  codeRuleId: string,
  descRuleId: string
): GlobalItem[] {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  return validatedRows
    .filter((v) => v.isValid)
    .map((v, idx) => {
      const originBranchId = v.row.targetBranchId || defaultBranchId;

      const history =
        importStatus === 'Submitted'
          ? [
              {
                id: `app-bulk-${Date.now()}-${idx}`,
                action: 'Submitted' as const,
                actorId: currentUser.id,
                actorName: currentUser.displayName,
                actorRole: currentUser.role,
                comments: 'Created and submitted via CSV bulk import.',
                timestamp,
                itemVersionSnapshot: 1,
              },
            ]
          : [];

      return {
        id: `item-bulk-${Date.now()}-${idx}`,
        organizationId: 'org-kosh-01',
        originBranchId,
        itemCode: v.generatedCode,
        isCodeProvisional: importStatus === 'Draft',
        itemDescription: v.generatedDescription,
        categoryCode: v.row.categoryCode,
        materialCode: v.row.materialCode,
        typeCode: v.row.typeCode,
        formCode: v.row.formCode,
        processCode: v.row.processCode,
        colourCode: v.row.colourCode,
        customerBrand: v.row.customerBrand || v.row.manufacturerCode,
        manufacturerCode: v.row.manufacturerCode || v.row.customerBrand,
        ratingSizeDimension: v.row.ratingSizeDimension || v.row.dimensions || v.row.ratingSize,
        dimensions: v.row.dimensions || v.row.ratingSizeDimension,
        partModelNumber: v.row.partModelNumber,
        ratingSize: v.row.ratingSize || v.row.ratingSizeDimension,
        specification: v.row.specification,
        status: importStatus,
        version: 1,
        codeRuleVersionId: codeRuleId,
        descriptionRuleVersionId: descRuleId,
        createdBy: currentUser.id,
        createdByName: currentUser.displayName,
        createdByEmail: currentUser.email,
        createdAt: timestamp,
        updatedAt: timestamp,
        approvalHistory: history,
        branchAvailability: branches.map((b) => ({
          branchId: b.id,
          branchName: b.name.split('(')[0].trim(),
          isAvailable: b.id === originBranchId,
          inventoryStatus: b.id === originBranchId ? ('Active' as const) : ('Inactive' as const),
        })),
        sapSyncStatus: 'Not Synced' as const,
      };
    });
}
