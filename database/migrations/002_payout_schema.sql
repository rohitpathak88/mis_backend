-- ============================================================
-- PAYOUT MODULE V1
-- Team Leader payout based on total APPROVED amount.
-- ============================================================

CREATE TABLE IF NOT EXISTS payout_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT UNSIGNED NOT NULL,
    min_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    max_amount DECIMAL(18,2) NULL,
    payout_rate DECIMAL(8,4) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_payout_rules_org (organization_id, status),
    INDEX idx_payout_rules_effective (organization_id, effective_from, effective_to)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payout_periods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT UNSIGNED NOT NULL,
    period_month DATE NOT NULL,
    status ENUM('DRAFT','CALCULATED','REVIEWED','APPROVED','PAID','LOCKED') NOT NULL DEFAULT 'DRAFT',
    created_by BIGINT UNSIGNED NOT NULL,
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_payout_period_org_month (organization_id, period_month),
    INDEX idx_payout_period_status (organization_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payouts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT UNSIGNED NOT NULL,
    payout_period_id BIGINT UNSIGNED NOT NULL,
    team_id BIGINT UNSIGNED NOT NULL,
    team_leader_id BIGINT UNSIGNED NOT NULL,
    total_approved_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    payout_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
    payout_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    status ENUM('CALCULATED','REVIEWED','APPROVED','PAID','LOCKED') NOT NULL DEFAULT 'CALCULATED',
    calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (payout_period_id) REFERENCES payout_periods(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (team_leader_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_payout_period_team (payout_period_id, team_id),
    INDEX idx_payout_org_period (organization_id, payout_period_id),
    INDEX idx_payout_team (organization_id, team_id),
    INDEX idx_payout_leader (organization_id, team_leader_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payout_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id BIGINT UNSIGNED NOT NULL,
    payout_id BIGINT UNSIGNED NOT NULL,
    loan_id BIGINT UNSIGNED NOT NULL,
    approved_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    bank_approval_date DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loan_disbursements(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_payout_item_loan (payout_id, loan_id),
    INDEX idx_payout_items_period (organization_id, payout_id),
    INDEX idx_payout_items_loan (organization_id, loan_id)
) ENGINE=InnoDB;
