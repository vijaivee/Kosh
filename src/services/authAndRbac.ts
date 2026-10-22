import { RoleName, Permission, User, GlobalItem } from '../types';

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  PLATFORM_ADMIN: [
    'item.read',
    'item.create',
    'item.update_draft',
    'item.submit',
    'item.approve',
    'item.reject',
    'item.activate_branch',
    'item.export',
    'classification.manage',
    'rule.manage',
    'rule.approve',
    'user.manage',
    'role.manage',
    'branch.manage',
    'audit.read',
    'integration.manage',
    'system.configure',
  ],
  ORG_ADMIN: [
    'item.read',
    'item.create',
    'item.update_draft',
    'item.submit',
    'item.approve',
    'item.reject',
    'item.activate_branch',
    'item.export',
    'classification.manage',
    'rule.manage',
    'rule.approve',
    'user.manage',
    'role.manage',
    'branch.manage',
    'audit.read',
    'integration.manage',
    'system.configure',
  ],
  GLOBAL_ITEM_ADMIN: [
    'item.read',
    'item.create',
    'item.update_draft',
    'item.submit',
    'item.approve',
    'item.reject',
    'item.activate_branch',
    'item.export',
    'classification.manage',
    'rule.manage',
    'rule.approve',
    'audit.read',
  ],
  ITEM_CREATOR: [
    'item.read',
    'item.create',
    'item.update_draft',
    'item.submit',
    'item.export',
  ],
  BRANCH_COORDINATOR: [
    'item.read',
    'item.create',
    'item.update_draft',
    'item.submit',
    'item.activate_branch',
    'item.export',
  ],
  ITEM_APPROVER: [
    'item.read',
    'item.approve',
    'item.reject',
    'item.activate_branch',
    'item.export',
    'audit.read',
  ],
  MASTER_DATA_AUDITOR: [
    'item.read',
    'item.export',
    'audit.read',
  ],
  INTEGRATION_SERVICE: [
    'item.read',
    'integration.manage',
  ],
  READ_ONLY_USER: [
    'item.read',
  ],
};

/**
 * Checks if a given role has a specific granular capability
 */
export function hasPermission(role: RoleName, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Validates if user has permission to view or manipulate data for a specific branch
 */
export function canUserAccessBranch(user: User, branchId: string): boolean {
  if (user.role === 'PLATFORM_ADMIN' || user.role === 'ORG_ADMIN' || user.role === 'GLOBAL_ITEM_ADMIN' || user.role === 'MASTER_DATA_AUDITOR') {
    return true; // Central enterprise roles can access all branches within the organization
  }
  return user.assignedBranchIds.includes(branchId);
}

import { evaluateApprovalAuthority } from './approvalHierarchy';
import { ApprovalMatrixRule } from '../types';

/**
 * Enforces Maker-Checker governance and Employee Hierarchy rules:
 * 1. User must possess 'item.approve' capability
 * 2. User must have access to the item's origin branch
 * 3. Crucial: The maker (creator) cannot approve their own item request!
 * 4. When users and rules are provided: validates maker employee hierarchy,
 *    branch plant management levels, and classification master authorization.
 */
export function canUserApproveItem(
  user: User,
  item: GlobalItem,
  users?: User[],
  rules?: ApprovalMatrixRule[]
): { allowed: boolean; reason?: string } {
  if (users && rules && rules.length > 0) {
    const result = evaluateApprovalAuthority(user, item, users, rules);
    return {
      allowed: result.allowed,
      reason: result.reason,
    };
  }

  if (!hasPermission(user.role, 'item.approve')) {
    return {
      allowed: false,
      reason: `User role "${user.role}" does not have approval authority (item.approve permission required).`,
    };
  }

  // Maker-Checker violation check
  if (item.createdBy === user.id) {
    return {
      allowed: false,
      reason: 'Maker-Checker policy violation: You cannot approve an item that you created. A designated independent checker must review it.',
    };
  }

  // Branch scope check
  if (!canUserAccessBranch(user, item.originBranchId)) {
    return {
      allowed: false,
      reason: `Unauthorized: You do not have branch approval authority for the item's branch (${item.originBranchId}).`,
    };
  }

  // Status check
  if (item.status !== 'Submitted' && item.status !== 'Under Review') {
    return {
      allowed: false,
      reason: `Cannot approve item in status "${item.status}". Item must be in "Submitted" or "Under Review" state.`,
    };
  }

  return { allowed: true };
}

/**
 * Checks if user is permitted to edit a draft or returned item
 */
export function canUserEditDraft(user: User, item: GlobalItem): { allowed: boolean; reason?: string } {
  if (item.status !== 'Draft' && item.status !== 'Returned for Correction') {
    return {
      allowed: false,
      reason: `Item cannot be edited while in "${item.status}" state. Only "Draft" or "Returned for Correction" items can be modified.`,
    };
  }

  if (item.createdBy !== user.id && user.role !== 'ORG_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
    return {
      allowed: false,
      reason: 'Only the item creator or an authorized administrator can edit this draft request.',
    };
  }

  return { allowed: true };
}
