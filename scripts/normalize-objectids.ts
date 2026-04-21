// One-off: normalize string ObjectIds to real ObjectIds across collections.
// Affects orders.doctor, orders.product, orders.patient, orders.salesRep,
// orders.lineItems[].product, users.assignedDoctors.
import * as dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

function toObjectId(v: any): any {
  if (!v) return v;
  if (v instanceof ObjectId) return v;
  if (typeof v === 'string' && ObjectId.isValid(v)) return new ObjectId(v);
  return v;
}

async function main() {
  const client = new MongoClient(uri as string);
  await client.connect();
  const db = client.db();

  const orders = db.collection('orders');
  const users = db.collection('users');
  const ivrs = db.collection('ivrrequests');

  console.log('--- Scanning orders for string-ObjectId references ---');
  const orderDocs = await orders.find({}).toArray();
  let orderUpdates = 0;
  for (const o of orderDocs) {
    const patch: any = {};
    if (typeof o.doctor === 'string' && ObjectId.isValid(o.doctor)) patch.doctor = new ObjectId(o.doctor);
    if (typeof o.product === 'string' && ObjectId.isValid(o.product)) patch.product = new ObjectId(o.product);
    if (typeof o.patient === 'string' && ObjectId.isValid(o.patient)) patch.patient = new ObjectId(o.patient);
    if (typeof o.salesRep === 'string' && ObjectId.isValid(o.salesRep)) patch.salesRep = new ObjectId(o.salesRep);
    if (Array.isArray(o.lineItems)) {
      let changed = false;
      const newLineItems = o.lineItems.map((li: any) => {
        if (li && typeof li.product === 'string' && ObjectId.isValid(li.product)) {
          changed = true;
          return { ...li, product: new ObjectId(li.product) };
        }
        return li;
      });
      if (changed) patch.lineItems = newLineItems;
    }
    if (Object.keys(patch).length > 0) {
      await orders.updateOne({ _id: o._id }, { $set: patch });
      orderUpdates++;
    }
  }
  console.log(`  updated ${orderUpdates} orders`);

  console.log('\n--- Scanning users.assignedDoctors ---');
  const userDocs = await users.find({ assignedDoctors: { $exists: true, $ne: [] } }).toArray();
  let userUpdates = 0;
  for (const u of userDocs) {
    if (!Array.isArray(u.assignedDoctors)) continue;
    const hasString = u.assignedDoctors.some((id: any) => typeof id === 'string');
    if (!hasString) continue;
    const normalized = u.assignedDoctors.map((id: any) => toObjectId(id));
    await users.updateOne({ _id: u._id }, { $set: { assignedDoctors: normalized } });
    userUpdates++;
  }
  console.log(`  updated ${userUpdates} users`);

  console.log('\n--- Scanning IVRs.submittedBy / reviewedBy ---');
  const ivrDocs = await ivrs.find({}).toArray();
  let ivrUpdates = 0;
  for (const i of ivrDocs) {
    const patch: any = {};
    if (typeof i.submittedBy === 'string' && ObjectId.isValid(i.submittedBy)) patch.submittedBy = new ObjectId(i.submittedBy);
    if (typeof i.reviewedBy === 'string' && ObjectId.isValid(i.reviewedBy)) patch.reviewedBy = new ObjectId(i.reviewedBy);
    if (Object.keys(patch).length > 0) {
      await ivrs.updateOne({ _id: i._id }, { $set: patch });
      ivrUpdates++;
    }
  }
  console.log(`  updated ${ivrUpdates} IVRs`);

  await client.close();
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
