// One-off cleanup + migration script.
// Usage (from backend/): npx ts-node scripts/cleanup-and-migrate.ts

import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI as string);
  await client.connect();
  const db = client.db();

  const ivrs = db.collection('ivrrequests');
  const orders = db.collection('orders');
  const shipments = db.collection('shipments');

  console.log('--- PRE-CLEANUP STATE ---');
  const ivrStatusBefore = await ivrs.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
  console.log('IVR statuses:', ivrStatusBefore);
  const orderStatusBefore = await orders.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
  console.log('Order statuses:', orderStatusBefore);

  console.log('\n--- 1. Migrating legacy IVR statuses ---');
  const r1 = await ivrs.updateMany({ status: 'pending' }, { $set: { status: 'submitted' } });
  console.log(`  pending -> submitted: ${r1.modifiedCount} docs`);
  const r2 = await ivrs.updateMany({ status: 'approved' }, { $set: { status: 'covered' } });
  console.log(`  approved -> covered: ${r2.modifiedCount} docs`);

  console.log('\n--- 2. Deleting test orders (ORD-2026-0016, ORD-2026-0017) ---');
  const testOrderIds = ['ORD-2026-0016', 'ORD-2026-0017'];
  const ordersToDelete = await orders.find({ orderId: { $in: testOrderIds } }).toArray();
  const ordersObjIds = ordersToDelete.map((o) => o._id);
  console.log(`  matched orders: ${ordersToDelete.map((o) => o.orderId).join(', ')}`);
  if (ordersObjIds.length > 0) {
    const shipDel = await shipments.deleteMany({ order: { $in: ordersObjIds } });
    console.log(`  deleted ${shipDel.deletedCount} associated shipment(s)`);
  }
  const orderDel = await orders.deleteMany({ orderId: { $in: testOrderIds } });
  console.log(`  deleted ${orderDel.deletedCount} order(s)`);

  console.log('\n--- 3. Deleting test IVRs (IVR-2026-0016, 0017, 0018) ---');
  const testIvrIds = ['IVR-2026-0016', 'IVR-2026-0017', 'IVR-2026-0018'];
  const ivrDel = await ivrs.deleteMany({ requestId: { $in: testIvrIds } });
  console.log(`  deleted ${ivrDel.deletedCount} IVR(s)`);

  console.log('\n--- POST-CLEANUP STATE ---');
  const ivrStatusAfter = await ivrs.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
  console.log('IVR statuses:', ivrStatusAfter);
  const orderStatusAfter = await orders.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
  console.log('Order statuses:', orderStatusAfter);

  await client.close();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
