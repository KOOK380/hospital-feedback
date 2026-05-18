-- ============================================================================
-- Hospital Patient & Employee Satisfaction Survey Management System
-- MySQL Database Schema for Shared Hosting
-- Version: 1.0.0
-- Generated: 2024
-- ============================================================================

-- Create database (uncomment if you want to create a new database)
-- CREATE DATABASE IF NOT EXISTS hospital_survey_system;
-- USE hospital_survey_system;

-- Set character set
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- ROLES & PERMISSIONS
-- ============================================================================

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `displayName` VARCHAR(100) NOT NULL,
  `permissions` TEXT NOT NULL DEFAULT '[]',
  `description` TEXT DEFAULT NULL,
  `isDefault` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`),
  KEY `roles_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `headId` VARCHAR(30) DEFAULT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_name_unique` (`name`),
  UNIQUE KEY `departments_code_unique` (`code`),
  UNIQUE KEY `departments_headId_unique` (`headId`),
  KEY `departments_code_idx` (`code`),
  KEY `departments_isActive_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- USERS
-- ============================================================================

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(30) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `password` VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed',
  `phone` VARCHAR(30) DEFAULT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL,
  `roleId` VARCHAR(30) NOT NULL,
  `departmentId` VARCHAR(30) DEFAULT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `isVerified` TINYINT(1) NOT NULL DEFAULT 0,
  `lastLoginAt` DATETIME(3) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) DEFAULT NULL COMMENT 'Soft delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_email_idx` (`email`),
  KEY `users_roleId_idx` (`roleId`),
  KEY `users_departmentId_idx` (`departmentId`),
  KEY `users_isActive_idx` (`isActive`),
  KEY `users_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `users_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add department head foreign key
ALTER TABLE `departments`
  ADD CONSTRAINT `departments_headId_fkey` FOREIGN KEY (`headId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- SESSIONS
-- ============================================================================

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` VARCHAR(30) NOT NULL,
  `userId` VARCHAR(30) NOT NULL,
  `token` VARCHAR(500) NOT NULL,
  `device` VARCHAR(255) DEFAULT NULL,
  `ip` VARCHAR(45) DEFAULT NULL COMMENT 'IPv6 compatible',
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_token_unique` (`token`),
  KEY `sessions_token_idx` (`token`),
  KEY `sessions_userId_idx` (`userId`),
  KEY `sessions_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SURVEYS
-- ============================================================================

DROP TABLE IF EXISTS `surveys`;
CREATE TABLE `surveys` (
  `id` VARCHAR(30) NOT NULL,
  `title` VARCHAR(300) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `type` VARCHAR(20) NOT NULL COMMENT 'PATIENT | EMPLOYEE',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `isAnonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `startDate` DATETIME(3) DEFAULT NULL,
  `endDate` DATETIME(3) DEFAULT NULL,
  `createdBy` VARCHAR(30) NOT NULL,
  `departmentId` VARCHAR(30) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `surveys_type_idx` (`type`),
  KEY `surveys_isActive_idx` (`isActive`),
  KEY `surveys_createdBy_idx` (`createdBy`),
  KEY `surveys_departmentId_idx` (`departmentId`),
  KEY `surveys_deletedAt_idx` (`deletedAt`),
  CONSTRAINT `surveys_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `surveys_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SURVEY QUESTIONS
-- ============================================================================

DROP TABLE IF EXISTS `survey_questions`;
CREATE TABLE `survey_questions` (
  `id` VARCHAR(30) NOT NULL,
  `surveyId` VARCHAR(30) NOT NULL,
  `questionText` TEXT NOT NULL,
  `questionType` VARCHAR(30) NOT NULL COMMENT 'STAR_RATING | TEXT | MULTIPLE_CHOICE | YES_NO | DROPDOWN',
  `options` TEXT NOT NULL DEFAULT '[]' COMMENT 'JSON array of options for MCQ/Dropdown',
  `order` INT NOT NULL DEFAULT 0,
  `isRequired` TINYINT(1) NOT NULL DEFAULT 1,
  `category` VARCHAR(100) DEFAULT NULL COMMENT 'e.g., Cleanliness, Staff Behavior',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `survey_questions_surveyId_idx` (`surveyId`),
  KEY `survey_questions_questionType_idx` (`questionType`),
  KEY `survey_questions_category_idx` (`category`),
  CONSTRAINT `survey_questions_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `surveys` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SURVEY RESPONSES
-- ============================================================================

DROP TABLE IF EXISTS `survey_responses`;
CREATE TABLE `survey_responses` (
  `id` VARCHAR(30) NOT NULL,
  `surveyId` VARCHAR(30) NOT NULL,
  `respondentId` VARCHAR(30) DEFAULT NULL COMMENT 'null for anonymous',
  `departmentId` VARCHAR(30) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' COMMENT 'COMPLETED | PARTIAL | ABANDONED',
  `isAnonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `overallRating` DOUBLE DEFAULT NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `survey_responses_surveyId_idx` (`surveyId`),
  KEY `survey_responses_respondentId_idx` (`respondentId`),
  KEY `survey_responses_departmentId_idx` (`departmentId`),
  KEY `survey_responses_status_idx` (`status`),
  KEY `survey_responses_submittedAt_idx` (`submittedAt`),
  KEY `survey_responses_overallRating_idx` (`overallRating`),
  CONSTRAINT `survey_responses_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `surveys` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `survey_responses_respondentId_fkey` FOREIGN KEY (`respondentId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SURVEY ANSWERS
-- ============================================================================

DROP TABLE IF EXISTS `survey_answers`;
CREATE TABLE `survey_answers` (
  `id` VARCHAR(30) NOT NULL,
  `responseId` VARCHAR(30) NOT NULL,
  `questionId` VARCHAR(30) NOT NULL,
  `answerText` TEXT DEFAULT NULL COMMENT 'For text answers',
  `answerNumber` DOUBLE DEFAULT NULL COMMENT 'For star ratings',
  `answerChoice` VARCHAR(200) DEFAULT NULL COMMENT 'For MCQ/YesNo/Dropdown selected option',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `survey_answers_responseId_idx` (`responseId`),
  KEY `survey_answers_questionId_idx` (`questionId`),
  KEY `survey_answers_answerNumber_idx` (`answerNumber`),
  CONSTRAINT `survey_answers_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `survey_responses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `survey_answers_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `survey_questions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- APPOINTMENTS
-- ============================================================================

DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `id` VARCHAR(30) NOT NULL,
  `patientName` VARCHAR(200) NOT NULL,
  `patientPhone` VARCHAR(30) NOT NULL,
  `patientEmail` VARCHAR(255) DEFAULT NULL,
  `departmentId` VARCHAR(30) NOT NULL,
  `doctorName` VARCHAR(200) DEFAULT NULL,
  `appointmentDate` DATETIME(3) NOT NULL,
  `appointmentTime` VARCHAR(10) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' COMMENT 'SCHEDULED | COMPLETED | CANCELLED | NO_SHOW',
  `visitType` VARCHAR(20) DEFAULT NULL COMMENT 'OPD | IPD | EMERGENCY',
  `notes` TEXT DEFAULT NULL,
  `surveySent` TINYINT(1) NOT NULL DEFAULT 0,
  `surveySentAt` DATETIME(3) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `appointments_departmentId_idx` (`departmentId`),
  KEY `appointments_appointmentDate_idx` (`appointmentDate`),
  KEY `appointments_status_idx` (`status`),
  KEY `appointments_surveySent_idx` (`surveySent`),
  CONSTRAINT `appointments_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SMS TEMPLATES
-- ============================================================================

DROP TABLE IF EXISTS `sms_templates`;
CREATE TABLE `sms_templates` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL COMMENT 'Template with {{variable}} placeholders',
  `variables` TEXT NOT NULL DEFAULT '[]' COMMENT 'JSON array of variable names',
  `type` VARCHAR(30) NOT NULL COMMENT 'SURVEY | APPOINTMENT | REMINDER | CUSTOM',
  `category` VARCHAR(20) DEFAULT NULL COMMENT 'PATIENT | EMPLOYEE',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `surveyId` VARCHAR(30) DEFAULT NULL COMMENT 'Link to survey for survey SMS',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `sms_templates_type_idx` (`type`),
  KEY `sms_templates_isActive_idx` (`isActive`),
  KEY `sms_templates_surveyId_idx` (`surveyId`),
  CONSTRAINT `sms_templates_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `surveys` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SMS LOGS
-- ============================================================================

DROP TABLE IF EXISTS `sms_logs`;
CREATE TABLE `sms_logs` (
  `id` VARCHAR(30) NOT NULL,
  `templateId` VARCHAR(30) DEFAULT NULL,
  `recipientName` VARCHAR(200) DEFAULT NULL,
  `recipientPhone` VARCHAR(30) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | SENT | DELIVERED | FAILED',
  `provider` VARCHAR(30) DEFAULT NULL COMMENT 'TWILIO | MSG91 | TEXTLOCAL | CUSTOM',
  `providerMsgId` VARCHAR(100) DEFAULT NULL,
  `sentAt` DATETIME(3) DEFAULT NULL,
  `deliveredAt` DATETIME(3) DEFAULT NULL,
  `failureReason` TEXT DEFAULT NULL,
  `retryCount` INT NOT NULL DEFAULT 0,
  `departmentId` VARCHAR(30) DEFAULT NULL,
  `appointmentId` VARCHAR(30) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `sms_logs_status_idx` (`status`),
  KEY `sms_logs_provider_idx` (`provider`),
  KEY `sms_logs_templateId_idx` (`templateId`),
  KEY `sms_logs_departmentId_idx` (`departmentId`),
  KEY `sms_logs_recipientPhone_idx` (`recipientPhone`),
  KEY `sms_logs_createdAt_idx` (`createdAt`),
  CONSTRAINT `sms_logs_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `sms_templates` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sms_logs_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SMS CAMPAIGNS
-- ============================================================================

DROP TABLE IF EXISTS `sms_campaigns`;
CREATE TABLE `sms_campaigns` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `templateId` VARCHAR(30) NOT NULL,
  `type` VARCHAR(20) NOT NULL COMMENT 'MANUAL | AUTOMATED',
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT | SCHEDULED | RUNNING | COMPLETED | PAUSED',
  `scheduleAt` DATETIME(3) DEFAULT NULL,
  `targetGroup` VARCHAR(50) DEFAULT NULL COMMENT 'ALL_PATIENTS | DEPARTMENT | CUSTOM',
  `targetCriteria` TEXT DEFAULT NULL COMMENT 'JSON filter criteria',
  `totalSent` INT NOT NULL DEFAULT 0,
  `totalDelivered` INT NOT NULL DEFAULT 0,
  `totalFailed` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `sms_campaigns_status_idx` (`status`),
  KEY `sms_campaigns_templateId_idx` (`templateId`),
  KEY `sms_campaigns_scheduleAt_idx` (`scheduleAt`),
  CONSTRAINT `sms_campaigns_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `sms_templates` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(30) NOT NULL,
  `userId` VARCHAR(30) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(20) NOT NULL COMMENT 'INFO | WARNING | SUCCESS | ERROR | SURVEY | SMS',
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `link` VARCHAR(500) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notifications_userId_idx` (`userId`),
  KEY `notifications_isRead_idx` (`isRead`),
  KEY `notifications_createdAt_idx` (`createdAt`),
  CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ATTACHMENTS
-- ============================================================================

DROP TABLE IF EXISTS `attachments`;
CREATE TABLE `attachments` (
  `id` VARCHAR(30) NOT NULL,
  `userId` VARCHAR(30) DEFAULT NULL,
  `entityType` VARCHAR(30) NOT NULL COMMENT 'SURVEY | RESPONSE | SMS | REPORT',
  `entityId` VARCHAR(30) NOT NULL COMMENT 'ID of the related entity',
  `fileName` VARCHAR(255) NOT NULL,
  `fileUrl` VARCHAR(500) NOT NULL,
  `fileType` VARCHAR(100) NOT NULL COMMENT 'MIME type',
  `fileSize` INT NOT NULL COMMENT 'bytes',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `attachments_entityType_entityId_idx` (`entityType`, `entityId`),
  KEY `attachments_userId_idx` (`userId`),
  CONSTRAINT `attachments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` VARCHAR(30) NOT NULL,
  `userId` VARCHAR(30) DEFAULT NULL,
  `action` VARCHAR(30) NOT NULL COMMENT 'CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT',
  `entityType` VARCHAR(30) DEFAULT NULL COMMENT 'SURVEY | USER | DEPARTMENT | SMS | etc.',
  `entityId` VARCHAR(30) DEFAULT NULL,
  `details` TEXT NOT NULL DEFAULT '{}' COMMENT 'JSON details',
  `ipAddress` VARCHAR(45) DEFAULT NULL,
  `userAgent` TEXT DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_userId_idx` (`userId`),
  KEY `audit_logs_action_idx` (`action`),
  KEY `audit_logs_entityType_idx` (`entityType`),
  KEY `audit_logs_createdAt_idx` (`createdAt`),
  CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ANALYTICS CACHE
-- ============================================================================

DROP TABLE IF EXISTS `analytics_cache`;
CREATE TABLE `analytics_cache` (
  `id` VARCHAR(30) NOT NULL,
  `key` VARCHAR(200) NOT NULL,
  `data` LONGTEXT NOT NULL DEFAULT '{}' COMMENT 'JSON data',
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `analytics_cache_key_unique` (`key`),
  KEY `analytics_cache_key_idx` (`key`),
  KEY `analytics_cache_expiresAt_idx` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

DROP TABLE IF EXISTS `integrations`;
CREATE TABLE `integrations` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `type` VARCHAR(50) NOT NULL COMMENT 'SMS_TWILIO | SMS_MSG91 | SMS_TEXTLOCAL | CONCEPT_SOFTWARE | WEBHOOK',
  `config` TEXT NOT NULL DEFAULT '{}' COMMENT 'JSON config (encrypted sensitive data)',
  `isActive` TINYINT(1) NOT NULL DEFAULT 0,
  `lastSyncAt` DATETIME(3) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `integrations_type_idx` (`type`),
  KEY `integrations_isActive_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` VARCHAR(30) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  `category` VARCHAR(30) NOT NULL DEFAULT 'GENERAL' COMMENT 'GENERAL | SMS | EMAIL | SECURITY | INTEGRATION',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_settings_key_unique` (`key`),
  KEY `system_settings_key_idx` (`key`),
  KEY `system_settings_category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default roles
INSERT INTO `roles` (`id`, `name`, `displayName`, `permissions`, `description`, `isDefault`) VALUES
('role_super_admin', 'SUPER_ADMIN', 'Super Admin', '["all"]', 'Full system access', 0),
('role_it_admin', 'IT_ADMIN', 'IT Admin', '["manage_users","manage_system","view_analytics","manage_integrations"]', 'IT Administration', 0),
('role_hr', 'HR', 'HR', '["manage_employees","view_surveys","view_analytics","manage_departments"]', 'Human Resources', 0),
('role_accounts', 'ACCOUNTS', 'Accounts', '["view_reports","view_analytics","export_data"]', 'Accounts Department', 0),
('role_reception', 'RECEPTION', 'Reception', '["manage_appointments","send_sms","view_surveys"]', 'Front Desk/Reception', 0),
('role_quality', 'QUALITY', 'Quality', '["manage_surveys","view_analytics","view_reports","export_data"]', 'Quality Assurance', 0),
('role_authorized', 'AUTHORIZED', 'Authorized User', '["view_surveys","view_analytics"]', 'Standard authorized user', 1);

-- Insert default departments
INSERT INTO `departments` (`id`, `name`, `code`, `description`, `isActive`) VALUES
('dept_gen', 'General Medicine', 'GEN', 'General Medicine Department', 1),
('dept_card', 'Cardiology', 'CARD', 'Heart & Cardiovascular Department', 1),
('dept_ortho', 'Orthopedics', 'ORTHO', 'Bone & Joint Department', 1),
('dept_ped', 'Pediatrics', 'PED', 'Child Care Department', 1),
('dept_neuro', 'Neurology', 'NEURO', 'Brain & Nervous System Department', 1),
('dept_obs', 'Obstetrics & Gynecology', 'OBS', 'Women''s Health Department', 1),
('dept_emrg', 'Emergency', 'EMRG', 'Emergency & Trauma Department', 1),
('dept_hr', 'Human Resources', 'HR', 'HR Department', 1),
('dept_it', 'Information Technology', 'IT', 'IT Department', 1),
('dept_admin', 'Administration', 'ADMIN', 'Hospital Administration', 1);

-- Insert default Super Admin user (password: admin123)
-- IMPORTANT: Replace the bcrypt hash below with an actual hash.
-- Generate using: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"
INSERT INTO `users` (`id`, `email`, `name`, `password`, `phone`, `roleId`, `departmentId`, `isActive`, `isVerified`) VALUES
('user_admin', 'admin@hospital.com', 'Dr. Admin Super', '$2a$10$REPLACE_WITH_ACTUAL_BCRYPT_HASH', '+919876543210', 'role_super_admin', 'dept_admin', 1, 1);

-- Insert default system settings
INSERT INTO `system_settings` (`id`, `key`, `value`, `category`) VALUES
('setting_1', 'hospitalName', 'City General Hospital', 'GENERAL'),
('setting_2', 'hospitalLogoUrl', '', 'GENERAL'),
('setting_3', 'timezone', 'Asia/Kolkata', 'GENERAL'),
('setting_4', 'defaultLanguage', 'en', 'GENERAL'),
('setting_5', 'systemEmail', 'admin@hospital.com', 'GENERAL'),
('setting_6', 'defaultSmsProvider', 'TWILIO', 'SMS'),
('setting_7', 'smsRetryCount', '3', 'SMS'),
('setting_8', 'smsRetryInterval', '5', 'SMS'),
('setting_9', 'autoSendSmsAfterAppointments', 'false', 'SMS'),
('setting_10', 'sessionTimeoutDuration', '30', 'SECURITY'),
('setting_11', 'maxLoginAttempts', '5', 'SECURITY'),
('setting_12', 'passwordMinLength', '8', 'SECURITY'),
('setting_13', 'requireSpecialCharacters', 'true', 'SECURITY'),
('setting_14', 'twoFactorAuthEnabled', 'false', 'SECURITY'),
('setting_15', 'defaultAnonymousMode', 'true', 'GENERAL'),
('setting_16', 'minimumQuestionsRequired', '3', 'GENERAL'),
('setting_17', 'autoCloseSurveyDays', '30', 'GENERAL'),
('setting_18', 'surveyLinkBaseUrl', 'https://survey.hospital.com', 'GENERAL');

-- ============================================================================
-- NOTES FOR SHARED HOSTING DEPLOYMENT
-- ============================================================================
-- 
-- 1. BEFORE IMPORTING: Generate the actual bcrypt hash for the admin password.
--    Run: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"
--    Replace $2a$10$REPLACE_WITH_ACTUAL_BCRYPT_HASH with the generated hash.
--
-- 2. SHARED HOSTING SETUP:
--    a. Create a MySQL database via cPanel/phpMyAdmin
--    b. Import this SQL file via phpMyAdmin Import tab
--    c. Create a .env file in your project root:
--       DATABASE_URL="mysql://db_user:db_password@localhost:3306/db_name"
--       JWT_SECRET="your-secret-key-change-this"
--       NEXT_PUBLIC_APP_URL="https://yourdomain.com"
--    d. Run: npx prisma generate
--    e. Build: npm run build
--    f. Start: npm start (or use PM2 for process management)
--
-- 3. CHARACTER SET: utf8mb4 supports all Unicode characters including emojis
--
-- 4. FOREIGN KEYS: Proper CASCADE and SET NULL rules are configured
--
-- 5. INDEXES: Created for frequently queried columns for optimal performance
--
-- 6. TABLE COUNT: 17 tables total
--    - roles, departments, users, sessions
--    - surveys, survey_questions, survey_responses, survey_answers
--    - appointments
--    - sms_templates, sms_logs, sms_campaigns
--    - notifications, attachments, audit_logs
--    - analytics_cache, integrations, system_settings
-- ============================================================================
