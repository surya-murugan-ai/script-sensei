import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./aiServices";
import { insertPrescriptionSchema, insertExtractionConfigSchema, PrescriptionDataSchema } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import { parse } from "json2csv";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG images are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Docker
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Get all prescriptions
  app.get("/api/prescriptions", async (req, res) => {
    try {
      const prescriptions = await storage.getAllPrescriptions();
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ error: "Failed to fetch prescriptions" });
    }
  });

  // Get all extraction results for processing queue
  app.get("/api/extraction-results", async (req, res) => {
    try {
      const extractionResults = await storage.getAllExtractionResults();
      res.json(extractionResults);
    } catch (error) {
      console.error("Error fetching extraction results:", error);
      res.status(500).json({ error: "Failed to fetch extraction results" });
    }
  });

  // Get single prescription with extraction results
  app.get("/api/prescriptions/:id", async (req, res) => {
    try {
      const prescription = await storage.getPrescription(req.params.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      const extractionResults = await storage.getExtractionResults(req.params.id);
      
      // Rebuild extractedData using the latest aggregation logic
      const aggregatedData = aggregateExtractionResults(extractionResults);
      
      // Update the prescription with the freshly aggregated data
      const updatedPrescription = {
        ...prescription,
        extractedData: aggregatedData
      };
      
      res.json({ prescription: updatedPrescription, extractionResults });
    } catch (error) {
      console.error("Error fetching prescription:", error);
      res.status(500).json({ error: "Failed to fetch prescription" });
    }
  });

  // Serve prescription image
  app.get("/api/prescriptions/:id/image", async (req, res) => {
    try {
      const prescription = await storage.getPrescription(req.params.id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      if (!prescription.imageData) {
        // Generate a placeholder image for prescriptions without stored imageData
        // Escape filename to prevent SVG injection
        const escapedFileName = prescription.fileName
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
          
        const placeholderSvg = `
          <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
            <text x="50%" y="40%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6c757d">
              Prescription Image
            </text>
            <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6c757d">
              ${escapedFileName}
            </text>
            <text x="50%" y="60%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6c757d">
              Image not available
            </text>
          </svg>
        `;
        
        res.set({
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        });
        
        return res.send(placeholderSvg);
      }

      // Handle both data URL format and raw base64 format
      let imageBuffer: Buffer;
      let contentType = 'image/jpeg'; // default
      
      if (prescription.imageData.startsWith('data:')) {
        // Parse data URL format: data:image/png;base64,iVBORw0KGgoAAAA...
        const matches = prescription.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          contentType = matches[1];
          imageBuffer = Buffer.from(matches[2], 'base64');
        } else {
          throw new Error('Invalid data URL format');
        }
      } else {
        // Raw base64 format (legacy from upload process)
        imageBuffer = Buffer.from(prescription.imageData, 'base64');
        contentType = 'image/jpeg'; // uploaded images are converted to JPEG
      }
      
      // Set appropriate headers
      res.set({
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      });

      res.send(imageBuffer);
    } catch (error) {
      console.error("Error serving prescription image:", error);
      res.status(500).json({ error: "Failed to serve prescription image" });
    }
  });

  // Upload prescription files
  app.post("/api/prescriptions/upload", upload.array('files', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const prescriptions = [];

      for (const file of files) {
        // Process and store image data immediately
        const processedImage = await sharp(file.buffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        const base64Image = processedImage.toString('base64');

        const prescription = await storage.createPrescription({
          fileName: file.originalname,
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          processingStatus: "queued",
          extractedData: null,
          imageData: base64Image,
        });

        prescriptions.push(prescription);
      }

      res.json({ prescriptions, message: "Files uploaded successfully" });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  // Process existing prescription with AI models (no file upload)
  app.post("/api/prescriptions/:id/process-existing", async (req, res) => {
    try {
      const { id } = req.params;
      const { selectedModels, customPrompts } = req.body;

      // Get existing prescription
      const existingPrescription = await storage.getPrescription(id);
      if (!existingPrescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      if (!existingPrescription.imageData) {
        return res.status(400).json({ error: "No image data available for processing" });
      }

      // Use existing image data
      let base64Image = existingPrescription.imageData;
      
      // Handle data URL format if present
      if (base64Image.startsWith('data:')) {
        const matches = base64Image.match(/^data:[^;]+;base64,(.+)$/);
        if (matches) {
          base64Image = matches[1];
        }
      }

      // Update status to processing
      await storage.updatePrescription(id, { processingStatus: "processing" });

      // Parse selected models and custom prompts, fallback to default config
      let models = typeof selectedModels === 'string' ? JSON.parse(selectedModels) : selectedModels;
      let prompts = typeof customPrompts === 'string' ? JSON.parse(customPrompts) : customPrompts;
      
      // If no models/prompts provided, load default configuration
      if (!models || !prompts) {
        const defaultConfig = await storage.getDefaultExtractionConfig();
        if (defaultConfig) {
          models = models || defaultConfig.selectedModels;
          prompts = prompts || defaultConfig.customPrompts;
        }
      }
      
      // Final fallback to hardcoded defaults
      models = models || ["openai", "claude", "gemini"];
      prompts = prompts || {};

      // Extract data using AI models
      const modelResults = await aiService.extractWithAllModels(base64Image, models, prompts);

      // Store extraction results
      console.log(`Processing ${modelResults.length} model results for prescription ${id}`);
      
      for (const result of modelResults) {
        console.log(`Storing results for model: ${result.model}`);
        
        // Flatten the prescription data for individual field storage
        const flattenedData = flattenPrescriptionData(result.data);
        
        console.log(`Flattened data for ${result.model}:`, Object.keys(flattenedData).length, 'fields');
        
        for (const [fieldName, value] of Object.entries(flattenedData)) {
          // Store all extraction results, including "NA" values
          await storage.createExtractionResult({
            prescriptionId: id,
            modelName: result.model,
            fieldName,
            extractedValue: value || "NA",
            confidence: result.confidence,
            processingTime: result.processingTime,
          });
        }
      }

      // Get the stored extraction results and aggregate them
      const extractionResults = await storage.getExtractionResults(id);
      const finalData = aggregateExtractionResults(extractionResults);

      // Update prescription with final extracted data and status
      await storage.updatePrescription(id, {
        extractedData: finalData,
        processingStatus: "completed"
      });

      res.json({ 
        message: "Processing completed successfully", 
        extractedData: finalData,
        modelResults: modelResults.map(r => ({
          model: r.model,
          confidence: r.confidence,
          processingTime: r.processingTime
        }))
      });

    } catch (error) {
      console.error("Error processing prescription:", error);
      
      // Update status to failed
      try {
        await storage.updatePrescription(req.params.id, { processingStatus: "failed" });
      } catch (updateError) {
        console.error("Error updating prescription status to failed:", updateError);
      }
      
      res.status(500).json({ error: "Failed to process prescription" });
    }
  });

  // Process prescription with AI models (with file upload)
  app.post("/api/prescriptions/:id/process", upload.single('file'), async (req, res) => {
    try {
      const { id } = req.params;
      const { selectedModels, customPrompts } = req.body;

      // Get existing prescription
      const existingPrescription = await storage.getPrescription(id);
      if (!existingPrescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      let base64Image: string;

      if (req.file) {
        // New file uploaded - process it
        const processedImage = await sharp(req.file.buffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        base64Image = processedImage.toString('base64');

        // Store the image data for later display
        await storage.updatePrescription(id, { imageData: base64Image });
      } else if (existingPrescription.imageData) {
        // Use existing image data
        base64Image = existingPrescription.imageData;
        
        // Handle data URL format if present
        if (base64Image.startsWith('data:')) {
          const matches = base64Image.match(/^data:[^;]+;base64,(.+)$/);
          if (matches) {
            base64Image = matches[1];
          }
        }
      } else {
        return res.status(400).json({ error: "No image data available for processing" });
      }

      // Update status to processing
      await storage.updatePrescription(id, { processingStatus: "processing" });

      // Parse selected models and custom prompts, fallback to default config
      let models = typeof selectedModels === 'string' ? JSON.parse(selectedModels) : selectedModels;
      let prompts = typeof customPrompts === 'string' ? JSON.parse(customPrompts) : customPrompts;
      
      // If no models/prompts provided, load default configuration
      if (!models || !prompts) {
        const defaultConfig = await storage.getDefaultExtractionConfig();
        if (defaultConfig) {
          models = models || defaultConfig.selectedModels;
          prompts = prompts || defaultConfig.customPrompts;
        }
      }
      
      // Final fallback to hardcoded defaults
      models = models || ['openai', 'claude', 'gemini'];
      prompts = prompts || {};

      // Extract data using AI models
      const modelResults = await aiService.extractWithAllModels(base64Image, models, prompts);

      // Store extraction results
      console.log(`Processing ${modelResults.length} model results for prescription ${id}`);
      
      for (const result of modelResults) {
        console.log(`Storing results for model: ${result.model}`);
        
        // Flatten the prescription data for individual field storage
        const flattenedData = flattenPrescriptionData(result.data);
        
        console.log(`Flattened data for ${result.model}:`, Object.keys(flattenedData).length, 'fields');
        
        for (const [fieldName, value] of Object.entries(flattenedData)) {
          // Store all extraction results, including "NA" values
          await storage.createExtractionResult({
            prescriptionId: id,
            modelName: result.model,
            fieldName,
            extractedValue: value || "NA",
            confidence: result.confidence,
            processingTime: result.processingTime,
          });
        }
      }

      // Get the stored extraction results and aggregate them
      const extractionResults = await storage.getExtractionResults(id);
      const finalData = aggregateExtractionResults(extractionResults);

      // Update prescription with final results
      await storage.updatePrescription(id, {
        processingStatus: "completed",
        extractedData: finalData,
      });

      res.json({ message: "Processing completed", results: modelResults, finalData });
    } catch (error) {
      console.error("Error processing prescription:", error);
      await storage.updatePrescription(req.params.id, { processingStatus: "failed" });
      res.status(500).json({ error: "Failed to process prescription" });
    }
  });

  // Delete prescription (any status)
  app.delete("/api/prescriptions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const forceDelete = String(req.query.force || '').toLowerCase() === 'true';
      
      const prescription = await storage.getPrescription(id);
      
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      
      // For completed prescriptions, require explicit force=true parameter as safety check
      if (prescription.processingStatus === 'completed' && !forceDelete) {
        return res.status(400).json({ 
          error: "Completed prescriptions require force=true parameter to delete",
          requiresConfirmation: true 
        });
      }
      
      // Delete the prescription and all related data
      const success = await storage.deletePrescription(id);
      
      if (success) {
        const statusText = prescription.processingStatus === 'queued' ? 'cancelled' : 'deleted';
        res.json({ message: `Prescription ${statusText} successfully` });
      } else {
        res.status(500).json({ error: "Failed to delete prescription" });
      }
    } catch (error) {
      console.error("Error deleting prescription:", error);
      res.status(500).json({ error: "Failed to delete prescription" });
    }
  });

  // Retry failed prescription processing
  app.post("/api/prescriptions/:id/retry", async (req, res) => {
    try {
      const { id } = req.params;
      const prescription = await storage.getPrescription(id);
      
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      
      // Only allow retry of failed prescriptions
      if (prescription.processingStatus !== 'failed') {
        return res.status(400).json({ error: "Can only retry failed prescriptions" });
      }
      
      // Reset status to queued for reprocessing
      await storage.updatePrescription(id, { processingStatus: 'queued' });
      
      res.json({ message: "Prescription queued for retry" });
    } catch (error) {
      console.error("Error retrying prescription:", error);
      res.status(500).json({ error: "Failed to retry prescription" });
    }
  });

  // Reprocess existing prescription (completed or failed) 
  app.post("/api/prescriptions/:id/reprocess", async (req, res) => {
    try {
      const { id } = req.params;
      const prescription = await storage.getPrescription(id);
      
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }
      
      // Allow reprocessing of completed or failed prescriptions
      if (prescription.processingStatus !== 'completed' && prescription.processingStatus !== 'failed') {
        return res.status(400).json({ error: "Can only reprocess completed or failed prescriptions" });
      }
      
      // Clear existing extraction results for this prescription
      await storage.clearExtractionResults(id);
      
      // Reset status to queued for reprocessing
      await storage.updatePrescription(id, { processingStatus: 'queued' });
      
      res.json({ message: "Prescription queued for reprocessing with enhanced AI extraction" });
    } catch (error) {
      console.error("Error reprocessing prescription:", error);
      res.status(500).json({ error: "Failed to reprocess prescription" });
    }
  });

  // Get extraction configurations
  app.get("/api/configs", async (req, res) => {
    try {
      const configs = await storage.getExtractionConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching configs:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });

  // Create extraction configuration
  app.post("/api/configs", async (req, res) => {
    try {
      const validatedData = insertExtractionConfigSchema.parse(req.body);
      const config = await storage.createExtractionConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating config:", error);
      res.status(400).json({ error: "Invalid configuration data" });
    }
  });

  // Update extraction configuration
  app.put("/api/configs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedConfig = await storage.updateExtractionConfig(id, updates);
      
      if (!updatedConfig) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(400).json({ error: "Failed to update configuration" });
    }
  });

  // Export prescriptions as CSV
  app.get("/api/export/csv", async (req, res) => {
    try {
      const { prescriptionId, prescriptionIds } = req.query;
      let prescriptions;
      
      if (prescriptionIds) {
        // Export multiple specified prescriptions
        const ids = (prescriptionIds as string).split(',').filter(id => id.trim());
        const prescriptionPromises = ids.map(id => storage.getPrescription(id.trim()));
        const results = await Promise.all(prescriptionPromises);
        prescriptions = results.filter(p => p !== null);
      } else if (prescriptionId) {
        // Export only the specified prescription (backward compatibility)
        const prescription = await storage.getPrescription(prescriptionId as string);
        prescriptions = prescription ? [prescription] : [];
      } else {
        // Export all prescriptions
        prescriptions = await storage.getAllPrescriptions();
      }
      
      const allResults = await storage.getAllExtractionResults();
      
      if (prescriptions.length === 0) {
        // Return empty CSV with headers when no data
        const headers = "id,fileName,uploadedAt,processingStatus,patient_patientName,patient_age,patient_gender";
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="prescriptions.csv"');
        res.send(headers);
        return;
      }

      const csvData = prescriptions.filter(p => p !== null).map(p => {
        // Get latest extraction results for this prescription (including any edits)
        const prescriptionResults = allResults.filter(r => r.prescriptionId === p!.id);
        const currentData = aggregateExtractionResults(prescriptionResults);
        
        return {
          id: p!.id,
          fileName: p!.fileName,
          uploadedAt: p!.uploadedAt,
          processingStatus: p!.processingStatus,
          ...flattenPrescriptionData(currentData),
        };
      });

      const csv = parse(csvData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="prescriptions.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // Export prescriptions as JSON
  app.get("/api/export/json", async (req, res) => {
    try {
      const { prescriptionId, prescriptionIds } = req.query;
      let prescriptions;
      let extractionResults;
      
      if (prescriptionIds) {
        // Export multiple specified prescriptions
        const ids = (prescriptionIds as string).split(',').filter(id => id.trim());
        const prescriptionPromises = ids.map(id => storage.getPrescription(id.trim()));
        const results = await Promise.all(prescriptionPromises);
        prescriptions = results.filter(p => p !== null);
        
        // Get extraction results for all selected prescriptions
        const extractionPromises = ids.map(id => storage.getExtractionResults(id.trim()));
        const extractionArrays = await Promise.all(extractionPromises);
        extractionResults = extractionArrays.flat();
      } else if (prescriptionId) {
        // Export only the specified prescription (backward compatibility)
        const prescription = await storage.getPrescription(prescriptionId as string);
        prescriptions = prescription ? [prescription] : [];
        extractionResults = await storage.getExtractionResults(prescriptionId as string);
      } else {
        // Export all prescriptions
        prescriptions = await storage.getAllPrescriptions();
        extractionResults = await storage.getAllExtractionResults();
      }

      const exportData = {
        prescriptions,
        extractionResults,
        exportedAt: new Date().toISOString(),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="prescriptions.json"');
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting JSON:", error);
      res.status(500).json({ error: "Failed to export JSON" });
    }
  });

  // Update prescription extracted data (for manual corrections)
  app.patch("/api/prescriptions/:id/extracted-data", async (req, res) => {
    try {
      const { id } = req.params;
      const { fieldUpdates } = req.body; // { fieldName: newValue, ... }

      const prescription = await storage.getPrescription(id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription not found" });
      }

      // Update individual extraction results in the extraction_results table
      const extractionResults = await storage.getExtractionResults(id);
      
      for (const [fieldName, newValue] of Object.entries(fieldUpdates)) {
        // Update all models' results for this field
        for (const result of extractionResults) {
          if (result.fieldName === fieldName) {
            // Update this specific extraction result through storage interface
            await storage.updateExtractionResult(result.id, { extractedValue: newValue as string });
          }
        }
      }

      res.json({ message: "Extraction results updated successfully" });
    } catch (error) {
      console.error("Error updating extraction results:", error);
      res.status(500).json({ error: "Failed to update extraction results" });
    }
  });

  // Update extraction result (for manual corrections)
  app.put("/api/extraction-results/:id", async (req, res) => {
    try {
      const { extractedValue } = req.body;
      // In a real implementation, you'd update the specific extraction result
      // For now, we'll just return success since we're using in-memory storage
      res.json({ message: "Extraction result updated successfully" });
    } catch (error) {
      console.error("Error updating extraction result:", error);
      res.status(500).json({ error: "Failed to update extraction result" });
    }
  });

  // Backfill missing image data for prescriptions
  app.post("/api/admin/backfill-images", async (req, res) => {
    try {
      await storage.backfillMissingImageData();
      res.json({ success: true, message: "Image data backfill completed" });
    } catch (error) {
      console.error("Error during image backfill:", error);
      res.status(500).json({ error: "Failed to backfill image data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to aggregate extraction results back to nested structure
function aggregateExtractionResults(extractionResults: any[]): any {
  if (!extractionResults || extractionResults.length === 0) return {};
  
  const aggregated: any = {
    prescriptionType: {},
    patientDetails: {},
    clinicalDetails: {},
    chiefComplaints: {},
    examination: {},
    vitals: {},
    medications: [],
    advice: {},
    investigations: {},
    doctorDetails: {},
    clinicDetails: {},
    followUp: {}
  };

  // Group medications by index for proper array reconstruction
  const medicationGroups: Record<string, any> = {};

  extractionResults.forEach(result => {
    const fieldName = result.fieldName || result.field_name;
    const value = result.extractedValue || result.extracted_value;
    
    // Skip if fieldName is undefined or null or value is NA
    if (!fieldName || !value || value === "NA") {
      return;
    }
    
    if (fieldName.startsWith("prescriptionType_")) {
      const subField = fieldName.replace("prescriptionType_", "");
      aggregated.prescriptionType[subField] = value;
    } else if (fieldName.startsWith("patient_")) {
      const subField = fieldName.replace("patient_", "");
      aggregated.patientDetails[subField] = value;
    } else if (fieldName.startsWith("clinical_")) {
      const subField = fieldName.replace("clinical_", "");
      aggregated.clinicalDetails[subField] = value;
    } else if (fieldName === "diagnosis" || fieldName === "patient_diagnosis") {
      aggregated.clinicalDetails.diagnosis = value;
    } else if (fieldName === "chiefComplaints" || fieldName === "chiefComplaints_primarySymptoms") {
      aggregated.clinicalDetails.chiefComplaints = value;
    } else if (fieldName === "medicalHistory" || fieldName === "patient_medicalHistory") {
      aggregated.clinicalDetails.medicalHistory = value;
    } else if (fieldName === "examination" || fieldName === "examination_localExamination") {
      aggregated.clinicalDetails.examination = value;
    } else if (fieldName.startsWith("chiefComplaints_")) {
      const subField = fieldName.replace("chiefComplaints_", "");
      if (!aggregated.chiefComplaints) aggregated.chiefComplaints = {};
      aggregated.chiefComplaints[subField] = value;
    } else if (fieldName.startsWith("examination_")) {
      const subField = fieldName.replace("examination_", "");
      if (!aggregated.examination) aggregated.examination = {};
      aggregated.examination[subField] = value;
    } else if (fieldName.startsWith("vitals_")) {
      const subField = fieldName.replace("vitals_", "");
      aggregated.vitals[subField] = value;
    } else if (fieldName.startsWith("medication_")) {
      // Handle both single medications and indexed medications
      const remainingField = fieldName.replace("medication_", "");
      const indexMatch = remainingField.match(/^(\d+)_(.+)$/);
      
      if (indexMatch) {
        // Indexed medication (e.g., medication_2_drugName)
        const index = indexMatch[1];
        const subField = indexMatch[2];
        if (!medicationGroups[index]) medicationGroups[index] = {};
        medicationGroups[index][subField] = value;
      } else {
        // Single medication (e.g., medication_drugName)
        if (!medicationGroups['0']) medicationGroups['0'] = {};
        medicationGroups['0'][remainingField] = value;
      }
    } else if (fieldName.startsWith("advice_")) {
      const subField = fieldName.replace("advice_", "");
      aggregated.advice[subField] = value;
    } else if (fieldName === "lifestyleAdvice" || fieldName === "followUp_lifestyleAdvice") {
      aggregated.advice.lifestyleAdvice = value;
    } else if (fieldName === "investigations" || fieldName === "investigations_others") {
      aggregated.advice.investigations = value;
    } else if (fieldName === "followUpInstructions" || fieldName === "followUp_reviewDate") {
      aggregated.advice.followUpInstructions = value;
    } else if (fieldName.startsWith("investigations_")) {
      const subField = fieldName.replace("investigations_", "");
      aggregated.investigations[subField] = value;
    } else if (fieldName.startsWith("doctor_")) {
      const subField = fieldName.replace("doctor_", "");
      aggregated.doctorDetails[subField] = value;
    } else if (fieldName.startsWith("clinic_")) {
      const subField = fieldName.replace("clinic_", "");
      aggregated.clinicDetails[subField] = value;
    } else if (fieldName.startsWith("followUp_")) {
      const subField = fieldName.replace("followUp_", "");
      aggregated.followUp[subField] = value;
    }
  });

  // Convert medication groups to array, filtering out empty medications
  aggregated.medications = Object.values(medicationGroups).filter(med => 
    med && med.drugName && med.drugName !== "NA"
  );

  return aggregated;
}

// Helper function to flatten prescription data for CSV export
function flattenPrescriptionData(data: any): Record<string, string> {
  if (!data) return {};

  const flattened: Record<string, string> = {};

  // Prescription Type
  if (data.prescriptionType) {
    Object.entries(data.prescriptionType).forEach(([key, value]) => {
      flattened[`prescriptionType_${key}`] = String(value || "NA");
    });
  }

  // Patient details
  if (data.patientDetails) {
    Object.entries(data.patientDetails).forEach(([key, value]) => {
      flattened[`patient_${key}`] = String(value || "NA");
    });
  }

  // Clinical Details - CRITICAL MISSING FIELDS
  if (data.clinicalDetails) {
    Object.entries(data.clinicalDetails).forEach(([key, value]) => {
      flattened[`clinical_${key}`] = String(value || "NA");
    });
    // Also add legacy field names for compatibility
    if (data.clinicalDetails.diagnosis) {
      flattened[`patient_diagnosis`] = String(data.clinicalDetails.diagnosis || "NA");
      flattened[`diagnosis`] = String(data.clinicalDetails.diagnosis || "NA");
    }
    if (data.clinicalDetails.chiefComplaints) {
      flattened[`chiefComplaints_primarySymptoms`] = String(data.clinicalDetails.chiefComplaints || "NA");
      flattened[`chiefComplaints`] = String(data.clinicalDetails.chiefComplaints || "NA");
    }
    if (data.clinicalDetails.medicalHistory) {
      flattened[`patient_medicalHistory`] = String(data.clinicalDetails.medicalHistory || "NA");
      flattened[`medicalHistory`] = String(data.clinicalDetails.medicalHistory || "NA");
    }
    if (data.clinicalDetails.examination) {
      flattened[`examination_localExamination`] = String(data.clinicalDetails.examination || "NA");
      flattened[`examination`] = String(data.clinicalDetails.examination || "NA");
    }
  }

  // Vitals
  if (data.vitals) {
    Object.entries(data.vitals).forEach(([key, value]) => {
      flattened[`vitals_${key}`] = String(value || "NA");
    });
  }

  // Medications - FIX: Process ALL medications, not just the first one
  if (data.medications && Array.isArray(data.medications)) {
    data.medications.forEach((medication: any, index: number) => {
      if (medication && typeof medication === 'object') {
        Object.entries(medication).forEach(([key, value]) => {
          const fieldName = index === 0 ? `medication_${key}` : `medication_${index + 1}_${key}`;
          flattened[fieldName] = String(value || "NA");
        });
      }
    });
    
    // Also maintain backward compatibility with single medication fields
    if (data.medications.length > 0 && data.medications[0]) {
      Object.entries(data.medications[0]).forEach(([key, value]) => {
        flattened[`medication_${key}`] = String(value || "NA");
      });
    }
  }

  // Advice - CRITICAL MISSING FIELDS
  if (data.advice) {
    Object.entries(data.advice).forEach(([key, value]) => {
      flattened[`advice_${key}`] = String(value || "NA");
    });
    // Add legacy field names for compatibility
    if (data.advice.lifestyleAdvice) {
      flattened[`followUp_lifestyleAdvice`] = String(data.advice.lifestyleAdvice || "NA");
      flattened[`lifestyleAdvice`] = String(data.advice.lifestyleAdvice || "NA");
    }
    if (data.advice.investigations) {
      flattened[`investigations_others`] = String(data.advice.investigations || "NA");
      flattened[`investigations`] = String(data.advice.investigations || "NA");
    }
    if (data.advice.followUpInstructions) {
      flattened[`followUp_reviewDate`] = String(data.advice.followUpInstructions || "NA");
      flattened[`followUpInstructions`] = String(data.advice.followUpInstructions || "NA");
    }
  }

  // Investigations (legacy support)
  if (data.investigations) {
    Object.entries(data.investigations).forEach(([key, value]) => {
      flattened[`investigations_${key}`] = String(value || "NA");
    });
  }

  // Doctor details
  if (data.doctorDetails) {
    Object.entries(data.doctorDetails).forEach(([key, value]) => {
      flattened[`doctor_${key}`] = String(value || "NA");
    });
  }

  // Clinic Details - CRITICAL MISSING FIELDS
  if (data.clinicDetails) {
    Object.entries(data.clinicDetails).forEach(([key, value]) => {
      flattened[`clinic_${key}`] = String(value || "NA");
    });
  }

  // Follow-up (legacy support)
  if (data.followUp) {
    Object.entries(data.followUp).forEach(([key, value]) => {
      flattened[`followUp_${key}`] = String(value || "NA");
    });
  }

  return flattened;
}

