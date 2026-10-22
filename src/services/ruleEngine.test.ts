import test from 'node:test';
import assert from 'node:assert/strict';
import { generateItemCode, generateItemDescription, ItemFormValues } from './ruleEngine';
import { INITIAL_ITEM_CODE_RULES, INITIAL_DESCRIPTION_RULES, SEED_CLASSIFICATIONS } from '../data/seedData';
import { ClassificationRecord } from '../types';

const classMap: Record<string, ClassificationRecord> = {};
for (const item of SEED_CLASSIFICATIONS) {
  classMap[`${item.dimension}:${item.code}`] = item;
}

const defaultCodeRule = INITIAL_ITEM_CODE_RULES[0];
const rmDescRule = INITIAL_DESCRIPTION_RULES.find((r) => r.categoryCode === 'RM')!;
const fgDescRule = INITIAL_DESCRIPTION_RULES.find((r) => r.categoryCode === 'FG')!;
const maDescRule = INITIAL_DESCRIPTION_RULES.find((r) => r.categoryCode === 'MA')!;

test('Item Code Generator - generates expected Raw Material code: RMPAOPOEXLG0001', () => {
  const values: ItemFormValues = {
    categoryCode: 'RM',
    materialCode: 'PA',
    typeCode: 'O',
    formCode: 'PO',
    processCode: 'EX',
    colourCode: 'LG',
    manufacturerCode: 'AE',
    dimensions: '12MM',
    partModelNumber: 'B0010',
    specification: 'Item Name',
  };

  const result = generateItemCode(defaultCodeRule, values, 1);
  assert.equal(result.isValid, true);
  assert.equal(result.code, 'RMPAOPOEXLG0001');
  assert.equal(result.length, 15);
});

test('Item Code Generator - generates expected Finished Goods code: FGHDMCRGY0002', () => {
  const values: ItemFormValues = {
    categoryCode: 'FG',
    materialCode: 'HD',
    typeCode: 'M',
    processCode: 'CR',
    colourCode: 'GY',
    manufacturerCode: 'AF',
    partModelNumber: 'DIX001',
    specification: 'Item Name',
  };

  const result = generateItemCode(defaultCodeRule, values, 2);
  assert.equal(result.isValid, true);
  assert.equal(result.code, 'FGHDMCRGY0002');
  assert.equal(result.length, 13);
});

test('Item Code Generator - generates expected Spares code omitting missing fields: MAPALBL0003', () => {
  const values: ItemFormValues = {
    categoryCode: 'MA',
    materialCode: 'PA',
    typeCode: 'L',
    colourCode: 'BL',
    dimensions: '5',
  };

  const result = generateItemCode(defaultCodeRule, values, 3);
  assert.equal(result.isValid, true);
  assert.equal(result.code, 'MAPALBL0003');
});

test('Item Description Generator - generates clean RM description without double separators', () => {
  const values: ItemFormValues = {
    categoryCode: 'RM',
    materialCode: 'PA',
    typeCode: 'O',
    formCode: 'PO',
    processCode: 'EX',
    colourCode: 'LG',
    specification: 'Item Name',
  };

  const result = generateItemDescription(rmDescRule, values, classMap);
  assert.equal(result.isValid, true);
  assert.equal(result.description, 'PC-ABS – Item Name – Light Grey – Powder');
});

test('Item Description Generator - generates clean FG description', () => {
  const values: ItemFormValues = {
    categoryCode: 'FG',
    materialCode: 'HD',
    typeCode: 'M',
    colourCode: 'GY',
    specification: 'Item Name',
  };

  const result = generateItemDescription(fgDescRule, values, classMap);
  assert.equal(result.isValid, true);
  assert.equal(result.description, 'HDPE – Item Name – Grey');
});

test('Item Code Generator - enforces required components and rejects missing mandatory fields', () => {
  const values: ItemFormValues = {
    categoryCode: '',
    materialCode: '',
    typeCode: 'M',
  };

  const result = generateItemCode(defaultCodeRule, values, 1);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.length >= 2);
});

test('Item Description Generator - generates full unified formula with rating/size/dimension', () => {
  const values: ItemFormValues = {
    categoryCode: 'RM',
    materialCode: 'PA',
    typeCode: 'O',
    formCode: 'PO',
    processCode: 'EX',
    colourCode: 'LG',
    ratingSizeDimension: '12MM, 200x80mm',
    specification: 'Corrugated Hose Tube',
    customerBrand: 'Bosch Automotive',
  };

  const result = generateItemDescription(rmDescRule, values, classMap);
  assert.equal(result.isValid, true);
  assert.equal(
    result.description,
    'PC-ABS – 12MM, 200x80mm – Corrugated Hose Tube – Light Grey – Powder'
  );
});

test('Item Description Generator - resolves classification master tokens and customerBrand correctly', () => {
  const customRule = {
    id: 'custom-rule-test',
    version: 1,
    categoryCode: 'FG',
    categoryName: 'Finished Goods',
    patternDisplay: 'Category – Process – Material – Customer – Spec',
    segments: [
      { id: '1', position: 1, field: 'CATEGORY_NAME' as const, separator: ' – ', isRequired: true },
      { id: '2', position: 2, field: 'PROCESS_NAME' as const, separator: ' – ', isRequired: true },
      { id: '3', position: 3, field: 'MATERIAL_NAME' as const, separator: ' – ', isRequired: true },
      { id: '4', position: 4, field: 'CUSTOMER_BRAND' as const, separator: ' – ', isRequired: false },
      { id: '5', position: 5, field: 'SPECIFICATION' as const, separator: '', isRequired: true },
    ],
    status: 'Active' as const,
    maxLength: 100,
    createdBy: 'Admin',
    createdAt: '2026-10-22',
  };

  const values: ItemFormValues = {
    categoryCode: 'FG',
    materialCode: 'HD',
    typeCode: 'M',
    processCode: 'CR',
    customerBrand: 'Tata Motors',
    specification: 'Front Grille Bracket',
  };

  const result = generateItemDescription(customRule, values, classMap);
  assert.equal(result.isValid, true);
  assert.equal(
    result.description,
    'Finished Goods – Corrugation – HDPE – Tata Motors – Front Grille Bracket'
  );
});

