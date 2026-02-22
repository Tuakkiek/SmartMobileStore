
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../modules/auth/User.js';
import Store from '../modules/store/Store.js';
import { getAllEmployees } from '../modules/auth/userController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const verifyEmployeeFilter = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
    console.log('Connected to MongoDB');

    // 1. Create 2 test stores
    const store1 = await Store.create({
      code: 'TS1',
      name: 'Test Store 1',
      type: 'STORE',
      address: {
        province: 'Test Province',
        district: 'Test District',
        street: 'Test Street 1'
      },
      phone: '0900000001'
    });

    const store2 = await Store.create({
      code: 'TS2',
      name: 'Test Store 2',
      type: 'STORE',
      address: {
        province: 'Test Province',
        district: 'Test District',
        street: 'Test Street 2'
      },
      phone: '0900000002'
    });

    console.log(`Created stores: ${store1._id}, ${store2._id}`);

    // 2. Create 2 test employees
    const emp1 = await User.create({
      fullName: 'Emp Store 1',
      phoneNumber: '0990000001',
      email: 'emp1@test.com',
      password: 'Password123!',
      role: 'POS_STAFF',
      province: 'Test Province',
      storeLocation: store1._id.toString()
    });

    const emp2 = await User.create({
      fullName: 'Emp Store 2',
      phoneNumber: '0990000002',
      email: 'emp2@test.com',
      password: 'Password123!',
      role: 'POS_STAFF',
      province: 'Test Province',
      storeLocation: store2._id.toString()
    });

    console.log(`Created employees: ${emp1._id}, ${emp2._id}`);

    // 3. Test filtering by Store 1
    const req1 = {
      query: {
        storeLocation: store1._id.toString(),
        limit: 10,
        page: 1
      }
    };

    const res1 = {
      json: (data) => {
        if (!data.success) {
           console.error('Filter Store 1 failed:', data.message);
           return;
        }
        const employees = data.data.employees;
        const found = employees.find(e => e._id.toString() === emp1._id.toString());
        const notFound = employees.find(e => e._id.toString() === emp2._id.toString());

        if (found && !notFound) {
          console.log('✅ Filter by Store 1 PASSED');
        } else {
          console.error('❌ Filter by Store 1 FAILED');
          console.log('Found:', found ? 'Yes' : 'No');
          console.log('Should not find:', notFound ? 'Yes' : 'No');
        }
      },
      status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) })
    };

    await getAllEmployees(req1, res1);

    // 4. Test filtering by Store 2
    const req2 = {
      query: {
        storeLocation: store2._id.toString(),
        limit: 10,
        page: 1
      }
    };

    const res2 = {
      json: (data) => {
        if (!data.success) {
           console.error('Filter Store 2 failed:', data.message);
           return;
        }
        const employees = data.data.employees;
        const found = employees.find(e => e._id.toString() === emp2._id.toString());
        const notFound = employees.find(e => e._id.toString() === emp1._id.toString());

        if (found && !notFound) {
          console.log('✅ Filter by Store 2 PASSED');
        } else {
          console.error('❌ Filter by Store 2 FAILED');
        }
      },
      status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) })
    };

    await getAllEmployees(req2, res2);

    // Cleanup
    await User.deleteMany({ _id: { $in: [emp1._id, emp2._id] } });
    await Store.deleteMany({ _id: { $in: [store1._id, store2._id] } });
    console.log('Cleanup done');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

verifyEmployeeFilter();
