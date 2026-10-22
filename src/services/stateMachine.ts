import { ItemStatus } from '../types';

export interface StateTransitionResult {
  isValid: boolean;
  error?: string;
  nextStatus?: ItemStatus;
}

const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  Draft: ['Submitted', 'Cancelled'],
  Submitted: ['Under Review', 'Approved', 'Returned for Correction', 'Rejected'],
  'Under Review': ['Approved', 'Returned for Correction', 'Rejected'],
  'Returned for Correction': ['Draft', 'Submitted'],
  Rejected: [], // Terminal unless special appeal is initiated
  Approved: ['SAP Pending', 'Cancelled'],
  'SAP Pending': ['SAP Created', 'SAP Failed'],
  'SAP Created': [], // Finalized in SAP B1
  'SAP Failed': ['Retry Pending'],
  'Retry Pending': ['SAP Pending'],
  Cancelled: [],
};

/**
 * Validates whether an item can transition from currentStatus to desiredStatus
 */
export function validateStateTransition(
  currentStatus: ItemStatus,
  desiredStatus: ItemStatus,
  actionReason?: string
): StateTransitionResult {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(desiredStatus)) {
    return {
      isValid: false,
      error: `Illegal state transition from "${currentStatus}" to "${desiredStatus}". Allowed transitions are: ${allowed.join(', ') || 'None (Terminal state)'}.`,
    };
  }

  // Mandatory reason required for Return or Rejection
  if ((desiredStatus === 'Returned for Correction' || desiredStatus === 'Rejected') && (!actionReason || actionReason.trim().length < 5)) {
    return {
      isValid: false,
      error: `A detailed comment/reason (at least 5 characters) is required when rejecting or returning an item request.`,
    };
  }

  return {
    isValid: true,
    nextStatus: desiredStatus,
  };
}
