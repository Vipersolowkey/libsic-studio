// Part of: Accounts: makes an existing account an admin (or takes the role away). Run on your own computer, never through the API.
//   npm run make-admin -- tony            makes the account "tony" an admin
//   npm run make-admin -- tony --remove   makes it a normal account again
// The account must exist already (sign up on the site first). Uses MONGODB_URI from api/.env.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { connectDb } = require('../src/db');
const User = require('../src/models/User');

async function main() {
  const args = process.argv.slice(2);
  const remove = args.includes('--remove');
  const username = (args.find((a) => !a.startsWith('--')) || '').trim().toLowerCase();
  if (!username) throw new Error('Usage: npm run make-admin -- <username> [--remove]');
  await connectDb(process.env.MONGODB_URI);
  const result = await User.updateOne({ username }, { role: remove ? 'user' : 'admin' });
  if (result.matchedCount === 0) throw new Error(`No account named "${username}". Sign up on the site first, then run this again.`);
  console.log(remove ? `${username} is a normal account again.` : `${username} is now an admin.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
