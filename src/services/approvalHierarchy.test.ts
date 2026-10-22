import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getReportingChain,
  isUserInReportingChain,
  isCategoryAuthorized,
  getApplicableApprovalRule,
  evaluateApprovalAuthority,
} from './approvalHierarchy';
import { User, GlobalItem, ApprovalMatrixRule } from '../types';

// Mock test users representing realistic employee hierarchy
const mockMakerVijay: User = {
  id: 'usr-creator-02',
  organizationId: 'org-kosh-01',
  email: 'creator@koshinnovations.com',
  displayName: 'Vijay Kumar',
  employeeId: 'KOSH-EMP-108',
  role: 'ITEM_CREATOR',
  hierarchyLevel: 1,
  designation: 'Tooling Design Engineer',
  department: 'Tooling & Moulding Design',
  managerId: 'usr-lead-07',
  assignedBranchIds: ['br-pon-01'],
  defaultBranchId: 'br-pon-01',
  isTwoFactorEnabled: false,
  isActive: true,
  authorizedCategoryCodes: [],
};

const mockSupervisorSuresh: User = {
  id: 'usr-lead-07',
  organizationId: 'org-kosh-01',
  email: 'lead.moulding@koshinnovations.com',
  displayName: 'Suresh Balan',
  employeeId: 'KOSH-EMP-062',
  role: 'ITEM_APPROVER',
  hierarchyLevel: 2,
  designation: 'Shift Production Supervisor',
  department: 'Injection Moulding Production',
  managerId: 'usr-approver-03',
  assignedBranchIds: ['br-pon-01'],
  defaultBranchId: 'br-pon-01',
  isTwoFactorEnabled: true,
  isActive: true,
  authorizedCategoryCodes: ['MA', 'BO', 'SF', 'RM'],
};

const mockPlantManagerArun: User = {
  id: 'usr-approver-03',
  organizationId: 'org-kosh-01',
  email: 'approver@koshinnovations.com',
  displayName: 'Arunachalam S',
  employeeId: 'KOSH-EMP-045',
  role: 'ITEM_APPROVER',
  hierarchyLevel: 3,
  designation: 'Plant Quality & Operations Head',
  department: 'Quality Assurance & Plant Operations',
  managerId: 'usr-admin-01',
  assignedBranchIds: ['br-pon-01', 'br-che-02'],
  defaultBranchId: 'br-pon-01',
  isTwoFactorEnabled: true,
  isActive: true,
  authorizedCategoryCodes: ['*'],
};

const mockPuneManagerVikram: User = {
  id: 'usr-mgr-pune-09',
  organizationId: 'org-kosh-01',
  email: 'mgr.pune@koshinnovations.com',
  displayName: 'Vikram Deshmukh',
  employeeId: 'KOSH-EMP-031',
  role: 'ITEM_APPROVER',
  hierarchyLevel: 3,
  designation: 'Plant General Manager - Pune',
  department: 'Plant Operations',
  managerId: 'usr-admin-01',
  assignedBranchIds: ['br-pun-03'],
  defaultBranchId: 'br-pun-03',
  isTwoFactorEnabled: true,
  isActive: true,
  authorizedCategoryCodes: ['*'],
};

const mockCorporateAdminRajesh: User = {
  id: 'usr-admin-01',
  organizationId: 'org-kosh-01',
  email: 'admin@koshinnovations.com',
  displayName: 'Rajesh Sharma',
  employeeId: 'KOSH-EMP-001',
  role: 'ORG_ADMIN',
  hierarchyLevel: 4,
  designation: 'VP Global Operations & MDM',
  department: 'Corporate Master Data',
  managerId: undefined,
  assignedBranchIds: ['br-pon-01', 'br-che-02', 'br-pun-03', 'br-guj-04', 'br-blr-05'],
  defaultBranchId: 'br-pon-01',
  isTwoFactorEnabled: true,
  isActive: true,
  authorizedCategoryCodes: ['*'],
};

const testUsers: User[] = [
  mockMakerVijay,
  mockSupervisorSuresh,
  mockPlantManagerArun,
  mockPuneManagerVikram,
  mockCorporateAdminRajesh,
];

const mockRules: ApprovalMatrixRule[] = [
  {
    id: 'rule-mat-fg-01',
    name: 'Finished Goods (FG) Plant Executive Gate',
    branchId: 'ALL',
    categoryCode: 'FG',
    requiredApproverLevel: 3,
    requiresDirectManager: false,
    requiresCategorySpecialist: false,
    description: 'Finished Goods require Level 3 Plant Manager sign-off.',
    isActive: true,
    priority: 100,
  },
  {
    id: 'rule-mat-rm-02',
    name: 'Raw Materials (RM) Chemical & Polymer Specialist Gate',
    branchId: 'ALL',
    categoryCode: 'RM',
    requiredApproverLevel: 2,
    requiresDirectManager: false,
    requiresCategorySpecialist: true,
    description: 'Raw Materials require certified RM specialist.',
    isActive: true,
    priority: 90,
  },
  {
    id: 'rule-mat-std-04',
    name: 'Maker-Supervisor Reporting Line Hierarchy (Standard Items)',
    branchId: 'ALL',
    categoryCode: 'ALL',
    requiredApproverLevel: 2,
    requiresDirectManager: true,
    requiresCategorySpecialist: false,
    description: 'Standard plant item creations must be approved by Maker\'s direct reporting manager or Plant Manager.',
    isActive: true,
    priority: 10,
  },
];

// Test items
const standardItemVijay: GlobalItem = {
  id: 'item-std-01',
  organizationId: 'org-kosh-01',
  originBranchId: 'br-pon-01',
  itemCode: 'SFSSASHSB0001',
  isCodeProvisional: false,
  itemDescription: 'Standard Semi-Finished Bracket',
  categoryCode: 'SF',
  materialCode: 'SS',
  typeCode: 'A',
  status: 'Submitted',
  version: 1,
  codeRuleVersionId: 'rule-code-default',
  descriptionRuleVersionId: 'rule-desc-default',
  createdBy: 'usr-creator-02',
  createdByName: 'Vijay Kumar',
  createdByEmail: 'creator@koshinnovations.com',
  createdAt: '2026-10-22 09:00:00',
  updatedAt: '2026-10-22 09:00:00',
  approvalHistory: [],
  branchAvailability: [],
  sapSyncStatus: 'Not Synced',
};

const finishedGoodsItemVijay: GlobalItem = {
  ...standardItemVijay,
  id: 'item-fg-01',
  itemCode: 'FGHDMCRGY0002',
  itemDescription: 'High Pressure Hose Assembly - Finished Goods',
  categoryCode: 'FG',
};

const rawMaterialItemVijay: GlobalItem = {
  ...standardItemVijay,
  id: 'item-rm-01',
  itemCode: 'RMPPOPLNT0003',
  itemDescription: 'Polypropylene Pellets Raw Material',
  categoryCode: 'RM',
};

test('Hierarchy Chain - correctly walks up reporting lines', () => {
  const chain = getReportingChain(mockMakerVijay.id, testUsers);
  assert.equal(chain.length, 3);
  assert.equal(chain[0].id, mockSupervisorSuresh.id); // Direct Manager
  assert.equal(chain[1].id, mockPlantManagerArun.id); // Plant Head
  assert.equal(chain[2].id, mockCorporateAdminRajesh.id); // Corporate VP

  assert.equal(isUserInReportingChain(mockSupervisorSuresh.id, mockMakerVijay.id, testUsers), true);
  assert.equal(isUserInReportingChain(mockPlantManagerArun.id, mockMakerVijay.id, testUsers), true);
  assert.equal(isUserInReportingChain(mockPuneManagerVikram.id, mockMakerVijay.id, testUsers), false);
});

test('Maker-Checker Anti-Self-Approval - Maker cannot approve own submission even if role permitted', () => {
  const result = evaluateApprovalAuthority(mockMakerVijay, standardItemVijay, testUsers, mockRules);
  assert.equal(result.allowed, false);
  assert.equal(result.isSelfCreated, true);
  assert.ok(result.reason.includes('Maker-Checker'));
});

test('Employee Reporting Hierarchy - Direct Supervisor can approve standard item created by subordinate', () => {
  const result = evaluateApprovalAuthority(mockSupervisorSuresh, standardItemVijay, testUsers, mockRules);
  assert.equal(result.allowed, true);
  assert.equal(result.matchType, 'DIRECT_MANAGER');
  assert.ok(result.reason.includes("Maker's direct reporting manager"));
});

test('Category-Based Approval Gate - Finished Goods (FG) requires Level 3 Plant Manager; Level 2 Supervisor is blocked', () => {
  // Supervisor Suresh is Level 2 -> Blocked for FG because FG requires Level 3
  const supervisorResult = evaluateApprovalAuthority(mockSupervisorSuresh, finishedGoodsItemVijay, testUsers, mockRules);
  assert.equal(supervisorResult.allowed, false);
  assert.ok(supervisorResult.reason.includes('Hierarchy level insufficient'));

  // Plant Manager Arun is Level 3 -> Approved!
  const plantMgrResult = evaluateApprovalAuthority(mockPlantManagerArun, finishedGoodsItemVijay, testUsers, mockRules);
  assert.equal(plantMgrResult.allowed, true);
  assert.equal(plantMgrResult.userLevel >= 3, true);
});

test('Classification Master Authorization - Category Specialist authority required for Raw Materials', () => {
  // Suresh has authorizedCategoryCodes including 'RM' -> can approve
  const sureshRmResult = evaluateApprovalAuthority(mockSupervisorSuresh, rawMaterialItemVijay, testUsers, mockRules);
  assert.equal(sureshRmResult.allowed, true);
  assert.equal(sureshRmResult.matchType, 'CATEGORY_SPECIALIST');

  // If a Level 2 user has NO 'RM' authorization, they are blocked
  const nonRmSupervisor: User = {
    ...mockSupervisorSuresh,
    id: 'usr-non-rm-supervisor',
    authorizedCategoryCodes: ['MA', 'BO'], // no RM
  };
  const blockedResult = evaluateApprovalAuthority(nonRmSupervisor, rawMaterialItemVijay, testUsers, mockRules);
  assert.equal(blockedResult.allowed, false);
  assert.ok(blockedResult.reason.includes('Classification authority required'));
});

test('Branch Plant Isolation - Pune Plant Manager cannot approve Pondicherry items without branch assignment', () => {
  const result = evaluateApprovalAuthority(mockPuneManagerVikram, standardItemVijay, testUsers, mockRules);
  assert.equal(result.allowed, false);
  assert.equal(result.branchAccessValid, false);
  assert.ok(result.reason.includes('Branch jurisdiction mismatch'));
});

test('Corporate Executive Oversight - Org Admin Level 4 can approve across all branches', () => {
  const result = evaluateApprovalAuthority(mockCorporateAdminRajesh, finishedGoodsItemVijay, testUsers, mockRules);
  assert.equal(result.allowed, true);
  assert.equal(result.matchType, 'CORPORATE_ADMIN');
  assert.ok(result.reason.includes('Corporate Executive Oversight'));
});
