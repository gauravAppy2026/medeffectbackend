import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medeffects';

async function seed() {
  const conn = await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Wait for the connection to be fully ready
  const db = conn.connection.getClient().db('medeffects');

  // Clear existing data
  const collections = ['users', 'orders', 'ivrrequests', 'doctors', 'products', 'shipments'];
  for (const col of collections) {
    try { await db.dropCollection(col); } catch (e) { /* collection may not exist */ }
  }

  // HIPAA: Use 12 bcrypt rounds for stronger password hashing
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  const patientPassword = await bcrypt.hash('Patient123!', 12);
  const repPassword = await bcrypt.hash('SalesRep123!', 12);

  // Users
  const users = await db.collection('users').insertMany([
    {
      firstName: 'Admin', lastName: 'User', email: 'admin@medeffects.com',
      password: hashedPassword, role: 'admin', phone: '(555) 100-0001',
      isActive: true, biometricEnabled: false, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@medeffects.com',
      password: patientPassword, role: 'patient', phone: '(555) 200-0001',
      address: { street: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001' },
      dateOfBirth: new Date('1990-05-15'), gender: 'female',
      isActive: true, biometricEnabled: false, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      firstName: 'John', lastName: 'Smith', email: 'john@medeffects.com',
      password: patientPassword, role: 'patient', phone: '(555) 200-0002',
      isActive: true, biometricEnabled: false, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      firstName: 'Mike', lastName: 'Wilson', email: 'mike.rep@medeffects.com',
      password: repPassword, role: 'sales_rep', phone: '(555) 300-0001',
      licenseNumber: 'MED-45678-2025', licenseExpiry: new Date('2025-12-31'),
      isActive: true, biometricEnabled: false, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      firstName: 'Emily', lastName: 'Davis', email: 'emily.rep@medeffects.com',
      password: repPassword, role: 'sales_rep', phone: '(555) 300-0002',
      licenseNumber: 'MED-67890-2025', licenseExpiry: new Date('2025-12-31'),
      isActive: true, biometricEnabled: false, createdAt: new Date(), updatedAt: new Date(),
    },
  ]);
  const userIds = users.insertedIds;
  console.log(`Created ${Object.keys(userIds).length} users`);

  // Doctors
  const doctors = await db.collection('doctors').insertMany([
    {
      firstName: 'Robert', lastName: 'Chen', department: 'Cardiology',
      gender: 'male', email: 'dr.chen@hospital.com', phone: '(555) 400-0001',
      licenseNumber: 'DOC-11111', isActive: true,
      addresses: [{ street: '100 Medical Center Dr', city: 'Boston', state: 'MA', zipCode: '02101' }],
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      firstName: 'Lisa', lastName: 'Park', department: 'Neurology',
      gender: 'female', email: 'dr.park@hospital.com', phone: '(555) 400-0002',
      licenseNumber: 'DOC-22222', isActive: true,
      addresses: [{ street: '200 Health Blvd', city: 'Chicago', state: 'IL', zipCode: '60601' }],
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      firstName: 'James', lastName: 'Miller', department: 'Orthopedics',
      gender: 'male', email: 'dr.miller@hospital.com', phone: '(555) 400-0003',
      licenseNumber: 'DOC-33333', isActive: true,
      addresses: [{ street: '300 Wellness Ave', city: 'Houston', state: 'TX', zipCode: '77001' }],
      createdAt: new Date(), updatedAt: new Date(),
    },
  ]);
  const doctorIds = doctors.insertedIds;
  console.log(`Created ${Object.keys(doctorIds).length} doctors`);

  // Products
  const products = await db.collection('products').insertMany([
    {
      name: 'CardioGuard Pro', sku: 'CGP-001', category: 'Cardiovascular',
      price: 299.99, stock: 150, availableFor: 'both', isActive: true,
      description: 'Advanced cardiac monitoring device',
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      name: 'NeuroSync Plus', sku: 'NSP-002', category: 'Neurology',
      price: 449.99, stock: 75, availableFor: 'doctors', isActive: true,
      description: 'Neural stimulation therapy device',
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      name: 'FlexiJoint Brace', sku: 'FJB-003', category: 'Orthopedics',
      price: 89.99, stock: 300, availableFor: 'both', isActive: true,
      description: 'Adjustable joint support brace',
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      name: 'PulseCheck Monitor', sku: 'PCM-004', category: 'Cardiovascular',
      price: 199.99, stock: 200, availableFor: 'patients', isActive: true,
      description: 'Home pulse monitoring system',
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      name: 'DermaHeal Patch', sku: 'DHP-005', category: 'Dermatology',
      price: 34.99, stock: 500, availableFor: 'both', isActive: true,
      description: 'Therapeutic skin healing patch',
      createdAt: new Date(), updatedAt: new Date(),
    },
  ]);
  const productIds = products.insertedIds;
  console.log(`Created ${Object.keys(productIds).length} products`);

  // Orders
  const orders = await db.collection('orders').insertMany([
    {
      orderId: 'ORD-2025-0001', patient: userIds[1], doctor: doctorIds[0],
      product: productIds[0], salesRep: userIds[3], quantity: 2,
      patientName: 'Sarah Johnson', status: 'submitted', priority: 'normal',
      address: { street: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001' },
      statusHistory: [{ status: 'submitted', changedBy: userIds[1], changedAt: new Date(), note: 'Order created' }],
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      orderId: 'ORD-2025-0002', patient: userIds[1], doctor: doctorIds[1],
      product: productIds[1], salesRep: userIds[4], quantity: 1,
      patientName: 'Sarah Johnson', status: 'approved', priority: 'urgent',
      address: { street: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001' },
      statusHistory: [
        { status: 'submitted', changedBy: userIds[1], changedAt: new Date(Date.now() - 86400000), note: 'Order created' },
        { status: 'approved', changedBy: userIds[0], changedAt: new Date(), note: 'Approved by admin' },
      ],
      createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(),
    },
    {
      orderId: 'ORD-2025-0003', patient: userIds[2], doctor: doctorIds[2],
      product: productIds[2], quantity: 3,
      patientName: 'John Smith', status: 'completed', priority: 'normal',
      trackingNumber: 'TRK-789012',
      address: { street: '456 Oak Ave', city: 'Chicago', state: 'IL', zipCode: '60601' },
      statusHistory: [
        { status: 'submitted', changedBy: userIds[2], changedAt: new Date(Date.now() - 172800000), note: 'Order created' },
        { status: 'approved', changedBy: userIds[0], changedAt: new Date(Date.now() - 86400000), note: 'Approved' },
        { status: 'completed', changedBy: userIds[0], changedAt: new Date(), note: 'Delivered' },
      ],
      createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(),
    },
    {
      orderId: 'ORD-2025-0004', patient: userIds[2], doctor: doctorIds[0],
      product: productIds[3], quantity: 1,
      patientName: 'John Smith', status: 'rejected', priority: 'normal',
      rejectionReason: 'Insurance not verified',
      address: { street: '456 Oak Ave', city: 'Chicago', state: 'IL', zipCode: '60601' },
      statusHistory: [
        { status: 'submitted', changedBy: userIds[2], changedAt: new Date(Date.now() - 259200000), note: 'Order created' },
        { status: 'rejected', changedBy: userIds[0], changedAt: new Date(Date.now() - 172800000), note: 'Insurance not verified' },
      ],
      createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(),
    },
  ]);
  console.log(`Created ${orders.insertedCount} orders`);

  // IVR Requests
  const ivrs = await db.collection('ivrrequests').insertMany([
    {
      requestId: 'IVR-2025-0001', status: 'pending',
      patient: { firstName: 'Sarah', lastName: 'Johnson', dateOfBirth: new Date('1990-05-15'), gender: 'female', phone: '(555) 200-0001', address: '123 Main St, New York, NY' },
      insurance: { insuranceName: 'BlueCross BlueShield', policyNumber: 'BC-123456', medicareId: 'MED-001', subscriberName: 'Sarah Johnson' },
      comment: 'Initial verification request',
      documents: [], submittedBy: userIds[1],
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      requestId: 'IVR-2025-0002', status: 'approved',
      patient: { firstName: 'John', lastName: 'Smith', dateOfBirth: new Date('1985-08-20'), gender: 'male', phone: '(555) 200-0002', address: '456 Oak Ave, Chicago, IL' },
      insurance: { insuranceName: 'Aetna', policyNumber: 'AE-789012', medicareId: 'MED-002', subscriberName: 'John Smith' },
      comment: 'Insurance verified via phone',
      documents: [], submittedBy: userIds[2], reviewedBy: userIds[0], reviewedAt: new Date(),
      createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(),
    },
    {
      requestId: 'IVR-2025-0003', status: 'rejected',
      patient: { firstName: 'Alice', lastName: 'Brown', dateOfBirth: new Date('1992-03-10'), gender: 'female', phone: '(555) 200-0003', address: '789 Elm St, Houston, TX' },
      insurance: { insuranceName: 'UnitedHealth', policyNumber: 'UH-345678', medicareId: 'MED-003', subscriberName: 'Alice Brown' },
      comment: 'Policy expired',
      documents: [], submittedBy: userIds[1], reviewedBy: userIds[0], reviewedAt: new Date(),
      createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(),
    },
  ]);
  console.log(`Created ${ivrs.insertedCount} IVR requests`);

  console.log('\n--- Seed Complete ---');
  console.log('Admin login: admin@medeffects.com / Admin123!');
  console.log('Patient login: sarah@medeffects.com / Patient123!');
  console.log('Sales Rep login: mike.rep@medeffects.com / SalesRep123!');

  await mongoose.disconnect();
}

seed().catch(console.error);
