require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

// Add the details for your initial admin user here
const seedAdmin = async () => {
    try {
        await connectDB();

        // Check if an admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@flyaux.com' });

        if (existingAdmin) {
            console.log('Admin user already exists!');
            process.exit(0);
        }

        const adminUser = new User({
            fullName: 'Admin User',
            email: 'admin@flyaux.com',
            phoneNumber: '+1234567890',
            country: 'Nigeria',
            password: 'AdminPassword!23',
            role: 'admin',
        });

        await adminUser.save();
        console.log('Admin user created successfully');
        process.exit();
    } catch (error) {
        console.error('Error with seed data:', error.message);
        process.exit(1);
    }
};

seedAdmin();
