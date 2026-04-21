// One-off: diagnose why the multi-rep $in filter isn't matching.
import * as dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

async function main() {
  const client = new MongoClient(uri as string);
  await client.connect();
  const db = client.db();

  const users = db.collection('users');
  const orders = db.collection('orders');

  // Pick the most recent order
  const latestOrder = await orders.find({}).sort({ createdAt: -1 }).limit(1).next();
  console.log('\n--- latest order ---');
  console.log({
    _id: latestOrder?._id,
    orderId: latestOrder?.orderId,
    doctorField: latestOrder?.doctor,
    doctorType: typeof latestOrder?.doctor,
    doctorIsObjectId: latestOrder?.doctor instanceof ObjectId,
    salesRepField: latestOrder?.salesRep,
    salesRepType: typeof latestOrder?.salesRep,
  });

  // Find emily.rep
  const emily = await users.findOne({ email: 'emily.rep@medeffects.com' });
  console.log('\n--- emily user ---');
  console.log({
    _id: emily?._id,
    email: emily?.email,
    assignedDoctors: emily?.assignedDoctors,
    assignedDoctorsType: emily?.assignedDoctors ? typeof emily.assignedDoctors[0] : 'empty',
    assignedDoctorsIsObjectId: emily?.assignedDoctors?.[0] instanceof ObjectId,
  });

  // Same for mike
  const mike = await users.findOne({ email: 'mike.rep@medeffects.com' });
  console.log('\n--- mike user ---');
  console.log({
    _id: mike?._id,
    assignedDoctors: mike?.assignedDoctors,
    assignedDoctorsType: mike?.assignedDoctors ? typeof mike.assignedDoctors[0] : 'empty',
  });

  await client.close();
}

main().catch(console.error);
