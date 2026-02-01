-- Migration: Add note column to transactions table
-- Date: 2026-01-31
-- Bug: BUG-005 - Note field does not save user input

ALTER TABLE transactions ADD COLUMN note TEXT;
