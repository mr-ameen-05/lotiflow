-- Create database if not exists
CREATE DATABASE IF NOT EXISTS socflow;

-- Create dedicated SOCflow database user
CREATE USER IF NOT EXISTS 'socflow'@'localhost' IDENTIFIED BY 'socflow_pass';
CREATE USER IF NOT EXISTS 'socflow'@'127.0.0.1' IDENTIFIED BY 'socflow_pass';

-- Grant full permissions
GRANT ALL PRIVILEGES ON socflow.* TO 'socflow'@'localhost';
GRANT ALL PRIVILEGES ON socflow.* TO 'socflow'@'127.0.0.1';
FLUSH PRIVILEGES;
