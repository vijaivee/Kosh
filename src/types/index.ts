/**
 * Core Type Definitions for Kosh Global Item Creation & Governance System
 */

export type RoleName =
  | 'PLATFORM_ADMIN'
  | 'ORG_ADMIN'
  | 'GLOBAL_ITEM_ADMIN'
  | 'ITEM_CREATOR'
  | 'BRANCH_COORDINATOR'
  | 'ITEM_APPROVER'
  | 'MASTER_DATA_AUDITOR'
  | 'INTEGRATION_SERVICE'
  | 'READ_ONLY_USER';

export type Permission =
  | 'item.read'
  | 'item.create'
  | 'item.update_draft'
  | 'item.submit'
  | 'item.approve'
  | 'item.reject'
  | 'item.activate_branch'
  | 'item.export'
  | 'classification.manage'
  | 'rule.manage'
  | 'rule.approve'
  | 'user.manage'
  | 'role.manage'
  | 'branch.manage'
  | 'audit.read'
  | 'integration.manage'
  | 'system.configure';

export type ItemStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Returned for Correction'
  | 'Rejected'
  | 'SAP Pending'
  | 'SAP Created'
  | 'SAP Failed'
  | 'Retry Pending'
  | 'Cancelled';

export interface ClassificationRecord {
  id: string;
  code: string;
  name: string;
  display: string;
  dimension: 'Category' | 'Material' | 'Type' | 'Material Form' | 'Process' | 'Colour' | 'Manufacturer';
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  code: string;
  name: string;
  legalEntity: string;
  hqLocation: string;
  isActive: boolean;
}

export interface Branch {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: 'Plant' | 'Warehouse' | 'Corporate' | 'R&D Center';
  location: string;
  state: string;
  gstin?: string;
  isActive: boolean;
}

export type HierarchyLevel = 1 | 2 | 3 | 4;
// Level 1: Maker / Junior Operator / Plant Data Clerk
// Level 2: Section Lead / Senior Production Engineer / Shift Reviewer
// Level 3: Plant Manager / Quality Assurance Head / Branch Item Approver
// Level 4: Corporate Master Data Head / VP Operations / Org Admin

export interface User {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  employeeId: string;
  role: RoleName;
  assignedBranchIds: string[]; // Branches this user has access to
  defaultBranchId: string;
  isTwoFactorEnabled: boolean;
  isActive: boolean;
  lastLogin?: string;

  // Plant & Employee Management Hierarchy Attributes
  hierarchyLevel?: HierarchyLevel; // Level 1 (Maker) to Level 4 (Corporate Exec)
  designation?: string; // e.g. "Senior Tooling Engineer", "Plant Quality Manager"
  department?: string; // e.g. "Moulding & Tooling", "Quality Assurance", "Operations"
  managerId?: string; // Direct reporting supervisor user ID
  authorizedCategoryCodes?: string[]; // Specific category approvals (e.g. ['RM'], ['FG'], ['*'] for all)
}

export interface ApprovalMatrixRule {
  id: string;
  name: string;
  branchId: string; // 'ALL' or specific branchId
  categoryCode: string; // 'ALL' or specific category (e.g. 'FG', 'RM', 'MA')
  makerHierarchyLevel?: HierarchyLevel; // Applies if maker is this level or undefined for any
  requiredApproverLevel: HierarchyLevel; // Minimum required approver hierarchy level (1-4)
  requiresDirectManager: boolean; // Must be in maker's direct reporting line
  requiresCategorySpecialist?: boolean; // Approver must be explicitly authorized for item category
  description: string;
  isActive: boolean;
  priority: number; // Higher number evaluated first
}

export interface ItemCodeRuleComponent {
  id: string;
  position: number;
  type: 'CATEGORY' | 'MATERIAL' | 'TYPE' | 'FORM' | 'PROCESS' | 'COLOUR' | 'MANUFACTURER' | 'LITERAL' | 'SEQUENCE';
  name: string;
  fixedValue?: string;
  padding?: number;
  caseFormat?: 'UPPER' | 'LOWER' | 'PRESERVE';
  isRequired: boolean;
}

export interface ItemCodeRule {
  id: string;
  version: number;
  name: string;
  categoryCode: string; // Specific category or 'ALL'
  components: ItemCodeRuleComponent[];
  sequenceScope: 'GLOBAL' | 'CATEGORY' | 'BRANCH';
  sequencePadding: number;
  currentSequence: number;
  maxLength: number; // Max 20 for SAP
  status: 'Draft' | 'Active' | 'Retired';
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export type DescriptionSegmentField =
  // Classification Masters:
  | 'CATEGORY_NAME'
  | 'CATEGORY_CODE'
  | 'MATERIAL_NAME'
  | 'MATERIAL_CODE'
  | 'TYPE_NAME'
  | 'TYPE_CODE'
  | 'FORM_NAME'
  | 'FORM_CODE'
  | 'PROCESS_NAME'
  | 'PROCESS_CODE'
  | 'COLOUR_NAME'
  | 'COLOUR_CODE'
  // Technical Specifications & Dimensions (User Input):
  | 'RATING_SIZE_DIMENSION' // Rating / Size / Thickness-GSM / Cavity / Capacity / Dimension (e.g. 12MM, 200x80mm)
  | 'SPECIFICATION' // Specification / Name
  | 'CUSTOMER_BRAND' // Customer / Manufacturer / Brand (User Input)
  | 'PART_NUMBER' // Part / Model / Drawing Number
  | 'LITERAL'
  // Legacy aliases:
  | 'MATERIAL'
  | 'GRADE'
  | 'PRODUCT_NAME'
  | 'COLOUR'
  | 'FORM'
  | 'SIZE'
  | 'DIMENSION'
  | 'MANUFACTURER'
  | 'RATING'
  | 'TOOL_TYPE'
  | 'CAVITY';

export interface ItemDescriptionRuleSegment {
  id: string;
  position: number;
  field: DescriptionSegmentField;
  literalText?: string;
  prefix?: string;
  suffix?: string;
  separator: string; // e.g. " – "
  isRequired: boolean;
}

export interface ItemDescriptionRule {
  id: string;
  version: number;
  categoryCode: string;
  categoryName: string;
  patternDisplay: string;
  segments: ItemDescriptionRuleSegment[];
  status: 'Draft' | 'Active' | 'Retired';
  maxLength: number; // e.g. 100
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ItemBranchAvailability {
  branchId: string;
  branchName: string;
  isAvailable: boolean;
  inventoryStatus: 'Active' | 'Inactive' | 'Pending Stock' | 'Obsolete';
  minStockLevel?: number;
  reorderPoint?: number;
  activatedAt?: string;
  activatedBy?: string;
}

export interface GlobalItem {
  id: string;
  organizationId: string;
  originBranchId: string;
  itemCode: string; // Generated code
  isCodeProvisional: boolean;
  itemDescription: string; // Generated description
  categoryCode: string;
  materialCode: string;
  typeCode: string;
  formCode?: string;
  processCode?: string;
  colourCode?: string;
  manufacturerCode?: string;
  
  // Technical Specifications & Dimensions (User Input)
  customerBrand?: string; // Customer / Manufacturer / Brand (User Input)
  ratingSizeDimension?: string; // Rating / Size / Thickness-GSM / Cavity / Capacity / Dimension (e.g. 12MM, 200x80mm)
  dimensions?: string; // legacy alias
  partModelNumber?: string;
  ratingSize?: string; // legacy alias
  specification?: string; // Specification / Name
  
  status: ItemStatus;
  version: number;
  codeRuleVersionId: string;
  descriptionRuleVersionId: string;
  
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  
  // Hierarchy & Approval Routing Metadata
  targetApproverId?: string;
  requiredApproverLevel?: HierarchyLevel;
  approvalRoutingRuleId?: string;
  approvalRoutingReason?: string;
  
  approvalHistory: ApprovalHistoryEntry[];
  branchAvailability: ItemBranchAvailability[];
  
  // SAP B1 Integration Attributes
  sapItemCode?: string;
  sapCompanyDb?: string;
  sapSyncStatus: 'Not Synced' | 'Syncing' | 'Synced' | 'Failed';
  sapSyncedAt?: string;
  sapErrorMessage?: string;
  sapIdempotencyKey?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  action: 'Submitted' | 'Approved' | 'Returned for Correction' | 'Rejected' | 'Resubmitted';
  actorId: string;
  actorName: string;
  actorRole: string;
  comments: string;
  timestamp: string;
  itemVersionSnapshot: number;
}

export interface SapIntegrationJob {
  id: string;
  itemId: string;
  itemCode: string;
  itemDescription: string;
  companyDb: string;
  status: 'Pending' | 'Success' | 'Failed' | 'Retry';
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
  requestPayload: Record<string, any>;
  responsePayload?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: 'Item' | 'Classification' | 'Rule' | 'User' | 'Branch' | 'SAP_Sync' | 'Security';
  entityId: string;
  organizationId: string;
  branchId?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details: string;
  beforeSnapshot?: any;
  afterSnapshot?: any;
}

export interface SystemSecuritySettings {
  isTwoFactorEmailEnabled: boolean;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  accountLockoutAttempts: number;
  requireSpecialChar: boolean;
  ipRestrictionsEnabled: boolean;
  auditTrailStrictRetentionDays: number;
  sapEnvironment: 'HANA_PROD' | 'HANA_UAT' | 'HANA_DEV';
  sapServiceLayerUrl: string;
  sapCompanyDb: string;
}
