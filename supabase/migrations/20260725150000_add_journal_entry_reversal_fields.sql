-- Add fields for journal entry reversal and soft delete tracking
-- This enables proper cascading rollback and audit trail

-- Add reversal tracking fields to journal_entries
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reversal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups of reversed entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_reversal_entry_id 
ON journal_entries(reversal_entry_id) 
WHERE reversal_entry_id IS NOT NULL;

-- Create index for soft-deleted entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_is_deleted 
ON journal_entries(is_deleted) 
WHERE is_deleted = TRUE;

-- Add comment to document the reversal workflow
COMMENT ON COLUMN journal_entries.is_reversed IS 'Indicates if this entry has been reversed by a reversal entry';
COMMENT ON COLUMN journal_entries.reversal_entry_id IS 'References the reversal entry that cancels this entry';
COMMENT ON COLUMN journal_entries.is_deleted IS 'Soft delete flag - entry is logically deleted but kept for audit';
COMMENT ON COLUMN journal_entries.deleted_at IS 'Timestamp when the entry was soft deleted';
