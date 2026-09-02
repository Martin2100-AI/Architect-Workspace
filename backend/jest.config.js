module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  // ts-jest's per-file type-checked compilation hits "Type instantiation is
  // excessively deep" on the MCP SDK's zod-based tool/prompt schemas even though
  // the same code passes a full-project `tsc --noEmit` cleanly (see keysyMcpServer.ts).
  // `npm run typecheck` remains the authoritative type-safety gate; this only
  // switches test transpilation to isolated (non-type-checked) mode.
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
};
