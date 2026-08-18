import { hashPassword, verifyPassword } from './passwordService';

describe('passwordService', () => {
  it('hashes a password and verifies the correct password against it', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    expect(hash).not.toBe('correct-horse-battery-staple');
    await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
  });

  it('rejects the wrong password against a valid hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
