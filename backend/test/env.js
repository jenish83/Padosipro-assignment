// ESM evaluates imports before any module body, so these must be set
// before config.js loads. The test script preloads this file with --import.
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';
