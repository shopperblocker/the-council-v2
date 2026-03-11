/**
 * Seed the admin user into the users table.
 *
 * Usage:
 *   DATABASE_URL=... ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword npx ts-node scripts/seed-admin.ts
 *
 * Requires DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD env vars.
 * Bcrypt rounds: 12
 */

import { Pool } from "pg";
import { hash } from "bcryptjs";

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!DATABASE_URL) throw new Error("DATABASE_URL env var is required");
  if (!ADMIN_EMAIL) throw new Error("ADMIN_EMAIL env var is required");
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD env var is required");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : false,
  });

  try {
    const passwordHash = await hash(ADMIN_PASSWORD, 12);

    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'admin', NOW())
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [ADMIN_EMAIL.toLowerCase().trim(), passwordHash]
    );

    console.log(`Admin user seeded: ${ADMIN_EMAIL}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
