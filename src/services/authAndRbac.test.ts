import test from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, canUserAccessBranch, canUserApproveItem, canUserEditDraft } from './authAndRbac';
import { User, GlobalItem } from '../types';

const creatorUser: User = {
  id: 'usr-creator-02',
  organizationId: 'org-kosh-01',
  email: 'creator@koshinnovations.com',
  displayName: 'Vijay Kumar',
  employeeId: 'KOSH-EMP-108',
  role: 'ITEM_CREATOR',
  assignedBranchIds: ['br-pon-01', 'br-che-02'],
  defaultBranchId: 'br-pon-01',
  isTwoFactorEnabled: false,
  isActive: true,
};

const approverUser: User = {
  id: 'usr-approver-03',
  organizationId: 'org-kosh-01',
  email: 'approver@koshinnovations.com',
  displayName: 'Arunachalam S',
  employeeId: 'KOSH-EMP-045',
  role: 'ITEM_APPROVER',
  assignedBranchIds: ['br-pon-01', 'br-che-02', 'br-pun-03'],
  defaultBranchId: 'br-pon-01',
  isTwoFactorEnabled: true,
  isActive: true,
};

const branchCoordUser: User = {
  id: 'usr-coord-06',
  organizationId: 'org-kosh-01',
  email: 'coord.pune@koshinnovations.com',
  displayName: 'Priya Nair',
  employeeId: 'KOSH-EMP-204',
  role: 'BRANCH_COORDINATOR',
  assignedBranchIds: ['br-pun-03'],
  defaultBranchId: 'br-pun-03',
  isTwoFactorEnabled: false,
  isActive: true,
};

const testItemCreatedByVijay: GlobalItem = {
  id: 'item-test-01',
  organizationId: 'org-kosh-01',
  originBranchId: 'br-pon-01',
  itemCode: 'FGHDMCRGY0002',
  isCodeProvisional: false,
  itemDescription: 'HDPE Hose Assembly',
  categoryCode: 'FG',
  materialCode: 'HD',
  typeCode: 'M',
  status: 'Submitted',
  version: 1,
  codeRuleVersionId: 'rule-code-default',
  descriptionRuleVersionId: 'rule-desc-fg',
  createdBy: 'usr-creator-02',
  createdByName: 'Vijay Kumar',
  createdByEmail: 'creator@koshinnovations.com',
  createdAt: '2026-10-22 09:00:00',
  updatedAt: '2026-10-22 09:05:00',
  approvalHistory: [],
  branchAvailability: [],
  sapSyncStatus: 'Not Synced',
};

test('RBAC - Item Creator cannot approve items', () => {
  assert.equal(hasPermission(creatorUser.role, 'item.approve'), false);
  assert.equal(hasPermission(creatorUser.role, 'item.create'), true);
});

test('RBAC - Approver has approve permission but cannot create classification master', () => {
  assert.equal(hasPermission(approverUser.role, 'item.approve'), true);
  assert.equal(hasPermission(approverUser.role, 'classification.manage'), false);
});

test('Multi-Branch Scope - Coordinator in Pune cannot access Pondicherry branch', () => {
  assert.equal(canUserAccessBranch(branchCoordUser, 'br-pun-03'), true);
  assert.equal(canUserAccessBranch(branchCoordUser, 'br-pon-01'), false);
});

test('Maker-Checker Security - Creator is STRICTLY FORBIDDEN from approving own item', () => {
  const result = canUserApproveItem(creatorUser, testItemCreatedByVijay);
  assert.equal(result.allowed, false);
  assert.ok(result.reason?.includes('item.approve') || result.reason?.includes('Maker-Checker'));
});

test('Maker-Checker Security - If user with approver role created the item, self-approval is rejected', () => {
  // Scenario where an approver created an item in their branch
  const itemCreatedByApprover: GlobalItem = {
    ...testItemCreatedByVijay,
    createdBy: 'usr-approver-03',
  };
  const result = canUserApproveItem(approverUser, itemCreatedByApprover);
  assert.equal(result.allowed, false);
  assert.ok(result.reason?.includes('Maker-Checker policy violation'));
});

test('Maker-Checker Security - Independent authorized checker CAN approve submitted item', () => {
  const result = canUserApproveItem(approverUser, testItemCreatedByVijay);
  assert.equal(result.allowed, true);
});

test('Draft Modification - Only creator or admin can edit draft', () => {
  const draftItem: GlobalItem = {
    ...testItemCreatedByVijay,
    status: 'Draft',
  };
  const editByCreator = canUserEditDraft(creatorUser, draftItem);
  assert.equal(editByCreator.allowed, true);

  const editByOther = canUserEditDraft(branchCoordUser, draftItem);
  assert.equal(editByOther.allowed, false);
});
