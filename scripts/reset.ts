import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const backendDir = process.cwd();
const sqliteFiles = [
  resolve(backendDir, 'prisma', 'dev.db'),
  resolve(backendDir, 'prisma', 'dev.db-journal'),
];

const cyan = (text: string): string => `\x1b[36m${text}\x1b[0m`;
const green = (text: string): string => `\x1b[32m${text}\x1b[0m`;
const yellow = (text: string): string => `\x1b[33m${text}\x1b[0m`;

export function resetDatabase(): void {
  console.log(cyan('Resetting SQLite database...'));

  for (const filePath of sqliteFiles) {
    if (!existsSync(filePath)) {
      continue;
    }

    rmSync(filePath);
  }

  execSync('npx prisma db push', {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? 'file:./dev.db',
    },
    stdio: 'inherit',
  });

  console.log(yellow('No seed script configured; using clean schema only.'));
  console.log(green('Database reset complete'));
}

if (process.argv[1]?.endsWith('reset.ts')) {
  resetDatabase();
}
