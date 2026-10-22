import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsvToItemRows,
  validateBulkItemRows,
  createGlobalItemsFromBulkRows,
} from './bulkImport';
import {
  SEED_CLASSIFICATIONS,
  INITIAL_ITEM_CODE_RULES,
  INITIAL_DESCRIPTION_RULES,
  INITIAL_GLOBAL_ITEMS,
  INITIAL_BRANCHES,
  INITIAL_USERS,
} from '../data/seedData';

const testUser = INITIAL_USERS[0];
const codeRule = INITIAL_ITEM_CODE_RULES[0];
const descRules = INITIAL_DESCRIPTION_RULES;

test('CSV Parser - accurately parses standard headers and comma-delimited data', () => {
  const csv = `Category,Material,Type,Process,Colour,Specification,Dimensions
FG,HD,M,CR,GY,"Corrugated HDPE Hose, Heavy Duty",25mm
RM,PP,O,,NT,Polypropylene Homopolymer Pellets,`;

  const { rows, parseErrors } = parseCsvToItemRows(csv);
  assert.equal(parseErrors.length, 0);
  assert.equal(rows.length, 2);

  assert.equal(rows[0].categoryCode, 'FG');
  assert.equal(rows[0].materialCode, 'HD');
  assert.equal(rows[0].typeCode, 'M');
  assert.equal(rows[0].processCode, 'CR');
  assert.equal(rows[0].colourCode, 'GY');
  assert.equal(rows[0].specification, 'Corrugated HDPE Hose, Heavy Duty');
  assert.equal(rows[0].dimensions, '25mm');

  assert.equal(rows[1].categoryCode, 'RM');
  assert.equal(rows[1].materialCode, 'PP');
  assert.equal(rows[1].typeCode, 'O');
  assert.equal(rows[1].colourCode, 'NT');
});

test('Bulk Validation - validates compliant items against rule engine', () => {
  const csvRows = [
    {
      rowIndex: 2,
      categoryCode: 'FG',
      materialCode: 'HD',
      typeCode: 'M',
      processCode: 'CR',
      colourCode: 'GY',
      specification: 'Corrugated Hose Assembly',
    },
    {
      rowIndex: 3,
      categoryCode: 'RM',
      materialCode: 'PA',
      typeCode: 'O',
      formCode: 'PO',
      processCode: 'EX',
      colourCode: 'LG',
      specification: 'PC-ABS Extrusion Resin',
    },
  ];

  const summary = validateBulkItemRows(
    csvRows,
    INITIAL_GLOBAL_ITEMS,
    codeRule,
    descRules,
    SEED_CLASSIFICATIONS,
    INITIAL_BRANCHES,
    10
  );

  assert.equal(summary.totalRows, 2);
  assert.equal(summary.validRows, 2);
  assert.equal(summary.errorRows, 0);

  // Check generated code and description
  assert.ok(summary.rows[0].generatedCode.startsWith('FGHDMCRGY'));
  assert.ok(summary.rows[0].generatedDescription.includes('HDPE'));
  assert.ok(summary.rows[1].generatedCode.startsWith('RMPAOPOEXLG'));
});

test('Bulk Validation - catches invalid classification codes and missing fields', () => {
  const invalidRows = [
    {
      rowIndex: 2,
      categoryCode: 'INVALID_CAT',
      materialCode: 'HD',
      typeCode: 'M',
      specification: 'Test Spec',
    },
    {
      rowIndex: 3,
      categoryCode: 'FG',
      materialCode: 'NON_EXISTENT_MATERIAL',
      typeCode: 'M',
      specification: 'Test Spec 2',
    },
    {
      rowIndex: 4,
      categoryCode: 'FG',
      materialCode: 'HD',
      typeCode: '', // missing mandatory type
      specification: 'Test Spec 3',
    },
  ];

  const summary = validateBulkItemRows(
    invalidRows,
    INITIAL_GLOBAL_ITEMS,
    codeRule,
    descRules,
    SEED_CLASSIFICATIONS,
    INITIAL_BRANCHES,
    20
  );

  assert.equal(summary.totalRows, 3);
  assert.equal(summary.validRows, 0);
  assert.equal(summary.errorRows, 3);

  assert.ok(summary.rows[0].errors.some((e) => e.includes('Invalid Category')));
  assert.ok(summary.rows[1].errors.some((e) => e.includes('Invalid Material')));
  assert.ok(summary.rows[2].errors.some((e) => e.includes('Type code is missing')));
});

test('Bulk Item Creation - converts validated rows to GlobalItem entities with selected status', () => {
  const validCsvRows = [
    {
      rowIndex: 2,
      categoryCode: 'FG',
      materialCode: 'PP',
      typeCode: 'M',
      specification: 'Injection Moulded Housing',
    },
  ];

  const summary = validateBulkItemRows(
    validCsvRows,
    INITIAL_GLOBAL_ITEMS,
    codeRule,
    descRules,
    SEED_CLASSIFICATIONS,
    INITIAL_BRANCHES,
    50
  );

  const createdItems = createGlobalItemsFromBulkRows(
    summary.rows,
    testUser,
    INITIAL_BRANCHES,
    'br-pon-01',
    'Submitted',
    codeRule.id,
    descRules[0].id
  );

  assert.equal(createdItems.length, 1);
  assert.equal(createdItems[0].status, 'Submitted');
  assert.equal(createdItems[0].isCodeProvisional, false);
  assert.equal(createdItems[0].approvalHistory.length, 1);
  assert.equal(createdItems[0].originBranchId, 'br-pon-01');
});
