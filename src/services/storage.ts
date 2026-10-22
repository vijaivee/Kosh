import {
  GlobalItem,
  ClassificationRecord,
  ItemCodeRule,
  ItemDescriptionRule,
  Branch,
  User,
  AuditEvent,
  SapIntegrationJob,
  SystemSecuritySettings,
} from '../types';
import {
  INITIAL_ORGANIZATION,
  INITIAL_BRANCHES,
  INITIAL_USERS,
  SEED_CLASSIFICATIONS,
  INITIAL_ITEM_CODE_RULES,
  INITIAL_DESCRIPTION_RULES,
  INITIAL_GLOBAL_ITEMS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_SECURITY_SETTINGS,
  INITIAL_APPROVAL_MATRIX_RULES,
} from '../data/seedData';
import { ApprovalMatrixRule } from '../types';

const STORAGE_KEYS = {
  ITEMS: 'kosh_item_master_items',
  CLASSIFICATIONS: 'kosh_item_master_classifications',
  CODE_RULES: 'kosh_item_master_code_rules',
  DESC_RULES: 'kosh_item_master_desc_rules',
  BRANCHES: 'kosh_item_master_branches',
  USERS: 'kosh_item_master_users',
  CURRENT_USER_ID: 'kosh_current_user_id',
  ACTIVE_BRANCH_ID: 'kosh_active_branch_id',
  AUDIT_LOGS: 'kosh_audit_logs',
  SAP_JOBS: 'kosh_sap_jobs',
  SECURITY: 'kosh_security_settings',
  APPROVAL_RULES: 'kosh_item_master_approval_matrix_rules',
};

class MasterDataStore {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initIfEmpty();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public initIfEmpty(forceReset: boolean = false) {
    if (forceReset || !localStorage.getItem(STORAGE_KEYS.ITEMS)) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_GLOBAL_ITEMS));
      localStorage.setItem(STORAGE_KEYS.CLASSIFICATIONS, JSON.stringify(SEED_CLASSIFICATIONS));
      localStorage.setItem(STORAGE_KEYS.CODE_RULES, JSON.stringify(INITIAL_ITEM_CODE_RULES));
      localStorage.setItem(STORAGE_KEYS.DESC_RULES, JSON.stringify(INITIAL_DESCRIPTION_RULES));
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(INITIAL_BRANCHES));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'usr-admin-01'); // Default to Org Admin
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH_ID, 'br-pon-01');
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
      localStorage.setItem(STORAGE_KEYS.SAP_JOBS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(INITIAL_SYSTEM_SECURITY_SETTINGS));
      localStorage.setItem(STORAGE_KEYS.APPROVAL_RULES, JSON.stringify(INITIAL_APPROVAL_MATRIX_RULES));
      this.notify();
    } else {
      // Ensure Approval Rules are seeded if previously missing
      if (!localStorage.getItem(STORAGE_KEYS.APPROVAL_RULES)) {
        localStorage.setItem(STORAGE_KEYS.APPROVAL_RULES, JSON.stringify(INITIAL_APPROVAL_MATRIX_RULES));
      }
      // Reconcile user hierarchy fields if stored users lack hierarchyLevel
      const storedUsersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (storedUsersRaw) {
        try {
          const storedUsers: User[] = JSON.parse(storedUsersRaw);
          const needsMigration = storedUsers.some((u) => u.hierarchyLevel === undefined) || storedUsers.length < INITIAL_USERS.length;
          if (needsMigration) {
            const merged = INITIAL_USERS.map((initU) => {
              const existing = storedUsers.find((u) => u.id === initU.id);
              if (existing) {
                return {
                  ...initU,
                  ...existing,
                  hierarchyLevel: existing.hierarchyLevel || initU.hierarchyLevel,
                  designation: existing.designation || initU.designation,
                  department: existing.department || initU.department,
                  managerId: existing.managerId !== undefined ? existing.managerId : initU.managerId,
                  authorizedCategoryCodes: existing.authorizedCategoryCodes || initU.authorizedCategoryCodes,
                };
              }
              return initU;
            });
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged));
          }
        } catch {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        }
      }
    }
  }

  // --- Users & Session ---
  public getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : INITIAL_USERS;
  }

  public getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'usr-admin-01';
    return users.find((u) => u.id === currentId) || users[0];
  }

  public setCurrentUser(userId: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    const user = this.getCurrentUser();
    // Reconcile active branch with user assigned branches
    if (!user.assignedBranchIds.includes(this.getActiveBranchId()) && user.assignedBranchIds.length > 0) {
      this.setActiveBranchId(user.defaultBranchId || user.assignedBranchIds[0]);
    }
    this.addAuditLog({
      action: 'USER_SWITCH',
      entityType: 'User',
      entityId: userId,
      outcome: 'SUCCESS',
      details: `Switched active authenticated user to ${user.displayName} (${user.role}).`,
    });
    this.notify();
  }

  public updateUser(userId: string, updates: Partial<User>): User {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      throw new Error(`User ${userId} not found`);
    }
    const updatedUser = { ...users[index], ...updates };
    users[index] = updatedUser;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.addAuditLog({
      action: 'USER_HIERARCHY_UPDATE',
      entityType: 'User',
      entityId: userId,
      outcome: 'SUCCESS',
      details: `Updated employee hierarchy & permissions for ${updatedUser.displayName} (Level ${updatedUser.hierarchyLevel || 1}, Manager: ${updatedUser.managerId || 'None'}).`,
    });
    this.notify();
    return updatedUser;
  }

  // --- Approval Matrix Rules ---
  public getApprovalMatrixRules(): ApprovalMatrixRule[] {
    const raw = localStorage.getItem(STORAGE_KEYS.APPROVAL_RULES);
    return raw ? JSON.parse(raw) : INITIAL_APPROVAL_MATRIX_RULES;
  }

  public saveApprovalMatrixRule(rule: ApprovalMatrixRule): void {
    const rules = this.getApprovalMatrixRules();
    const index = rules.findIndex((r) => r.id === rule.id);
    if (index >= 0) {
      rules[index] = rule;
    } else {
      rules.unshift(rule);
    }
    localStorage.setItem(STORAGE_KEYS.APPROVAL_RULES, JSON.stringify(rules));
    this.addAuditLog({
      action: 'APPROVAL_MATRIX_RULE_SAVE',
      entityType: 'Rule',
      entityId: rule.id,
      outcome: 'SUCCESS',
      details: `Saved approval matrix rule "${rule.name}" for Category ${rule.categoryCode} (Required Level: ${rule.requiredApproverLevel}).`,
    });
    this.notify();
  }

  public deleteApprovalMatrixRule(ruleId: string): void {
    const rules = this.getApprovalMatrixRules().filter((r) => r.id !== ruleId);
    localStorage.setItem(STORAGE_KEYS.APPROVAL_RULES, JSON.stringify(rules));
    this.addAuditLog({
      action: 'APPROVAL_MATRIX_RULE_DELETE',
      entityType: 'Rule',
      entityId: ruleId,
      outcome: 'SUCCESS',
      details: `Deleted approval matrix rule "${ruleId}".`,
    });
    this.notify();
  }

  // --- Branches ---
  public getBranches(): Branch[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    return raw ? JSON.parse(raw) : INITIAL_BRANCHES;
  }

  public getActiveBranchId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_BRANCH_ID) || 'br-pon-01';
  }

  public setActiveBranchId(branchId: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH_ID, branchId);
    this.notify();
  }

  // --- Items ---
  public getItems(): GlobalItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    return raw ? JSON.parse(raw) : INITIAL_GLOBAL_ITEMS;
  }

  public getItemById(id: string): GlobalItem | undefined {
    return this.getItems().find((item) => item.id === id);
  }

  public saveItem(item: GlobalItem, auditAction: string = 'ITEM_SAVE'): GlobalItem {
    const items = this.getItems();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    const updated = {
      ...item,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (existingIndex >= 0) {
      items[existingIndex] = updated;
    } else {
      items.unshift(updated);
    }

    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    this.addAuditLog({
      action: auditAction,
      entityType: 'Item',
      entityId: item.id,
      branchId: item.originBranchId,
      outcome: 'SUCCESS',
      details: `Item "${item.itemCode}" (${item.itemDescription}) status: ${item.status}.`,
    });
    this.notify();
    return updated;
  }

  // Atomic sequence counter
  public getNextSequenceNumber(categoryCode: string): number {
    const items = this.getItems();
    // Filter matching category
    const count = items.filter((i) => i.categoryCode === categoryCode).length;
    return count + 1;
  }

  // --- Classification Masters ---
  public getClassifications(): ClassificationRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSIFICATIONS);
    return raw ? JSON.parse(raw) : SEED_CLASSIFICATIONS;
  }

  public getClassificationsByDimension(dimension: ClassificationRecord['dimension']): ClassificationRecord[] {
    return this.getClassifications().filter((c) => c.dimension === dimension && c.isActive);
  }

  public saveClassification(record: ClassificationRecord) {
    const list = this.getClassifications();
    const idx = list.findIndex((c) => c.id === record.id);
    const updated = {
      ...record,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }

    localStorage.setItem(STORAGE_KEYS.CLASSIFICATIONS, JSON.stringify(list));
    this.addAuditLog({
      action: idx >= 0 ? 'CLASSIFICATION_UPDATE' : 'CLASSIFICATION_CREATE',
      entityType: 'Classification',
      entityId: record.id,
      outcome: 'SUCCESS',
      details: `Saved classification ${record.dimension}: ${record.code} - ${record.name}.`,
    });
    this.notify();
  }

  // --- Rules ---
  public getCodeRules(): ItemCodeRule[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CODE_RULES);
    return raw ? JSON.parse(raw) : INITIAL_ITEM_CODE_RULES;
  }

  public saveCodeRule(rule: ItemCodeRule) {
    const rules = this.getCodeRules();
    const idx = rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      rules[idx] = rule;
    } else {
      rules.push(rule);
    }
    localStorage.setItem(STORAGE_KEYS.CODE_RULES, JSON.stringify(rules));
    this.addAuditLog({
      action: 'CODE_RULE_UPDATE',
      entityType: 'Rule',
      entityId: rule.id,
      outcome: 'SUCCESS',
      details: `Saved code rule "${rule.name}" version ${rule.version}.`,
    });
    this.notify();
  }

  public getDescriptionRules(): ItemDescriptionRule[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DESC_RULES);
    return raw ? JSON.parse(raw) : INITIAL_DESCRIPTION_RULES;
  }

  public saveDescriptionRule(rule: ItemDescriptionRule) {
    const rules = this.getDescriptionRules();
    const idx = rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      rules[idx] = rule;
    } else {
      rules.push(rule);
    }
    localStorage.setItem(STORAGE_KEYS.DESC_RULES, JSON.stringify(rules));
    this.addAuditLog({
      action: 'DESC_RULE_UPDATE',
      entityType: 'Rule',
      entityId: rule.id,
      outcome: 'SUCCESS',
      details: `Saved description rule for ${rule.categoryCode} version ${rule.version}.`,
    });
    this.notify();
  }

  // --- SAP Jobs ---
  public getSapJobs(): SapIntegrationJob[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SAP_JOBS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveSapJob(job: SapIntegrationJob) {
    const jobs = this.getSapJobs();
    const idx = jobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      jobs[idx] = job;
    } else {
      jobs.unshift(job);
    }
    localStorage.setItem(STORAGE_KEYS.SAP_JOBS, JSON.stringify(jobs));
    this.notify();
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditEvent[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : INITIAL_AUDIT_LOGS;
  }

  public addAuditLog(event: Omit<AuditEvent, 'id' | 'timestamp' | 'actorId' | 'actorName' | 'actorRole' | 'organizationId'>) {
    const user = this.getCurrentUser();
    const logs = this.getAuditLogs();
    const newLog: AuditEvent = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actorId: user.id,
      actorName: user.displayName,
      actorRole: user.role,
      organizationId: INITIAL_ORGANIZATION.id,
      ...event,
    };
    logs.unshift(newLog);
    // Keep last 500 logs
    const cappedLogs = logs.slice(0, 500);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(cappedLogs));
    this.notify();
  }

  // --- Security Settings ---
  public getSecuritySettings(): SystemSecuritySettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SECURITY);
    return raw ? JSON.parse(raw) : INITIAL_SYSTEM_SECURITY_SETTINGS;
  }

  public saveSecuritySettings(settings: SystemSecuritySettings) {
    localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(settings));
    this.addAuditLog({
      action: 'SECURITY_SETTINGS_UPDATE',
      entityType: 'Security',
      entityId: 'security-config',
      outcome: 'SUCCESS',
      details: `Updated security config: 2FA Email=${settings.isTwoFactorEmailEnabled}, Session Timeout=${settings.sessionTimeoutMinutes}m.`,
    });
    this.notify();
  }
}

export const masterStore = new MasterDataStore();
