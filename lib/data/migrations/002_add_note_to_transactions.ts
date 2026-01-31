// Auto-generated from 002_add_note_to_transactions.sql
// Migration: Add note column to transactions table
// Date: 2026-01-31
// Bug: BUG-005 - Note field does not save user input

const migration = `ALTER TABLE transactions ADD COLUMN note TEXT;`;

export default migration;
