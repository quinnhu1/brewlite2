import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const db = new PrismaClient();
try {
  if (await db.product.count() || await db.orders.count()) throw new Error('Catalog seed is for a fresh database only. Use admin UI for later changes.');
  const sql = readFileSync(new URL('../prisma/seed/catalog.sql', import.meta.url), 'utf8').split('INSERT INTO public.users')[0] + '\nCOMMIT;\n';
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js','db','execute','--schema','prisma/schema.prisma','--stdin'], { input:sql, stdio:['pipe','inherit','inherit'] });
  console.log('Catalog imported without demo users.');
} finally { await db.$disconnect(); }
