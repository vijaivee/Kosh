import { User, GlobalItem, ApprovalMatrixRule, HierarchyLevel } from '../types';
import { hasPermission, canUserAccessBranch } from './authAndRbac';

export interface ApprovalEvaluationResult {
  allowed: boolean;
  reason: string;
  matchType?: 'DIRECT_MANAGER' | 'PLANT_HIERARCHY' | 'CATEGORY_SPECIALIST' | 'CORPORATE_ADMIN' | 'RULE_MATCH' | 'BLOCKED';
  maker?: User;
  makerReportingChain: User[];
  applicableRule: ApprovalMatrixRule;
  userLevel: HierarchyLevel;
  requiredLevel: HierarchyLevel;
  isSelfCreated: boolean;
  branchAccessValid: boolean;
  categoryAuthorized: boolean;
}

/**
 * Returns the linear ascending hierarchy chain of managers for a given user.
 * e.g. [Direct Supervisor, Plant Quality Manager, Corporate Head]
 */
export function getReportingChain(userId: string, users: User[]): User[] {
  const chain: User[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined = userId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const currentUser = users.find((u) => u.id === currentId);
    if (!currentUser || !currentUser.managerId) break;

    const manager = users.find((u) => u.id === currentUser.managerId);
    if (manager) {
      chain.push(manager);
      currentId = manager.id;
    } else {
      break;
    }
  }

  return chain;
}

/**
 * Validates whether potentialSuperior is in the direct upward reporting chain of maker.
 */
export function isUserInReportingChain(potentialSuperiorId: string, makerId: string, users: User[]): boolean {
  const chain = getReportingChain(makerId, users);
  return chain.some((u) => u.id === potentialSuperiorId);
}

/**
 * Evaluates whether an employee has authorized category approval jurisdiction.
 */
export function isCategoryAuthorized(user: User, categoryCode: string): boolean {
  if (user.role === 'ORG_ADMIN' || user.role === 'PLATFORM_ADMIN') {
    return true;
  }
  const authorized = user.authorizedCategoryCodes || [];
  if (authorized.includes('*') || authorized.includes(categoryCode)) {
    return true;
  }
  return false;
}

/**
 * Determines the effective hierarchy level of a user (defaults based on role if unassigned).
 */
export function getUserHierarchyLevel(user: User): HierarchyLevel {
  if (user.hierarchyLevel) return user.hierarchyLevel;
  if (user.role === 'ORG_ADMIN' || user.role === 'PLATFORM_ADMIN' || user.role === 'GLOBAL_ITEM_ADMIN') return 4;
  if (user.role === 'ITEM_APPROVER' || user.role === 'MASTER_DATA_AUDITOR') return 3;
  if (user.role === 'BRANCH_COORDINATOR') return 2;
  return 1;
}

/**
 * Finds the highest-priority matching approval matrix rule for an item and maker.
 */
export function getApplicableApprovalRule(
  item: GlobalItem,
  maker: User | undefined,
  rules: ApprovalMatrixRule[]
): ApprovalMatrixRule {
  const activeRules = [...rules]
    .filter((r) => r.isActive)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of activeRules) {
    // 1. Branch match
    const branchMatch = rule.branchId === 'ALL' || rule.branchId === item.originBranchId;
    if (!branchMatch) continue;

    // 2. Category match
    const categoryMatch = rule.categoryCode === 'ALL' || rule.categoryCode === item.categoryCode;
    if (!categoryMatch) continue;

    // 3. Maker hierarchy level match (if specified)
    if (rule.makerHierarchyLevel && maker) {
      const makerLevel = getUserHierarchyLevel(maker);
      if (makerLevel !== rule.makerHierarchyLevel) continue;
    }

    return rule;
  }

  // Standard fallback rule
  return {
    id: 'rule-mat-default',
    name: 'Standard Plant Hierarchy Governance',
    branchId: 'ALL',
    categoryCode: 'ALL',
    requiredApproverLevel: 2,
    requiresDirectManager: false,
    requiresCategorySpecialist: false,
    description: 'Standard plant item creations require review by Level 2+ Supervisor or Level 3+ Plant Manager.',
    isActive: true,
    priority: 0,
  };
}

/**
 * Comprehensive enterprise approval evaluation considering:
 * 1. Role capability (item.approve)
 * 2. Maker-Checker non-self-approval rule
 * 3. Branch/Plant access scope
 * 4. Item state (Submitted / Under Review)
 * 5. Maker Employee Hierarchy (Direct Manager vs Plant Escalation)
 * 6. Minimum required Hierarchy Level per Approval Matrix
 * 7. Category / Classification Master approval jurisdiction
 */
export function evaluateApprovalAuthority(
  user: User,
  item: GlobalItem,
  users: User[],
  rules: ApprovalMatrixRule[]
): ApprovalEvaluationResult {
  const userLevel = getUserHierarchyLevel(user);
  const maker = users.find((u) => u.id === item.createdBy);
  const makerReportingChain = maker ? getReportingChain(maker.id, users) : [];
  const applicableRule = getApplicableApprovalRule(item, maker, rules);
  const isSelfCreated = item.createdBy === user.id;
  const branchAccessValid = canUserAccessBranch(user, item.originBranchId);
  const categoryAuthorized = isCategoryAuthorized(user, item.categoryCode);

  // 1. Strict Maker-Checker Rule
  if (isSelfCreated) {
    return {
      allowed: false,
      reason: 'Maker-Checker policy violation: You created this item request. Independent checker review is mandatory.',
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: true,
      branchAccessValid,
      categoryAuthorized,
      matchType: 'BLOCKED',
    };
  }

  // 2. Basic Role Permission
  if (!hasPermission(user.role, 'item.approve')) {
    return {
      allowed: false,
      reason: `User role "${user.role}" does not have approval authority (item.approve permission required).`,
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: false,
      branchAccessValid,
      categoryAuthorized,
      matchType: 'BLOCKED',
    };
  }

  // 3. Item State
  if (item.status !== 'Submitted' && item.status !== 'Under Review') {
    return {
      allowed: false,
      reason: `Cannot approve item in status "${item.status}". Item must be in "Submitted" or "Under Review" state.`,
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: false,
      branchAccessValid,
      categoryAuthorized,
      matchType: 'BLOCKED',
    };
  }

  // 4. Plant / Branch Isolation
  if (!branchAccessValid) {
    return {
      allowed: false,
      reason: `Branch jurisdiction mismatch: You do not have approval authority for the item's plant (${item.originBranchId}).`,
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: false,
      branchAccessValid: false,
      categoryAuthorized,
      matchType: 'BLOCKED',
    };
  }

  // 5. Corporate Executive Override (Level 4 Org Admin / Global Item Admin)
  if (userLevel >= 4 && (user.role === 'ORG_ADMIN' || user.role === 'PLATFORM_ADMIN' || user.role === 'GLOBAL_ITEM_ADMIN')) {
    return {
      allowed: true,
      reason: `Approved via Corporate Executive Oversight (Level ${userLevel} - ${user.designation || user.role}).`,
      matchType: 'CORPORATE_ADMIN',
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: false,
      branchAccessValid: true,
      categoryAuthorized: true,
    };
  }

  // 6. Hierarchy Level Check against Matrix Rule
  if (userLevel < applicableRule.requiredApproverLevel) {
    return {
      allowed: false,
      reason: `Hierarchy level insufficient: Rule "${applicableRule.name}" requires Level ${applicableRule.requiredApproverLevel}+ (${applicableRule.requiredApproverLevel === 3 ? 'Plant Manager / Quality Head' : 'Section Lead'}), but your level is Level ${userLevel} (${user.designation || 'Staff'}).`,
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: false,
      branchAccessValid: true,
      categoryAuthorized,
      matchType: 'BLOCKED',
    };
  }

  // 7. Category Specialist Requirement
  if (applicableRule.requiresCategorySpecialist && !categoryAuthorized) {
    return {
      allowed: false,
      reason: `Classification authority required: Rule "${applicableRule.name}" requires certified approval authority for category "${item.categoryCode}".`,
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: false,
      branchAccessValid: true,
      categoryAuthorized: false,
      matchType: 'BLOCKED',
    };
  }

  // 8. Direct Reporting Manager Requirement
  if (applicableRule.requiresDirectManager) {
    const isDirectManager = maker ? isUserInReportingChain(user.id, maker.id, users) : false;
    const isPlantHead = userLevel >= 3; // Level 3 Plant Managers possess plant escalation authority

    if (!isDirectManager && !isPlantHead) {
      return {
        allowed: false,
        reason: `Employee hierarchy violation: Item must be approved by Maker's direct reporting supervisor (${maker?.managerId ? 'designated manager' : 'supervisor'}) or Plant Manager (Level 3+).`,
        applicableRule,
        maker,
        makerReportingChain,
        userLevel,
        requiredLevel: applicableRule.requiredApproverLevel,
        isSelfCreated: false,
        branchAccessValid: true,
        categoryAuthorized,
        matchType: 'BLOCKED',
      };
    }

    if (isDirectManager) {
      return {
        allowed: true,
        reason: `Authorized as Maker's direct reporting manager (${user.displayName}, Level ${userLevel}).`,
        matchType: 'DIRECT_MANAGER',
        applicableRule,
        maker,
        makerReportingChain,
        userLevel,
        requiredLevel: applicableRule.requiredApproverLevel,
        isSelfCreated: false,
        branchAccessValid: true,
        categoryAuthorized,
      };
    }

    return {
      allowed: true,
      reason: `Authorized via Plant Management escalation authority (Level ${userLevel} - ${user.designation || 'Plant Manager'}).`,
      matchType: 'PLANT_HIERARCHY',
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: false,
      branchAccessValid: true,
      categoryAuthorized,
    };
  }

  // 9. Specific Category Specialist match
  if (applicableRule.requiresCategorySpecialist) {
    return {
      allowed: true,
      reason: `Authorized as certified Category Specialist for "${item.categoryCode}" (${user.displayName}, Level ${userLevel}).`,
      matchType: 'CATEGORY_SPECIALIST',
      applicableRule,
      maker,
      makerReportingChain,
      userLevel,
      requiredLevel: applicableRule.requiredApproverLevel,
      isSelfCreated: false,
      branchAccessValid: true,
      categoryAuthorized: true,
    };
  }

  // 10. General Rule Match
  return {
    allowed: true,
    reason: `Authorized under Rule "${applicableRule.name}" (Level ${userLevel} >= required Level ${applicableRule.requiredApproverLevel}).`,
    matchType: 'RULE_MATCH',
    applicableRule,
    maker,
    makerReportingChain,
    userLevel,
    requiredLevel: applicableRule.requiredApproverLevel,
    isSelfCreated: false,
    branchAccessValid: true,
    categoryAuthorized,
  };
}
