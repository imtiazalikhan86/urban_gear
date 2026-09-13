import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const adminName = process.env.SEED_ADMIN_NAME;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminName || !adminPassword || adminPassword.length < 8) {
    throw new Error('SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD (minimum 8 characters) are required');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const updateData = process.env.NODE_ENV === 'production'
    ? { name: adminName, role: 'ADMIN' as const, status: 'ACTIVE' as const }
    : { name: adminName, role: 'ADMIN' as const, status: 'ACTIVE' as const, passwordHash };

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: updateData,
    create: { email: adminEmail, passwordHash, name: adminName, role: 'ADMIN' },
  });

  await prisma.product.createMany({
    data: [
      { sku: 'UG-DEMO-001', name: 'Urban Everyday Backpack', slug: 'urban-everyday-backpack', description: 'A durable everyday backpack for work, travel, and city use.', category: 'Bags', price: 1499, imageUrl: null },
      { sku: 'UG-DEMO-002', name: 'Commuter Stainless Bottle', slug: 'commuter-stainless-bottle', description: 'Reusable insulated bottle designed for daily commutes.', category: 'Drinkware', price: 699, imageUrl: null },
    ],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
