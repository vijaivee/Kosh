import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStateTransition } from './stateMachine';

test('Workflow State Machine - allows standard flow Draft -> Submitted -> Approved -> SAP Pending -> SAP Created', () => {
  let step1 = validateStateTransition('Draft', 'Submitted');
  assert.equal(step1.isValid, true);

  let step2 = validateStateTransition('Submitted', 'Approved');
  assert.equal(step2.isValid, true);

  let step3 = validateStateTransition('Approved', 'SAP Pending');
  assert.equal(step3.isValid, true);

  let step4 = validateStateTransition('SAP Pending', 'SAP Created');
  assert.equal(step4.isValid, true);
});

test('Workflow State Machine - rejects illegal leap from Draft directly to Approved or SAP Created', () => {
  let illegalJump1 = validateStateTransition('Draft', 'Approved');
  assert.equal(illegalJump1.isValid, false);
  assert.ok(illegalJump1.error?.includes('Illegal state transition'));

  let illegalJump2 = validateStateTransition('Draft', 'SAP Created');
  assert.equal(illegalJump2.isValid, false);
});

test('Workflow State Machine - requires mandatory reason for Return or Rejection', () => {
  let returnNoReason = validateStateTransition('Submitted', 'Returned for Correction');
  assert.equal(returnNoReason.isValid, false);
  assert.ok(returnNoReason.error?.includes('detailed comment/reason'));

  let returnWithReason = validateStateTransition('Submitted', 'Returned for Correction', 'Check colour code');
  assert.equal(returnWithReason.isValid, true);
});

test('Workflow State Machine - handles SAP failure and retry loop', () => {
  let failed = validateStateTransition('SAP Pending', 'SAP Failed');
  assert.equal(failed.isValid, true);

  let retryPending = validateStateTransition('SAP Failed', 'Retry Pending');
  assert.equal(retryPending.isValid, true);

  let sapPending = validateStateTransition('Retry Pending', 'SAP Pending');
  assert.equal(sapPending.isValid, true);
});
