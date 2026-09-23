-- Allow platform SUPER_ADMIN accounts to exist without belonging to an organization.
ALTER TABLE users
    MODIFY organization_id BIGINT UNSIGNED NULL;

-- SUPER_ADMIN is already seeded by migration 001. This migration only changes tenancy semantics.
