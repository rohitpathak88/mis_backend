CREATE DATABASE IF NOT EXISTS mis_platform
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE mis_platform;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS loan_reconciliations;
DROP TABLE IF EXISTS loan_disbursements;
DROP TABLE IF EXISTS mis_imports;
DROP TABLE IF EXISTS mis_periods;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS organizations;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,

    status ENUM('ACTIVE','INACTIVE')
        NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_organization_code (code),
    UNIQUE KEY uq_organization_name (name)
) ENGINE=InnoDB;


-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_role_name (name)
) ENGINE=InnoDB;


-- ============================================================
-- DEPARTMENTS
-- ============================================================

CREATE TABLE departments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    organization_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),

    status ENUM('ACTIVE','INACTIVE')
        NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    UNIQUE KEY uq_department_org_name (
        organization_id,
        name
    ),

    UNIQUE KEY uq_department_org_code (
        organization_id,
        code
    ),

    INDEX idx_departments_organization (
        organization_id
    ),

    INDEX idx_departments_status (
        organization_id,
        status
    )
) ENGINE=InnoDB;


-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE teams (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    organization_id BIGINT UNSIGNED NOT NULL,
    department_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),

    status ENUM('ACTIVE','INACTIVE')
        NOT NULL DEFAULT 'ACTIVE',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    UNIQUE KEY uq_team_department_name (
        department_id,
        name
    ),

    UNIQUE KEY uq_team_department_code (
        department_id,
        code
    ),

    INDEX idx_teams_organization (
        organization_id
    ),

    INDEX idx_teams_department (
        department_id
    ),

    INDEX idx_teams_org_department (
        organization_id,
        department_id
    ),

    INDEX idx_teams_status (
        organization_id,
        status
    )
) ENGINE=InnoDB;


-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    organization_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,

    department_id BIGINT UNSIGNED NULL,
    team_id BIGINT UNSIGNED NULL,

    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    status ENUM('ACTIVE','INACTIVE')
        NOT NULL DEFAULT 'ACTIVE',

    last_login_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    UNIQUE KEY uq_user_email (email),

    INDEX idx_users_organization (
        organization_id
    ),

    INDEX idx_users_role (
        role_id
    ),

    INDEX idx_users_department (
        department_id
    ),

    INDEX idx_users_team (
        team_id
    ),

    INDEX idx_users_org_department (
        organization_id,
        department_id
    ),

    INDEX idx_users_org_team (
        organization_id,
        team_id
    ),

    INDEX idx_users_status (
        organization_id,
        status
    )
) ENGINE=InnoDB;


-- ============================================================
-- MIS PERIODS
--
-- Business-level monthly MIS record.
--
-- Example:
-- Team A + June 2026 = one MIS period
-- Team A + July 2026 = another MIS period
-- ============================================================

CREATE TABLE mis_periods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    organization_id BIGINT UNSIGNED NOT NULL,
    team_id BIGINT UNSIGNED NOT NULL,

    reporting_month DATE NOT NULL,

    status ENUM(
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'RECONCILED',
        'APPROVED',
        'REJECTED',
        'LOCKED'
    ) NOT NULL DEFAULT 'DRAFT',

    created_by BIGINT UNSIGNED NOT NULL,
    submitted_by BIGINT UNSIGNED NULL,
    reviewed_by BIGINT UNSIGNED NULL,
    approved_by BIGINT UNSIGNED NULL,

    submitted_at DATETIME NULL,
    reviewed_at DATETIME NULL,
    approved_at DATETIME NULL,
    locked_at DATETIME NULL,

    remarks TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (submitted_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    UNIQUE KEY uq_mis_period_team_month (
        organization_id,
        team_id,
        reporting_month
    ),

    INDEX idx_mis_period_org (
        organization_id
    ),

    INDEX idx_mis_period_status (
        organization_id,
        status
    ),

    INDEX idx_mis_period_month (
        organization_id,
        reporting_month
    ),

    INDEX idx_mis_period_team (
        organization_id,
        team_id
    )
) ENGINE=InnoDB;


-- ============================================================
-- MIS IMPORTS
-- ============================================================

CREATE TABLE mis_imports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    organization_id BIGINT UNSIGNED NOT NULL,

    mis_period_id BIGINT UNSIGNED NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255),

    reporting_month DATE NOT NULL,

    total_rows INT UNSIGNED NOT NULL DEFAULT 0,
    successful_rows INT UNSIGNED NOT NULL DEFAULT 0,
    failed_rows INT UNSIGNED NOT NULL DEFAULT 0,

    status ENUM(
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    ) NOT NULL DEFAULT 'PROCESSING',

    error_message TEXT NULL,

    imported_by BIGINT UNSIGNED NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (mis_period_id)
        REFERENCES mis_periods(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (imported_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_mis_imports_organization (
        organization_id
    ),

    INDEX idx_mis_imports_period (
        organization_id,
        mis_period_id
    ),

    INDEX idx_mis_imports_month (
        organization_id,
        reporting_month
    ),

    INDEX idx_mis_imports_status (
        organization_id,
        status
    )
) ENGINE=InnoDB;


-- ============================================================
-- LOAN DISBURSEMENTS
-- ============================================================

CREATE TABLE loan_disbursements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    organization_id BIGINT UNSIGNED NOT NULL,

    department_id BIGINT UNSIGNED NULL,
    team_id BIGINT UNSIGNED NULL,

    mis_period_id BIGINT UNSIGNED NOT NULL,
    import_id BIGINT UNSIGNED NOT NULL,

    customer_name VARCHAR(255),
    contact_number VARCHAR(50),
    employer_name VARCHAR(255),

    bank_name VARCHAR(150),
    city VARCHAR(150),
    product VARCHAR(150),

    loan_account_no VARCHAR(150),

    disbursement_amount DECIMAL(18,2)
        NOT NULL DEFAULT 0,

    disbursement_month DATE NOT NULL,

    seller_name VARCHAR(255),

    team_name VARCHAR(150),
    dsa_code VARCHAR(100),

    cashback DECIMAL(18,2)
        NOT NULL DEFAULT 0,

    subvention DECIMAL(18,2)
        NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (mis_period_id)
        REFERENCES mis_periods(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (import_id)
        REFERENCES mis_imports(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_loan_organization (
        organization_id
    ),

    INDEX idx_loan_department (
        organization_id,
        department_id
    ),

    INDEX idx_loan_team (
        organization_id,
        team_id
    ),

    INDEX idx_loan_period (
        organization_id,
        mis_period_id
    ),

    INDEX idx_loan_import (
        organization_id,
        import_id
    ),

    INDEX idx_loan_month (
        organization_id,
        disbursement_month
    ),

    INDEX idx_loan_bank (
        organization_id,
        bank_name
    ),

    INDEX idx_loan_product (
        organization_id,
        product
    ),

    INDEX idx_loan_seller (
        organization_id,
        seller_name
    ),

    INDEX idx_loan_city (
        organization_id,
        city
    ),

    INDEX idx_loan_account (
        organization_id,
        loan_account_no
    )
) ENGINE=InnoDB;


-- ============================================================
-- LOAN RECONCILIATIONS
--
-- One reconciliation record per loan.
--
-- bank_approval_date is the key field for salary eligibility.
--
-- Example:
--
-- MIS Month       : June
-- Bank Approval   : July 05
-- Salary Period   : July
-- ============================================================

CREATE TABLE loan_reconciliations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    organization_id BIGINT UNSIGNED NOT NULL,

    loan_id BIGINT UNSIGNED NOT NULL,

    bank_amount DECIMAL(18,2) NULL,

    approved_amount DECIMAL(18,2)
        NOT NULL DEFAULT 0,

    status ENUM(
        'PENDING',
        'MATCHED',
        'VARIANCE',
        'NOT_FOUND',
        'APPROVED',
        'REJECTED'
    ) NOT NULL DEFAULT 'PENDING',

    bank_approval_date DATETIME NULL,

    remarks TEXT NULL,

    reconciled_by BIGINT UNSIGNED NULL,
    approved_by BIGINT UNSIGNED NULL,

    reconciled_at DATETIME NULL,
    approved_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (loan_id)
        REFERENCES loan_disbursements(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (reconciled_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    UNIQUE KEY uq_loan_reconciliation (
        loan_id
    ),

    INDEX idx_reconciliation_org (
        organization_id
    ),

    INDEX idx_reconciliation_status (
        organization_id,
        status
    ),

    INDEX idx_reconciliation_approval_date (
        organization_id,
        bank_approval_date
    ),

    INDEX idx_reconciliation_loan (
        organization_id,
        loan_id
    )
) ENGINE=InnoDB;


-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    organization_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(100),
    entity_id BIGINT UNSIGNED NULL,

    description TEXT,

    ip_address VARCHAR(45),
    user_agent VARCHAR(500),

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_audit_organization (
        organization_id
    ),

    INDEX idx_audit_user (
        user_id
    ),

    INDEX idx_audit_entity (
        entity_type,
        entity_id
    ),

    INDEX idx_audit_created (
        created_at
    )
) ENGINE=InnoDB;


-- ============================================================
-- DEFAULT ROLES
-- ============================================================

INSERT INTO roles
    (name, description)
VALUES
    (
        'SUPER_ADMIN',
        'Platform administrator'
    ),
    (
        'ORG_ADMIN',
        'Organization administrator'
    ),
    (
        'MANAGEMENT',
        'Organization management user'
    ),
    (
        'DEPARTMENT_HEAD',
        'Department head with department-level access'
    ),
    (
        'TEAM_LEADER',
        'Team leader with team-level access'
    ),
    (
        'MIS_USER',
        'MIS operations user'
    ),
    (
        'VIEWER',
        'Read-only organization user'
    );


-- ============================================================
-- DEMO ORGANIZATION
-- ============================================================

INSERT INTO organizations
    (name, code)
VALUES
    (
        'Demo Organization',
        'DEMO'
    );


-- ============================================================
-- DEMO DEPARTMENTS
-- ============================================================

INSERT INTO departments
    (
        organization_id,
        name,
        code
    )
VALUES
    (
        1,
        'Sales',
        'SALES'
    ),
    (
        1,
        'Operations',
        'OPS'
    );


-- ============================================================
-- DEMO TEAMS
-- ============================================================

INSERT INTO teams
    (
        organization_id,
        department_id,
        name,
        code
    )
VALUES
    (
        1,
        1,
        'Delhi Team',
        'DELHI'
    ),
    (
        1,
        1,
        'Noida Team',
        'NOIDA'
    ),
    (
        1,
        2,
        'Operations Team',
        'OPS-TEAM'
    );