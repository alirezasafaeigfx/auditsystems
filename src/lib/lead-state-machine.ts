import { LeadStatus } from "@prisma/client";

export const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.QUALIFIED, LeadStatus.LOST],
  [LeadStatus.QUALIFIED]: [LeadStatus.AUDIT_STARTED, LeadStatus.LOST],
  [LeadStatus.AUDIT_STARTED]: [LeadStatus.REPORT_READY, LeadStatus.LOST],
  [LeadStatus.REPORT_READY]: [LeadStatus.DELIVERED, LeadStatus.LOST],
  [LeadStatus.DELIVERED]: [LeadStatus.CONVERTED, LeadStatus.LOST],
  [LeadStatus.CONVERTED]: [],
  [LeadStatus.LOST]: [],
};

export function isTerminalStatus(status: LeadStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from].includes(to);
}

export function validateTransition(from: LeadStatus, to: LeadStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
}

export function getAllowedTransitions(status: LeadStatus): LeadStatus[] {
  return VALID_TRANSITIONS[status];
}
