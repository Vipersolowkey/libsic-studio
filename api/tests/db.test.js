const { connectDb } = require('../src/db');

describe('connectDb', () => {
  it('rejects with a helpful message when the connection string is missing', async () => {
    await expect(connectDb('')).rejects.toThrow('MONGODB_URI is missing');
  });
});
