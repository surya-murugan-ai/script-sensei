import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Type definitions for extraction prompts
export interface ExtractionPrompts {
  // 1. Prescription Type
  prescriptionType?: string;
  
  // 2. Patient Information
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  patientUhid?: string;
  patientDate?: string;
  patientAllergies?: string;
  
  // 3. Clinical Details
  diagnosis?: string;
  chiefComplaints?: string;
  medicalHistory?: string;
  examination?: string;
  vitalsBP?: string;
  vitalsPulse?: string;
  vitalsTemperature?: string;
  vitalsSpO2?: string;
  vitalsOthers?: string;
  
  // 4. Prescription (Rx)
  medicationDrugName?: string;
  medicationFormulation?: string;
  medicationStrength?: string;
  medicationRoute?: string;
  medicationFrequency?: string;
  medicationDuration?: string;
  medicationInstructions?: string;
  
  // 5. Advice / Additional Notes
  lifestyleAdvice?: string;
  investigations?: string;
  followUpInstructions?: string;
  
  // 6. Doctor's Details
  doctorName?: string;
  doctorSignature?: string;
  doctorRegistration?: string;
  
  // 7. Clinic / Hospital Details
  clinicName?: string;
  clinicLocation?: string;
  clinicContact?: string;
  clinicEmail?: string;
  clinicBranding?: string;
}

export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  fileSize: text("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  processingStatus: text("processing_status").notNull().default("queued"), // queued, processing, completed, failed
  extractedData: jsonb("extracted_data"),
  imageData: text("image_data"), // base64 encoded image for display
});

export const extractionResults = pgTable("extraction_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prescriptionId: varchar("prescription_id").references(() => prescriptions.id, { onDelete: "cascade" }).notNull(),
  modelName: text("model_name").notNull(), // openai, claude, gemini
  fieldName: text("field_name").notNull(),
  extractedValue: text("extracted_value"),
  confidence: real("confidence"),
  processingTime: real("processing_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const extractionConfigs = pgTable("extraction_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  selectedModels: text("selected_models").array().notNull(),
  selectedFields: text("selected_fields").array().notNull(),
  customPrompts: jsonb("custom_prompts"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema for structured prescription data
export const PrescriptionDataSchema = z.object({
  // 1. Prescription Type
  prescriptionType: z.object({
    type: z.enum(["General Medicine", "Dental", "Dermatology", "Surgical / Post-op", "Pediatric", "Gynecology / Obstetrics", "Diagnostic / Lab Referral", "Others"]).optional(),
    customType: z.string().optional(),
  }),
  
  // 2. Patient Information
  patientDetails: z.object({
    patientName: z.string().optional(),
    age: z.string().optional(),
    gender: z.string().optional(),
    uhid: z.string().optional(),
    membershipNo: z.string().optional(),
    patientId: z.string().optional(),
    date: z.string().optional(),
    allergies: z.string().optional(),
  }),
  
  // 3. Clinical Details
  clinicalDetails: z.object({
    diagnosis: z.string().optional(),
    provisionalDiagnosis: z.string().optional(),
    chiefComplaints: z.string().optional(),
    medicalHistory: z.string().optional(),
    examination: z.string().optional(),
  }),
  
  // Vitals (part of clinical details)
  vitals: z.object({
    bloodPressure: z.string().optional(),
    pulse: z.string().optional(),
    temperature: z.string().optional(),
    spO2: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
    bmi: z.string().optional(),
    others: z.string().optional(),
  }),
  
  // 4. Prescription (Rx)
  medications: z.array(z.object({
    drugName: z.string().optional(),
    formulation: z.string().optional(), // Tablet, Syrup, Ointment, Injection, etc.
    strength: z.string().optional(), // dosage strength
    route: z.string().optional(), // PO, IM, IV, Topical, etc.
    frequency: z.string().optional(), // 1-0-1, OD, BD, TDS, QHS
    duration: z.string().optional(), // 5 days, 1 week, SOS
    specialInstructions: z.string().optional(), // after food, apply on wound, with water
  })),
  
  // 5. Advice / Additional Notes
  advice: z.object({
    lifestyleAdvice: z.string().optional(), // rest, hydration, diet, physiotherapy, wound care
    investigations: z.string().optional(), // lab tests ordered
    followUpInstructions: z.string().optional(), // review after 5 days
  }),
  
  // 6. Doctor's Details
  doctorDetails: z.object({
    doctorName: z.string().optional(),
    signature: z.string().optional(),
    registrationNo: z.string().optional(), // MCI / KMC / State Council
    specialization: z.string().optional(),
  }),
  
  // 7. Clinic / Hospital Details
  clinicDetails: z.object({
    clinicName: z.string().optional(),
    hospitalName: z.string().optional(),
    branch: z.string().optional(),
    location: z.string().optional(),
    address: z.string().optional(),
    contactNumbers: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    logo: z.string().optional(),
    branding: z.string().optional(),
  }),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  uploadedAt: true,
});

export const insertExtractionResultSchema = createInsertSchema(extractionResults).omit({
  id: true,
  createdAt: true,
});

export const insertExtractionConfigSchema = createInsertSchema(extractionConfigs).omit({
  id: true,
  createdAt: true,
});

export interface ExtractionPrompts {
  // Prescription Type
  prescriptionType?: string;
  
  // Patient Information
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  patientUhid?: string;
  patientDate?: string;
  patientAllergies?: string;
  
  // Clinical Details
  diagnosis?: string;
  chiefComplaints?: string;
  medicalHistory?: string;
  examination?: string;
  
  // Vitals
  vitalsBP?: string;
  vitalsPulse?: string;
  vitalsTemperature?: string;
  vitalsSpO2?: string;
  vitalsOthers?: string;
  
  // Medications
  medicationDrugName?: string;
  medicationFormulation?: string;
  medicationStrength?: string;
  medicationRoute?: string;
  medicationFrequency?: string;
  medicationDuration?: string;
  medicationInstructions?: string;
  
  // Advice
  lifestyleAdvice?: string;
  investigations?: string;
  followUpInstructions?: string;
  
  // Doctor Details
  doctorName?: string;
  doctorSignature?: string;
  doctorRegistration?: string;
  
  // Clinic Details
  clinicName?: string;
  clinicLocation?: string;
  clinicContact?: string;
  clinicEmail?: string;
  clinicBranding?: string;
}

export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertExtractionResult = z.infer<typeof insertExtractionResultSchema>;
export type InsertExtractionConfig = z.infer<typeof insertExtractionConfigSchema>;
export type ExtractionConfig = typeof extractionConfigs.$inferSelect;
export type ExtractionResult = typeof extractionResults.$inferSelect;
export type PrescriptionData = z.infer<typeof PrescriptionDataSchema>;
