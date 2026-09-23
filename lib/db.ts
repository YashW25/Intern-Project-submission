import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:PeopleOS%402020Pro@db.jbrfuwgcokwwcbmbzeqp.supabase.co:5432/postgres";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function queryDb(text: string, params?: any[]) {
  try {
    const p = getDbPool();
    const res = await p.query(text, params);
    return res;
  } catch (err) {
    console.warn('Database query fallback warning:', err);
    return null;
  }
}

export async function initializeDatabaseTables() {
  const initSql = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      department VARCHAR(255),
      internship_period VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      avatar_url TEXT
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

    CREATE TABLE IF NOT EXISTS submissions (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      project_title VARCHAR(255) NOT NULL,
      description TEXT,
      zip_file_id VARCHAR(255),
      zip_file_name VARCHAR(255),
      file_tree JSONB,
      files JSONB,
      status VARCHAR(50) DEFAULT 'submitted',
      grade VARCHAR(50),
      feedback TEXT,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS logbooks (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      week_number INT NOT NULL,
      start_date VARCHAR(50),
      end_date VARCHAR(50),
      tasks_completed TEXT,
      skills_learned TEXT,
      challenges_faced TEXT,
      supervisor_comments TEXT,
      status VARCHAR(50) DEFAULT 'submitted',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lors (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      department VARCHAR(255),
      internship_period VARCHAR(255),
      letterhead_bg_url TEXT,
      blocks JSONB,
      status VARCHAR(50) DEFAULT 'draft',
      issued_at TIMESTAMP WITH TIME ZONE,
      issued_by VARCHAR(255)
    );

    ALTER TABLE lors ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

    CREATE TABLE IF NOT EXISTS contact_messages (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      user_email VARCHAR(255),
      subject VARCHAR(255),
      message TEXT,
      status VARCHAR(50) DEFAULT 'unread',
      reply TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      message TEXT,
      type VARCHAR(50) DEFAULT 'info',
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await queryDb(initSql);

  // Seed default users if table is empty
  const userCheck = await queryDb("SELECT COUNT(*) FROM users");
  if (userCheck && parseInt(userCheck.rows[0].count, 10) === 0) {
    const seedSql = `
      INSERT INTO users (id, name, email, password, role, department, internship_period, status) VALUES
      ('usr_intern_1', 'Alex Rivera', 'intern@company.com', 'intern123', 'intern', 'Full-Stack Software Engineering', 'June 2026 - Sept 2026', 'active'),
      ('usr_admin_1', 'Program Administrator', 'admin@company.com', 'admin123', 'admin', 'Head of Engineering & Relations', 'Permanent Staff', 'active')
      ON CONFLICT (id) DO NOTHING;
    `;
    await queryDb(seedSql);
  }
}
