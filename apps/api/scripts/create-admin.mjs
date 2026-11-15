import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const db = new PrismaClient();
try {
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const phone=process.env.ADMIN_PHONE?.trim();
  const password=process.env.ADMIN_PASSWORD;
  if(!email || email.length>50 || !email.includes('@') || !phone || !/^0\d{9}$/.test(phone) || !password || password.length<12) throw new Error('Set ADMIN_EMAIL, ADMIN_PHONE (10 digits), ADMIN_PASSWORD (12+ characters).');
  if(await db.users.findFirst({where:{OR:[{email},{phone}]}})) throw new Error('Account already exists; refusing to overwrite or promote an existing customer.');
  await db.users.create({data:{email,phone,name:'BrewLite Admin',role:'admin',password:await bcrypt.hash(password,12)}});
  console.log('Administrator created. Password is not printed.');
} finally { await db.$disconnect(); }
