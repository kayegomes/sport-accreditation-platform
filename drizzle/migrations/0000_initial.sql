CREATE TABLE IF NOT EXISTS \`suppliers\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`name\` varchar(255) NOT NULL,
  \`cnpj\` varchar(18),
  \`contactName\` varchar(255),
  \`contactEmail\` varchar(320),
  \`contactPhone\` varchar(20),
  \`active\` boolean NOT NULL DEFAULT true,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`cnpj_idx\` (\`cnpj\`)
);

CREATE TABLE IF NOT EXISTS \`job_functions\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`name\` varchar(255) NOT NULL UNIQUE,
  \`description\` text,
  \`active\` boolean NOT NULL DEFAULT true,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS \`events\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`name\` varchar(255) NOT NULL,
  \`wo\` varchar(100),
  \`eventDate\` date NOT NULL,
  \`registrationDeadline\` date NOT NULL,
  \`credentialReleaseDate\` date NOT NULL,
  \`location\` varchar(255),
  \`eventType\` varchar(100),
  \`federation\` varchar(100),
  \`status\` enum('aberto', 'em_verificacao', 'extraido', 'enviado', 'concluido') NOT NULL DEFAULT 'aberto',
  \`notes\` text,
  \`active\` boolean NOT NULL DEFAULT true,
  \`createdBy\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`wo_idx\` (\`wo\`),
  INDEX \`event_date_idx\` (\`eventDate\`),
  INDEX \`status_idx\` (\`status\`),
  INDEX \`federation_idx\` (\`federation\`)
);

CREATE TABLE IF NOT EXISTS \`event_function_limits\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`eventId\` int NOT NULL,
  \`jobFunctionId\` int NOT NULL,
  \`maxCount\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`event_function_idx\` (\`eventId\`, \`jobFunctionId\`)
);

CREATE TABLE IF NOT EXISTS \`collaborators\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`supplierId\` int NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`cpf\` varchar(14) NOT NULL,
  \`email\` varchar(320) NOT NULL,
  \`phone\` varchar(20) NOT NULL,
  \`photoUrl\` text,
  \`defaultJobFunctionId\` int,
  \`vehicleInfo\` text,
  \`active\` boolean NOT NULL DEFAULT true,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`cpf_idx\` (\`cpf\`),
  INDEX \`supplier_idx\` (\`supplierId\`),
  INDEX \`email_idx\` (\`email\`)
);

CREATE TABLE IF NOT EXISTS \`accreditations\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`eventId\` int NOT NULL,
  \`collaboratorId\` int NOT NULL,
  \`jobFunctionId\` int NOT NULL,
  \`status\` enum('pendente', 'aprovado', 'rejeitado', 'credenciado') NOT NULL DEFAULT 'pendente',
  \`notes\` text,
  \`approvedBy\` int,
  \`approvedAt\` timestamp,
  \`createdBy\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`event_collaborator_idx\` (\`eventId\`, \`collaboratorId\`),
  INDEX \`event_idx\` (\`eventId\`),
  INDEX \`collaborator_idx\` (\`collaboratorId\`),
  INDEX \`status_idx\` (\`status\`)
);

CREATE TABLE IF NOT EXISTS \`documents\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`collaboratorId\` int NOT NULL,
  \`documentType\` varchar(50) NOT NULL,
  \`fileName\` varchar(255) NOT NULL,
  \`fileUrl\` text NOT NULL,
  \`fileKey\` varchar(500) NOT NULL,
  \`mimeType\` varchar(100),
  \`fileSize\` int,
  \`uploadedBy\` int NOT NULL,
  \`uploadedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`collaborator_idx\` (\`collaboratorId\`)
);

CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`userId\` int NOT NULL,
  \`userName\` varchar(255),
  \`action\` varchar(50) NOT NULL,
  \`entityType\` varchar(50) NOT NULL,
  \`entityId\` int,
  \`details\` text,
  \`ipAddress\` varchar(45),
  \`userAgent\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`user_idx\` (\`userId\`),
  INDEX \`entity_idx\` (\`entityType\`, \`entityId\`),
  INDEX \`action_idx\` (\`action\`),
  INDEX \`created_at_idx\` (\`createdAt\`)
);

CREATE TABLE IF NOT EXISTS \`notifications\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`eventId\` int,
  \`recipientEmail\` varchar(320) NOT NULL,
  \`recipientName\` varchar(255),
  \`subject\` varchar(500) NOT NULL,
  \`body\` text NOT NULL,
  \`notificationType\` varchar(50) NOT NULL,
  \`status\` enum('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  \`sentAt\` timestamp,
  \`errorMessage\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`event_idx\` (\`eventId\`),
  INDEX \`status_idx\` (\`status\`),
  INDEX \`type_idx\` (\`notificationType\`)
);

CREATE TABLE IF NOT EXISTS \`batch_imports\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`eventId\` int,
  \`supplierId\` int NOT NULL,
  \`fileName\` varchar(255) NOT NULL,
  \`fileUrl\` text NOT NULL,
  \`fileKey\` varchar(500) NOT NULL,
  \`status\` enum('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  \`totalRows\` int,
  \`successRows\` int,
  \`errorRows\` int,
  \`errorDetails\` text,
  \`processedBy\` int NOT NULL,
  \`processedAt\` timestamp,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`event_idx\` (\`eventId\`),
  INDEX \`supplier_idx\` (\`supplierId\`),
  INDEX \`status_idx\` (\`status\`)
);

CREATE TABLE IF NOT EXISTS \`exports\` (
  \`id\` int AUTO_INCREMENT PRIMARY KEY,
  \`eventId\` int,
  \`exportType\` varchar(50) NOT NULL,
  \`fileName\` varchar(255) NOT NULL,
  \`fileUrl\` text NOT NULL,
  \`fileKey\` varchar(500) NOT NULL,
  \`filters\` text,
  \`exportedBy\` int NOT NULL,
  \`exportedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`event_idx\` (\`eventId\`),
  INDEX \`exported_by_idx\` (\`exportedBy\`)
);

ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`supplierId\` int;
ALTER TABLE \`users\` ADD INDEX IF NOT EXISTS \`supplier_idx\` (\`supplierId\`);
ALTER TABLE \`users\` MODIFY COLUMN \`role\` enum('admin', 'fornecedor', 'consulta') NOT NULL DEFAULT 'fornecedor';
