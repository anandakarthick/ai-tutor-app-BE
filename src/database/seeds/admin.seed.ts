/**
 * Seed file for creating default admin user
 * Run with: npx ts-node src/database/seeds/admin.seed.ts
 */

import AppDataSource from '../../config/database';
import { Admin, AdminRole } from '../../entities/Admin';
import bcrypt from 'bcryptjs';

const seedAdmin = async () => {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connected');

    const adminRepository = AppDataSource.getRepository(Admin);

    // Check if super admin already exists
    const existingAdmin = await adminRepository.findOne({
      where: { email: 'admin@aitutor.com' },
    });

    if (existingAdmin) {
      console.log('Super admin already exists');
      await AppDataSource.destroy();
      return;
    }

    // Create default super admin
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const superAdmin = adminRepository.create({
      fullName: 'Super Admin',
      email: 'admin@aitutor.com',
      phone: '+91 9876543210',
      password: hashedPassword,
      role: AdminRole.SUPER_ADMIN,
      permissions: ['all'],
      isActive: true,
    });

    await adminRepository.save(superAdmin);
    console.log('✅ Super admin created successfully');
    console.log('Email: admin@aitutor.com');
    console.log('Password: Admin@123');

    // Create sample admin
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const sampleAdmin = adminRepository.create({
      fullName: 'Sample Admin',
      email: 'sample.admin@aitutor.com',
      phone: '+91 9876543211',
      password: adminPassword,
      role: AdminRole.ADMIN,
      permissions: ['students', 'schools', 'classes', 'subjects', 'reports', 'transactions'],
      isActive: true,
    });

    await adminRepository.save(sampleAdmin);
    console.log('✅ Sample admin created successfully');
    console.log('Email: sample.admin@aitutor.com');
    console.log('Password: Admin@123');

    await AppDataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
