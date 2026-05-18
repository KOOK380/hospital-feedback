-- Hospital Survey System - MySQL Init Script
-- This runs automatically when the MySQL Docker container starts for the first time

-- Ensure UTF8MB4 character set
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant full privileges to application user
GRANT ALL PRIVILEGES ON *.* TO 'survey_app'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
