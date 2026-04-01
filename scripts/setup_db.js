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

    // =========================================================================
    // USERS
    // =========================================================================
    console.log("[Setup] Creating users table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        loginMethod VARCHAR(64),
        role ENUM('admin', 'gestor', 'fornecedor', 'consulta') NOT NULL DEFAULT 'fornecedor',
        supplierId INT,
        password VARCHAR(255),
        mustChangePassword BOOLEAN NOT NULL DEFAULT false,
        passwordResetToken TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Migrate role enum if it exists
    await connection.query(`
      ALTER TABLE users 
        MODIFY COLUMN role ENUM('admin', 'gestor', 'fornecedor', 'consulta') NOT NULL DEFAULT 'fornecedor'
    `).catch(err => console.log("[Setup] Warning: Could not modify role column:", err.message));

    const columnsToAdd = [
      { name: 'password', type: 'VARCHAR(255)' },
      { name: 'mustChangePassword', type: 'BOOLEAN NOT NULL DEFAULT false' },
      { name: 'passwordResetToken', type: 'TEXT' },
      { name: 'lastSignedIn', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of columnsToAdd) {
      await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`)
        .catch(err => {
          if (!err.message.includes("Duplicate column name")) {
            console.log(`[Setup] Warning: Could not add column ${col.name}:`, err.message);
          }
        });
    }

    // =========================================================================
    // SUPPLIERS
    // =========================================================================
    console.log("[Setup] Creating suppliers table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        cnpj VARCHAR(18),
        contactName VARCHAR(255),
        contactEmail VARCHAR(320),
        contactPhone VARCHAR(20),
        active BOOLEAN NOT NULL DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // JOB FUNCTIONS
    // =========================================================================
    console.log("[Setup] Creating job_functions table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS job_functions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // EVENTS
    // =========================================================================
    console.log("[Setup] Creating events table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        wo VARCHAR(100),
        eventDate DATE NOT NULL,
        registrationDeadline DATE NOT NULL DEFAULT '2099-12-31',
        credentialReleaseDate DATE NOT NULL DEFAULT '2099-12-31',
        location VARCHAR(255),
        eventType VARCHAR(100),
        federation VARCHAR(100),
        isConfidential BOOLEAN NOT NULL DEFAULT false,
        status ENUM('aberto', 'em_verificacao', 'extraido', 'enviado', 'concluido') NOT NULL DEFAULT 'aberto',
        notes TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        createdBy INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Migrate: add columns if table existed before deadlines feature
    await connection.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS registrationDeadline DATE NOT NULL DEFAULT '2099-12-31';`).catch(() => {});
    await connection.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS credentialReleaseDate DATE NOT NULL DEFAULT '2099-12-31';`).catch(() => {});

    // =========================================================================
    // EVENT FUNCTION LIMITS
    // =========================================================================
    console.log("[Setup] Creating event_function_limits table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS event_function_limits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT NOT NULL,
        jobFunctionId INT NOT NULL,
        maxCount INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // COLLABORATORS
    // =========================================================================
    console.log("[Setup] Creating collaborators table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS collaborators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplierId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) NOT NULL,
        email VARCHAR(320) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        photoUrl TEXT,
        jobFunctionId INT,
        defaultJobFunctionId INT,
        access VARCHAR(255),
        vehicleInfo TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // ACCREDITATIONS
    // =========================================================================
    console.log("[Setup] Creating accreditations table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accreditations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT NOT NULL,
        collaboratorId INT NOT NULL,
        jobFunctionId INT NOT NULL,
        status ENUM('pendente', 'aprovado', 'rejeitado', 'credenciado') NOT NULL DEFAULT 'pendente',
        notes TEXT,
        approvedBy INT,
        approvedAt TIMESTAMP NULL,
        createdBy INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // AUDIT LOGS
    // =========================================================================
    console.log("[Setup] Creating audit_logs table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        userName VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        entityType VARCHAR(50) NOT NULL,
        entityId INT,
        details TEXT,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // EVENT SUPPLIERS (Access Control)
    // =========================================================================
    console.log("[Setup] Creating event_suppliers table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS event_suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT NOT NULL,
        supplierId INT NOT NULL,
        grantedBy INT NOT NULL,
        grantedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revokedBy INT,
        revokedAt TIMESTAMP NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // EXPORTS
    // =========================================================================
    console.log("[Setup] Creating exports table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT,
        exportType VARCHAR(50) NOT NULL,
        fileName VARCHAR(255) NOT NULL,
        fileUrl TEXT NOT NULL,
        fileKey VARCHAR(500) NOT NULL,
        filters TEXT,
        exportedBy INT NOT NULL,
        exportedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // BATCH IMPORTS
    // =========================================================================
    console.log("[Setup] Creating batch_imports table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS batch_imports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT,
        supplierId INT NOT NULL,
        fileName VARCHAR(255) NOT NULL,
        fileUrl TEXT NOT NULL,
        fileKey VARCHAR(500) NOT NULL,
        status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
        totalRows INT,
        successRows INT,
        errorRows INT,
        errorDetails TEXT,
        processedBy INT NOT NULL,
        processedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =========================================================================
    // VEHICLES
    // =========================================================================
    console.log("[Setup] Creating vehicles table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplierId INT NOT NULL,
        model VARCHAR(255) NOT NULL,
        plate VARCHAR(20) NOT NULL UNIQUE,
        color VARCHAR(50),
        type VARCHAR(100),
        active BOOLEAN NOT NULL DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    console.log("[Setup] Database initialization successful!");
    await connection.end();
  } catch (error) {
    console.error("[Setup] Failed to initialize database:", error);
    process.exit(0);
  }
}

setup();
