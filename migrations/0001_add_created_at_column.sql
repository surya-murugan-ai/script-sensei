-- Add missing created_at column to prescriptions table
-- This fixes the "column created_at does not exist" error

-- Add created_at column if it doesn't exist
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

-- Update existing records to have created_at = uploaded_at for consistency
UPDATE "prescriptions" 
SET "created_at" = "uploaded_at" 
WHERE "created_at" IS NULL OR "created_at" = "uploaded_at";

-- Add comment for documentation
COMMENT ON COLUMN "prescriptions"."created_at" IS 'Timestamp when the record was created in the database';
