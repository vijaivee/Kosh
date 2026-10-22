import { ItemCodeRule, ItemDescriptionRule, ClassificationRecord } from '../types';

export interface ItemFormValues {
  categoryCode: string;
  materialCode: string;
  typeCode: string;
  formCode?: string;
  processCode?: string;
  colourCode?: string;
  manufacturerCode?: string;
  // User Input Technical Specifications & Dimensions
  customerBrand?: string; // Customer / Manufacturer / Brand (User Input)
  ratingSizeDimension?: string; // Rating / Size / Thickness-GSM / Cavity / Capacity / Dimension (e.g. 12MM, 200x80mm)
  dimensions?: string; // legacy alias
  partModelNumber?: string;
  ratingSize?: string; // legacy alias
  specification?: string;
}

export interface CodeGenerationResult {
  code: string;
  isValid: boolean;
  errors: string[];
  componentsBreakdown: {
    type: string;
    label: string;
    value: string;
    source: string;
  }[];
  length: number;
}

export interface DescriptionGenerationResult {
  description: string;
  isValid: boolean;
  errors: string[];
  segmentsBreakdown: {
    field: string;
    value: string;
    separator: string;
  }[];
  length: number;
}

/**
 * Generate an Item Code according to the configured rule components
 */
export function generateItemCode(
  rule: ItemCodeRule,
  values: ItemFormValues,
  sequenceNumber: number
): CodeGenerationResult {
  const errors: string[] = [];
  const breakdown: CodeGenerationResult['componentsBreakdown'] = [];
  let generatedParts: string[] = [];

  // Sort components by position
  const sortedComponents = [...rule.components].sort((a, b) => a.position - b.position);

  for (const comp of sortedComponents) {
    let value = '';
    let source = '';

    switch (comp.type) {
      case 'CATEGORY':
        value = values.categoryCode || '';
        source = 'Category Code';
        break;
      case 'MATERIAL':
        value = values.materialCode || '';
        source = 'Material Code';
        break;
      case 'TYPE':
        value = values.typeCode || '';
        source = 'Type Code';
        break;
      case 'FORM':
        value = values.formCode || '';
        source = 'Material Form Code';
        break;
      case 'PROCESS':
        value = values.processCode || '';
        source = 'Process Code';
        break;
      case 'COLOUR':
        value = values.colourCode || '';
        source = 'Colour Code';
        break;
      case 'MANUFACTURER':
        value = values.manufacturerCode || '';
        source = 'Manufacturer Code';
        break;
      case 'LITERAL':
        value = comp.fixedValue || '';
        source = 'Fixed Literal';
        break;
      case 'SEQUENCE':
        const pad = comp.padding || rule.sequencePadding || 4;
        value = String(sequenceNumber).padStart(pad, '0');
        source = `Sequence (${pad} digits)`;
        break;
    }

    if (comp.isRequired && !value.trim()) {
      errors.push(`Required code component "${comp.name}" is missing`);
    }

    // Apply uppercase formatting
    const formattedVal = value.trim().toUpperCase();
    if (formattedVal) {
      generatedParts.push(formattedVal);
    }

    breakdown.push({
      type: comp.type,
      label: comp.name,
      value: formattedVal || '(empty)',
      source,
    });
  }

  const finalCode = generatedParts.join('');

  if (finalCode.length > (rule.maxLength || 20)) {
    errors.push(`Generated code length (${finalCode.length}) exceeds SAP maximum allowed (${rule.maxLength || 20} characters)`);
  }

  if (/[^A-Z0-9_\-]/.test(finalCode)) {
    errors.push(`Generated code contains unsupported characters for SAP Business One`);
  }

  return {
    code: finalCode,
    isValid: errors.length === 0,
    errors,
    componentsBreakdown: breakdown,
    length: finalCode.length,
  };
}

/**
 * Generate an Item Description according to category template rules
 */
export function generateItemDescription(
  rule: ItemDescriptionRule,
  values: ItemFormValues,
  classificationsMap: Record<string, ClassificationRecord>
): DescriptionGenerationResult {
  const errors: string[] = [];
  const breakdown: DescriptionGenerationResult['segmentsBreakdown'] = [];
  const segmentsOutput: { text: string; separator: string }[] = [];

  const sortedSegments = [...rule.segments].sort((a, b) => a.position - b.position);

  for (let i = 0; i < sortedSegments.length; i++) {
    const seg = sortedSegments[i];
    let val = '';

    switch (seg.field) {
      // Classification Masters:
      case 'MATERIAL_NAME':
      case 'MATERIAL':
        if (values.materialCode) {
          const mRecord = classificationsMap[`Material:${values.materialCode}`];
          val = mRecord ? mRecord.name.split('–')[0].trim() : values.materialCode;
        }
        break;
      case 'MATERIAL_CODE':
        val = values.materialCode || '';
        break;
      case 'CATEGORY_NAME':
        if (values.categoryCode) {
          const catRecord = classificationsMap[`Category:${values.categoryCode}`];
          val = catRecord ? catRecord.name : values.categoryCode;
        }
        break;
      case 'CATEGORY_CODE':
        val = values.categoryCode || '';
        break;
      case 'TYPE_NAME':
        if (values.typeCode) {
          const tRecord = classificationsMap[`Type:${values.typeCode}`];
          val = tRecord ? tRecord.name : values.typeCode;
        }
        break;
      case 'TYPE_CODE':
        val = values.typeCode || '';
        break;
      case 'FORM_NAME':
      case 'FORM':
        if (values.formCode) {
          const fRecord = classificationsMap[`Material Form:${values.formCode}`];
          val = fRecord ? fRecord.name : values.formCode;
        }
        break;
      case 'FORM_CODE':
        val = values.formCode || '';
        break;
      case 'PROCESS_NAME':
        if (values.processCode) {
          const pRecord = classificationsMap[`Process:${values.processCode}`];
          val = pRecord ? pRecord.name : values.processCode;
        }
        break;
      case 'PROCESS_CODE':
        val = values.processCode || '';
        break;
      case 'COLOUR_NAME':
      case 'COLOUR':
        if (values.colourCode) {
          const cRecord = classificationsMap[`Colour:${values.colourCode}`];
          val = cRecord ? cRecord.name : values.colourCode;
        }
        break;
      case 'COLOUR_CODE':
        val = values.colourCode || '';
        break;

      // Technical Specifications & Dimensions (User Input):
      case 'RATING_SIZE_DIMENSION':
      case 'DIMENSION':
      case 'SIZE':
      case 'RATING':
      case 'CAVITY':
        val = values.ratingSizeDimension || values.dimensions || values.ratingSize || '';
        break;
      case 'SPECIFICATION':
      case 'PRODUCT_NAME':
      case 'GRADE':
        val = values.specification || '';
        break;
      case 'CUSTOMER_BRAND':
      case 'MANUFACTURER':
        val = values.customerBrand || values.manufacturerCode || '';
        break;
      case 'PART_NUMBER':
        val = values.partModelNumber || '';
        break;
      case 'LITERAL':
        val = seg.literalText || '';
        break;
    }

    const trimmedVal = val.trim();

    if (seg.isRequired && !trimmedVal) {
      errors.push(`Required description segment "${seg.field}" is missing`);
    }

    breakdown.push({
      field: seg.field,
      value: trimmedVal || '(empty)',
      separator: seg.separator,
    });

    if (trimmedVal) {
      segmentsOutput.push({
        text: trimmedVal,
        separator: seg.separator || ' – ',
      });
    }
  }

  // Combine segments cleanly without leading, trailing, or double separators
  let finalDescription = '';
  for (let i = 0; i < segmentsOutput.length; i++) {
    const curr = segmentsOutput[i];
    finalDescription += curr.text;
    if (i < segmentsOutput.length - 1) {
      finalDescription += curr.separator;
    }
  }

  // Normalize duplicate spaces and hyphens
  finalDescription = finalDescription
    .replace(/\s+/g, ' ')
    .replace(/\s*–\s*–\s*/g, ' – ')
    .trim();

  if (finalDescription.length > (rule.maxLength || 100)) {
    errors.push(`Item description length (${finalDescription.length}) exceeds maximum limit (${rule.maxLength || 100})`);
  }

  return {
    description: finalDescription,
    isValid: errors.length === 0,
    errors,
    segmentsBreakdown: breakdown,
    length: finalDescription.length,
  };
}
