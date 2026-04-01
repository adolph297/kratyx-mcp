import dbConnect from '@/lib/db';
import { syncConnectorsToDB } from '@/connectors-runtime/loader';

async function runSync() {
  console.log('Connecting to DB...');
  await dbConnect();
  console.log('Syncing connectors...');
  const result = await syncConnectorsToDB();
  console.log('Synced:', result.synced);
  console.log('Errors:', result.errors);
  process.exit(0);
}

runSync().catch(err => {
  console.error('Manual sync failed:', err);
  process.exit(1);
});
