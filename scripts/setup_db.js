import mysql from 'mysql2/promise';

async function setup() {
  const url = (process.env.DATABASE_URL ?? "").trim();
  if (!url) {
    console.error("[Setup] DATABASE_URL not set");
    return;
  }

  console.log("[Setup] Starting database initialization...");
  try {
    const connection = await mysql.createConnection(url);
    console.log("[Setup] Connected to Aiven MySQL");

    console.log("[Setup] Creating users table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        loginMethod VARCHAR(64),
        role ENUM('admin', 'fornecedor', 'consulta') NOT NULL DEFAULT 'fornecedor',
        supplierId INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    
    console.log("[Setup] Creating vehicles table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplierId INT NOT NULL,
        model VARCHAR(255) NOT NULL,
        plate VARCHAR(20) NOT NULL UNIQUE,
        color VARCHAR(50),
        type VARCHAR(100),
        active BOOLEAN DEFAULT true NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    console.log("[Setup] Migrating events table...");
    // Safely add columns that may have been added to schema after initial deploy
    await connection.query(`
      ALTER TABLE events
        ADD COLUMN IF NOT EXISTS registrationDeadline DATE NOT NULL DEFAULT (CURDATE()),
        ADD COLUMN IF NOT EXISTS credentialReleaseDate DATE NOT NULL DEFAULT (CURDATE());
    `).catch(() => {
      // Table may not exist yet on a brand new database - drizzle handles full creation
      console.log("[Setup] events table not found yet, skipping migration");
    });
    
    console.log("[Setup] Database initialization successful!");
    await connection.end();
  } catch (error) {
    console.error("[Setup] Failed to initialize database:", error);
    process.exit(0);
  }
}

setup();
