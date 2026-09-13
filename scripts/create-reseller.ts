import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password || password.length < 12) {
  throw new Error('Usage: tsx scripts/create-reseller.ts "Name" email password (password must be at least 12 characters)');
}

const prisma = new PrismaClient();

try {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) throw new Error(`A user with ${normalizedEmail} already exists`);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'RESELLER',
      status: 'ACTIVE',
    },
  });

  console.log(JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }));
} finally {
  await prisma.$disconnect();
}
