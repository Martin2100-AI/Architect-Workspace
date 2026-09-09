import { Sequelize } from 'sequelize';
import { AuditLog, initAuditLogModel } from '../models/AuditLog';
import { getAuditLogsForUser, recordAuditEvent } from './auditLogService';

describe('recordAuditEvent', () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    initAuditLogModel(sequelize);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('persists a real row with the action, the user, and an accurate timestamp', async () => {
    await recordAuditEvent(AuditLog, 1, 'user_registered');

    const rows = await AuditLog.findAll();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(1);
    expect(rows[0].action).toBe('user_registered');
    expect(rows[0].createdAt).toBeInstanceOf(Date);
    expect(Date.now() - rows[0].createdAt.getTime()).toBeLessThan(5000);
  });

  it('never throws when the write fails, so the primary action it accompanies is never blocked by it', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    // A stub standing in for the model, not the real Sequelize class: this test only
    // exercises recordAuditEvent's own error handling in isolation. The repo has no
    // established way to force a genuine mid-test DB failure without tearing down
    // state other tests need, so a stub is the narrower, more reliable choice here.
    const throwingModel = {
      create: jest.fn().mockRejectedValue(new Error('db unavailable')),
    } as unknown as typeof AuditLog;

    await expect(recordAuditEvent(throwingModel, 1, 'user_registered')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"event":"audit_log_write_failed"'));
    errorSpy.mockRestore();
  });
});

describe('getAuditLogsForUser', () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    initAuditLogModel(sequelize);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it("returns only the given user's entries, oldest first, proving stored logs are accessible again", async () => {
    await recordAuditEvent(AuditLog, 1, 'user_registered');
    await recordAuditEvent(AuditLog, 2, 'user_registered');
    await recordAuditEvent(AuditLog, 1, 'password_reset_requested');

    const entries = await getAuditLogsForUser(AuditLog, 1);

    expect(entries.map((e) => e.action)).toEqual(['user_registered', 'password_reset_requested']);
  });

  it('returns an empty array for a user with no audit history', async () => {
    const entries = await getAuditLogsForUser(AuditLog, 999);
    expect(entries).toEqual([]);
  });
});
