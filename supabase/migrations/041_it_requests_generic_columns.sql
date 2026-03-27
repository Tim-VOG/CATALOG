-- ================================================================
-- FIX: Add missing columns to it_requests for new request forms
-- Migration: 041_it_requests_generic_columns.sql
-- ================================================================

-- Add generic columns needed by Onboarding/Offboarding/Equipment request forms
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'it';
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES profiles(id);
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS requester_email VARCHAR(255);
ALTER TABLE it_requests ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255);

-- Ensure status column exists (it might already exist from old schema as empty string default)
-- Change default to 'pending' for new requests
ALTER TABLE it_requests ALTER COLUMN status SET DEFAULT 'pending';

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_it_requests_type ON it_requests(type);
CREATE INDEX IF NOT EXISTS idx_it_requests_requester ON it_requests(requester_id);
