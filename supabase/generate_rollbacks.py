#!/usr/bin/env python3
"""
Script to generate ROLLBACK files for all migrations
"""
import os
import re
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

def generate_rollback(migration_file):
    """Generate a ROLLBACK file for a given migration"""
    migration_path = MIGRATIONS_DIR / migration_file
    
    if not migration_path.exists():
        return False
    
    # Read the migration file
    with open(migration_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Generate rollback filename
    rollback_name = migration_file.replace('.sql', '_ROLLBACK.sql')
    rollback_path = MIGRATIONS_DIR / rollback_name
    
    # Skip if rollback already exists
    if rollback_path.exists():
        return False
    
    # Generate basic rollback content
    rollback_content = f"""-- ============================================================
-- ROLLBACK: {migration_file.replace('.sql', '').upper()}
-- ============================================================
-- This is a basic rollback template for {migration_file}
-- Review and modify as needed based on the actual migration changes
-- ============================================================

BEGIN;

-- TODO: Add rollback statements here
-- Examples:
-- DROP TABLE IF EXISTS public.table_name;
-- DROP FUNCTION IF EXISTS public.function_name();
-- ALTER TABLE public.table_name DROP COLUMN IF EXISTS column_name;

ROLLBACK;
"""
    
    # Write rollback file
    with open(rollback_path, 'w', encoding='utf-8') as f:
        f.write(rollback_content)
    
    print(f"Generated: {rollback_name}")
    return True

def main():
    """Main function to generate rollbacks for all migrations"""
    # Get all migration files
    migration_files = sorted([f for f in os.listdir(MIGRATIONS_DIR) if f.endswith('.sql') and not f.endswith('_ROLLBACK.sql')])
    
    print(f"Found {len(migration_files)} migration files")
    print("Generating ROLLBACK files...")
    
    generated = 0
    for migration_file in migration_files:
        if generate_rollback(migration_file):
            generated += 1
    
    print(f"\nGenerated {generated} ROLLBACK files")

if __name__ == "__main__":
    main()
