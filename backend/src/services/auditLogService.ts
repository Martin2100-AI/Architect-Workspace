import { AuditLog } from '../models/AuditLog';

/**
 * Recording an audit event is a secondary side effect of a primary user action
 * (signup, password reset). A DB hiccup writing the audit row must never fail the
 * primary action itself -- so this never throws. On failure it logs a structured
 * error (never silently swallowed) so the gap is visible to whoever monitors logs,
 * mirroring passwordResetService.ts's handling of email-send failures.
 */
export async function recordAuditEvent(auditLogModel: typeof AuditLog, userId: number, action: string): Promise<void> {
  try {
    await auditLogModel.create({ userId, action });
  } catch (err) {
    const errorClass = err instanceof Error ? err.constructor.name : 'UnknownError';
    console.error(
      JSON.stringify({ level: 'error', event: 'audit_log_write_failed', error_class: errorClass, action, userId }),
    );
  }
}

export async function getAuditLogsForUser(auditLogModel: typeof AuditLog, userId: number): Promise<AuditLog[]> {
  return auditLogModel.findAll({ where: { userId }, order: [['createdAt', 'ASC']] });
}
