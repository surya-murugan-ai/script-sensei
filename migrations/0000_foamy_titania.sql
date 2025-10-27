CREATE TABLE IF NOT EXISTS "extraction_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"selected_models" text[] NOT NULL,
	"selected_fields" text[] NOT NULL,
	"custom_prompts" jsonb,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" varchar NOT NULL,
	"model_name" text NOT NULL,
	"field_name" text NOT NULL,
	"extracted_value" text,
	"confidence" real,
	"processing_time" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prescriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"file_size" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processing_status" text DEFAULT 'queued' NOT NULL,
	"extracted_data" jsonb,
	"image_data" text
);
--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'extraction_results_prescription_id_prescriptions_id_fk'
    ) THEN
        ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prescriptions_status" ON "prescriptions" USING btree ("processing_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prescriptions_uploaded_at" ON "prescriptions" USING btree ("uploaded_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_extraction_results_prescription_id" ON "extraction_results" USING btree ("prescription_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_extraction_results_model_name" ON "extraction_results" USING btree ("model_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_extraction_results_field_name" ON "extraction_results" USING btree ("field_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_extraction_configs_is_default" ON "extraction_configs" USING btree ("is_default") WHERE ("is_default" = true);
--> statement-breakpoint
INSERT INTO "extraction_configs" ("name", "selected_models", "selected_fields", "custom_prompts", "is_default") VALUES ('Default Configuration', ARRAY['openai', 'claude', 'gemini'], ARRAY['patientDetails', 'vitals', 'medications', 'investigations', 'doctorDetails', 'followUp'], '{"patientDetails": "Extract patient name, age, gender, UHID/membership number, allergies, and diagnosis from the prescription. If any field is not available, mark as ''NA''.", "medications": "For each medication, extract: drug name (generic/brand), dosage strength, form, route, frequency, timing, duration, and special instructions.", "vitals": "Extract any vital signs mentioned including blood pressure, pulse rate, temperature, SpO2, weight, height, and BMI.", "investigations": "Extract any prescribed tests, blood work, imaging studies, or other investigations.", "doctorDetails": "Extract doctor''s name, specialization, registration number, clinic/hospital name and location.", "followUp": "Extract follow-up instructions, review dates, lifestyle advice, and next steps."}'::jsonb, true) ON CONFLICT DO NOTHING;