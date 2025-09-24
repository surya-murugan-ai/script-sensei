import { type Prescription, type InsertPrescription, type ExtractionResult, type InsertExtractionResult, type ExtractionConfig, type InsertExtractionConfig, prescriptions, extractionResults, extractionConfigs, type ExtractionPrompts } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, isNull } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

export interface IStorage {
  // Prescription methods
  getPrescription(id: string): Promise<Prescription | undefined>;
  getAllPrescriptions(): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined>;
  deletePrescription(id: string): Promise<boolean>;

  // Extraction result methods
  getExtractionResults(prescriptionId: string): Promise<ExtractionResult[]>;
  createExtractionResult(result: InsertExtractionResult): Promise<ExtractionResult>;
  updateExtractionResult(id: string, updates: Partial<ExtractionResult>): Promise<ExtractionResult | undefined>;
  getAllExtractionResults(): Promise<ExtractionResult[]>;
  clearExtractionResults(prescriptionId: string): Promise<boolean>;

  // Configuration methods
  getExtractionConfigs(): Promise<ExtractionConfig[]>;
  createExtractionConfig(config: InsertExtractionConfig): Promise<ExtractionConfig>;
  getDefaultExtractionConfig(): Promise<ExtractionConfig | undefined>;
  updateExtractionConfig(id: string, updates: Partial<ExtractionConfig>): Promise<ExtractionConfig | undefined>;
  deleteExtractionConfig(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize default configuration
    this.initializeDefaultConfig();
  }

  private async initializeDefaultConfig() {
    try {
      // Check if default config already exists
      const existing = await db.select().from(extractionConfigs).where(eq(extractionConfigs.isDefault, true)).limit(1);
      if (existing.length > 0) return;

      // Create default configuration
      await db.insert(extractionConfigs).values({
        name: "Default Configuration",
        selectedModels: ["openai", "claude", "gemini"],
        selectedFields: ["patientDetails", "vitals", "medications", "investigations", "doctorDetails", "followUp"],
        customPrompts: {
          patientDetails: "Extract patient name, age, gender, UHID/membership number, allergies, and diagnosis from the prescription. If any field is not available, mark as 'NA'.",
          medications: "For each medication, extract: drug name (generic/brand), dosage strength, form, route, frequency, timing, duration, and special instructions.",
          vitals: "Extract any vital signs mentioned including blood pressure, pulse rate, temperature, SpO2, weight, height, and BMI.",
          investigations: "Extract any prescribed tests, blood work, imaging studies, or other investigations.",
          doctorDetails: "Extract doctor's name, specialization, registration number, clinic/hospital name and location.",
          followUp: "Extract follow-up instructions, review dates, lifestyle advice, and next steps."
        },
        isDefault: true,
      });
    } catch (error) {
      console.error("Error initializing default config:", error);
    }
  }

  // Prescription methods
  async getPrescription(id: string): Promise<Prescription | undefined> {
    const [prescription] = await db.select().from(prescriptions).where(eq(prescriptions.id, id));
    return prescription || undefined;
  }

  async getAllPrescriptions(): Promise<Prescription[]> {
    return await db.select().from(prescriptions).orderBy(desc(prescriptions.uploadedAt));
  }

  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const [prescription] = await db.insert(prescriptions).values(insertPrescription).returning();
    return prescription;
  }

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription | undefined> {
    const [updated] = await db.update(prescriptions)
      .set(updates)
      .where(eq(prescriptions.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePrescription(id: string): Promise<boolean> {
    // Delete prescription (cascade will handle extraction results)
    const result = await db.delete(prescriptions).where(eq(prescriptions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Extraction result methods
  async getExtractionResults(prescriptionId: string): Promise<ExtractionResult[]> {
    return await db.select().from(extractionResults)
      .where(eq(extractionResults.prescriptionId, prescriptionId));
  }

  async createExtractionResult(insertResult: InsertExtractionResult): Promise<ExtractionResult> {
    const [result] = await db.insert(extractionResults).values(insertResult).returning();
    return result;
  }

  async updateExtractionResult(id: string, updates: Partial<ExtractionResult>): Promise<ExtractionResult | undefined> {
    const [updated] = await db.update(extractionResults)
      .set(updates)
      .where(eq(extractionResults.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllExtractionResults(): Promise<ExtractionResult[]> {
    return await db.select().from(extractionResults);
  }

  async clearExtractionResults(prescriptionId: string): Promise<boolean> {
    const result = await db.delete(extractionResults).where(eq(extractionResults.prescriptionId, prescriptionId));
    return (result.rowCount ?? 0) > 0;
  }

  // Configuration methods
  async getExtractionConfigs(): Promise<ExtractionConfig[]> {
    return await db.select().from(extractionConfigs);
  }

  async createExtractionConfig(insertConfig: InsertExtractionConfig): Promise<ExtractionConfig> {
    const [config] = await db.insert(extractionConfigs).values(insertConfig).returning();
    return config;
  }

  async getDefaultExtractionConfig(): Promise<ExtractionConfig | undefined> {
    const [config] = await db.select().from(extractionConfigs).where(eq(extractionConfigs.isDefault, true));
    return config || undefined;
  }

  async updateExtractionConfig(id: string, updates: Partial<ExtractionConfig>): Promise<ExtractionConfig | undefined> {
    const [updated] = await db.update(extractionConfigs)
      .set(updates)
      .where(eq(extractionConfigs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExtractionConfig(id: string): Promise<boolean> {
    const result = await db.delete(extractionConfigs).where(eq(extractionConfigs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Utility method to backfill missing image data
  async backfillMissingImageData(): Promise<void> {
    try {
      // Get prescriptions with missing image data
      const prescriptionsWithoutImages = await db.select().from(prescriptions).where(isNull(prescriptions.imageData));
      
      console.log(`Found ${prescriptionsWithoutImages.length} prescriptions without image data`);
      
      for (const prescription of prescriptionsWithoutImages) {
        try {
          console.log(`Processing prescription ${prescription.id} with filename: ${prescription.fileName}`);
          
          // First try exact matches
          const exactPaths = [
            path.join('attached_assets', prescription.fileName),
            path.join('attached_assets', 'generated_images', prescription.fileName),
            path.join('attached_assets', 'stock_images', prescription.fileName)
          ];
          
          let imageFilePath = null;
          for (const possiblePath of exactPaths) {
            if (fs.existsSync(possiblePath)) {
              imageFilePath = possiblePath;
              console.log(`Found exact match: ${possiblePath}`);
              break;
            }
          }
          
          // If no exact match, try partial filename matching in attached_assets and subdirectories
          if (!imageFilePath) {
            console.log(`No exact match found, trying partial matching for: ${prescription.fileName}`);
            const baseName = prescription.fileName.replace(/\.(jpeg|jpg|png)$/i, '');
            
            // Search function to check files recursively
            const searchInDirectory = (dirPath: string): string | null => {
              try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });
                
                // First check files in current directory
                for (const item of items) {
                  if (item.isFile()) {
                    const fileName = item.name;
                    if (fileName.includes(baseName) && /\.(jpeg|jpg|png)$/i.test(fileName)) {
                      const fullPath = path.join(dirPath, fileName);
                      console.log(`Found partial match: ${fullPath}`);
                      return fullPath;
                    }
                  }
                }
                
                // Then search subdirectories
                for (const item of items) {
                  if (item.isDirectory() && !item.name.startsWith('.')) {
                    const subdirPath = path.join(dirPath, item.name);
                    const found = searchInDirectory(subdirPath);
                    if (found) return found;
                  }
                }
              } catch (error) {
                console.log(`Error reading directory ${dirPath}:`, error);
              }
              return null;
            };
            
            imageFilePath = searchInDirectory('attached_assets');
          }
          
          if (imageFilePath) {
            const imageBuffer = fs.readFileSync(imageFilePath);
            // Determine MIME type from file extension
            const ext = path.extname(imageFilePath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            const base64Data = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
            
            await db.update(prescriptions)
              .set({ imageData: base64Data })
              .where(eq(prescriptions.id, prescription.id));
              
            console.log(`✓ Backfilled image data for prescription ${prescription.id} (${prescription.fileName}) from ${imageFilePath}`);
          } else {
            console.log(`⚠ Image file not found for prescription ${prescription.id} (${prescription.fileName})`);
          }
        } catch (error) {
          console.error(`❌ Error backfilling prescription ${prescription.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error during image data backfill:", error);
    }
  }
}

export const storage = new DatabaseStorage();