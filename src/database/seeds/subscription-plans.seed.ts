/**
 * Subscription Plans Seed
 * Creates the two subscription plans: Monthly (₹299) and Yearly (₹3000)
 */

import 'reflect-metadata';
import AppDataSource from '../../config/datasource';
import { SubscriptionPlan } from '../../entities/SubscriptionPlan';

export async function seedSubscriptionPlans() {
  console.log('🌱 Seeding subscription plans...');

  const planRepository = AppDataSource.getRepository(SubscriptionPlan);

  // Delete existing plans using query builder
  await planRepository.createQueryBuilder().delete().from(SubscriptionPlan).execute();
  console.log('  ✓ Cleared existing plans');

  const plans = [
    {
      planName: 'monthly',
      displayName: 'Monthly Plan',
      description: 'Perfect for trying out our platform. Full access to all features.',
      price: 299,
      originalPrice: 399,
      currency: 'INR',
      durationMonths: 1,
      maxStudents: 1,
      aiMinutesPerDay: 60,
      features: [
        'Unlimited access to all subjects',
        'AI-powered personalized learning',
        'Instant doubt resolution',
        'Progress tracking & analytics',
        'Quizzes & assessments',
        'Study plan generation',
      ],
      doubtTypes: ['text', 'voice', 'image'],
      hasLiveSessions: false,
      hasPersonalMentor: false,
      supportType: 'email',
      reportFrequency: 'weekly',
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
    {
      planName: 'yearly',
      displayName: 'Yearly Plan',
      description: 'Best value! Save ₹588 with annual subscription. All features included.',
      price: 3000,
      originalPrice: 3588,
      currency: 'INR',
      durationMonths: 12,
      maxStudents: 1,
      aiMinutesPerDay: 120,
      features: [
        'Everything in Monthly Plan',
        'Priority AI responses',
        'Extended AI usage (120 min/day)',
        'Detailed performance reports',
        'Parent dashboard access',
        'Offline content download',
        'Certificate of completion',
        'Save ₹588 compared to monthly',
      ],
      doubtTypes: ['text', 'voice', 'image'],
      hasLiveSessions: true,
      hasPersonalMentor: false,
      supportType: 'priority',
      reportFrequency: 'weekly',
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
  ];

  for (const planData of plans) {
    const plan = planRepository.create(planData);
    await planRepository.save(plan);
    console.log(`  ✓ Created plan: ${plan.displayName} - ₹${plan.price}`);
  }

  console.log('✅ Subscription plans seeded successfully!\n');
}

// Run directly if called as script
if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await seedSubscriptionPlans();
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error seeding subscription plans:', error);
      process.exit(1);
    });
}
