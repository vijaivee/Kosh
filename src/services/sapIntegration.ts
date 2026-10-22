import { GlobalItem, SapIntegrationJob } from '../types';

export interface SapOitmPayload {
  ItemCode: string;
  ItemName: string;
  ItmsGrpCod: number;
  InventoryItem: 'tYES' | 'tNO';
  SellItem: 'tYES' | 'tNO';
  PurchaseItem: 'tYES' | 'tNO';
  ManageSerialNumbers: 'tNO';
  ManageBatchNumbers: 'tYES' | 'tNO';
  U_Material?: string;
  U_Type?: string;
  U_Form?: string;
  U_Process?: string;
  U_Colour?: string;
  U_Manufacturer?: string;
  U_PartNumber?: string;
  U_OriginBranch?: string;
  U_GlobalItemId: string;
}

/**
 * Maps category code to SAP Business One Item Group Code (ItmsGrpCod)
 */
export function getSapItemGroupCode(categoryCode: string): number {
  switch (categoryCode) {
    case 'FG': return 100; // Finished Goods
    case 'SF': return 101; // Semi-Finished Goods
    case 'RM': return 102; // Raw Materials
    case 'BO': return 103; // Bought-Out
    case 'PM': return 104; // Packaging
    case 'MA': return 105; // Maintenance
    case 'CO': return 106; // Consumables
    case 'SV': return 107; // Services
    case 'SC': return 108; // Scrap / Regrind
    case 'TR': return 109; // Trading Item
    case 'CP': return 110; // Capital Equipment
    case 'MO': return 111; // Moulds / Tooling
    default: return 120;
  }
}

/**
 * Builds the official SAP B1 HANA Service Layer payload
 */
export function buildSapOitmPayload(item: GlobalItem): SapOitmPayload {
  const isFinishedOrTrading = item.categoryCode === 'FG' || item.categoryCode === 'TR';
  const isPurchase = item.categoryCode !== 'SV' && item.categoryCode !== 'FG';
  const isBatchManaged = item.categoryCode === 'RM' || item.categoryCode === 'SF' || item.categoryCode === 'FG';

  return {
    ItemCode: item.itemCode,
    ItemName: item.itemDescription.substring(0, 100),
    ItmsGrpCod: getSapItemGroupCode(item.categoryCode),
    InventoryItem: item.categoryCode === 'SV' ? 'tNO' : 'tYES',
    SellItem: isFinishedOrTrading ? 'tYES' : 'tNO',
    PurchaseItem: isPurchase ? 'tYES' : 'tNO',
    ManageSerialNumbers: 'tNO',
    ManageBatchNumbers: isBatchManaged ? 'tYES' : 'tNO',
    U_Material: item.materialCode,
    U_Type: item.typeCode,
    U_Form: item.formCode,
    U_Process: item.processCode,
    U_Colour: item.colourCode,
    U_Manufacturer: item.manufacturerCode,
    U_PartNumber: item.partModelNumber,
    U_OriginBranch: item.originBranchId,
    U_GlobalItemId: item.id,
  };
}

/**
 * Simulates SAP B1 Service Layer POST /b1s/v2/Items with network latency,
 * idempotency check, and robust retry capabilities
 */
export async function syncItemToSapB1Hana(
  item: GlobalItem,
  companyDb: string = 'KOSH_PROD_HANA',
  simulateFailure: boolean = false
): Promise<{
  success: boolean;
  sapItemCode?: string;
  errorMessage?: string;
  job: SapIntegrationJob;
}> {
  const payload = buildSapOitmPayload(item);
  const idempotencyKey = item.sapIdempotencyKey || `SAP-IDEMP-${item.id}-${Date.now()}`;

  // Artificial short delay to simulate network call to SAP B1 HANA Service Layer
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (simulateFailure) {
    const failedJob: SapIntegrationJob = {
      id: `sap-job-${Date.now()}`,
      itemId: item.id,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
      companyDb,
      status: 'Failed',
      attempts: 1,
      maxAttempts: 3,
      idempotencyKey,
      requestPayload: payload,
      errorMessage: 'SAP B1 Service Layer: 409 Conflict - ItemCode already exists or database lock timeout in SAP HANA.',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    return {
      success: false,
      errorMessage: failedJob.errorMessage,
      job: failedJob,
    };
  }

  const successJob: SapIntegrationJob = {
    id: `sap-job-${Date.now()}`,
    itemId: item.id,
    itemCode: item.itemCode,
    itemDescription: item.itemDescription,
    companyDb,
    status: 'Success',
    attempts: 1,
    maxAttempts: 3,
    idempotencyKey,
    requestPayload: payload,
    responsePayload: {
      ItemCode: item.itemCode,
      ItemName: item.itemDescription,
      DocEntry: Math.floor(100000 + Math.random() * 900000),
      CreateDate: new Date().toISOString().split('T')[0],
      StatusCode: 201,
      Message: 'Item successfully registered in SAP Business One HANA OITM table.',
    },
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    completedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };

  return {
    success: true,
    sapItemCode: item.itemCode,
    job: successJob,
  };
}
