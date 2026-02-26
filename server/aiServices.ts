import OpenAI from "openai";
import { PrescriptionData, ExtractionPrompts, PrescriptionDataSchema } from "@shared/schema";

// OpenRouter configuration
const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": "https://script-sensei.com", // Optional, for OpenRouter rankings
    "X-Title": "Script Sensei", // Optional
  }
});

export interface ModelResult {
  model: string;
  data: PrescriptionData;
  processingTime: number;
  confidence: number;
}

class AIService {
  private createSystemPrompt(customPrompts: ExtractionPrompts): string {
    return `You are an expert medical AI assistant specialized in extracting structured data from handwritten prescriptions. 

Extract the following information from the prescription image and return ONLY valid JSON with no additional text, exactly matching this comprehensive structure. Do not include any explanatory text before or after the JSON. If uncertain about any field, use "NA". Never hallucinate information not visible in the image:

{
  "prescriptionType": {
    "type": "string (General Medicine/Dental/Dermatology/Surgical/Post-op/Pediatric/Gynecology/Obstetrics/Diagnostic/Lab Referral/Others) or NA",
    "customType": "string or NA"
  },
  "patientDetails": {
    "patientName": "string or NA",
    "age": "string or NA",
    "gender": "string or NA",
    "uhid": "string or NA",
    "date": "string or NA",
    "allergies": "string or NA"
  },
  "clinicalDetails": {
    "diagnosis": "string or NA",
    "chiefComplaints": "string or NA",
    "medicalHistory": "string or NA",
    "examination": "string or NA"
  },
  "vitals": {
    "bloodPressure": "string or NA",
    "pulse": "string or NA",
    "temperature": "string or NA",
    "spO2": "string or NA",
    "weight": "string or NA",
    "height": "string or NA",
    "bmi": "string or NA",
    "others": "string or NA"
  },
  "medications": [
    {
      "drugName": "string or NA",
      "formulation": "string (tablet/syrup/ointment/injection/capsule/drops) or NA",
      "strength": "string (mg/ml/g/%) or NA",
      "route": "string (oral/topical/IM/IV/sublingual) or NA",
      "frequency": "string (OD/BD/TDS/QID/1-0-1/twice daily) or NA",
      "duration": "string (days/weeks/months/SOS/PRN) or NA",
      "specialInstructions": "string (after food/before meals/with water/apply on wound) or NA"
    }
  ],
  "advice": {
    "lifestyleAdvice": "string or NA",
    "investigations": "string or NA",
    "followUpInstructions": "string or NA"
  },
  "doctorDetails": {
    "doctorName": "string or NA",
    "signature": "string (present/absent/stamp) or NA",
    "registrationNo": "string or NA"
  },
  "clinicDetails": {
    "clinicName": "string or NA",
    "hospitalName": "string or NA",
    "branch": "string or NA",
    "location": "string or NA",
    "address": "string or NA",
    "contactNumbers": "string or NA",
    "email": "string or NA",
    "website": "string or NA",
    "logo": "string (present/absent) or NA",
    "branding": "string or NA"
  }
}

COMPREHENSIVE EXTRACTION GUIDELINES:

1. PRESCRIPTION TYPE:
${customPrompts.prescriptionType || "Identify the type of prescription based on the specialty area (General Medicine, Dental, Dermatology, Surgical/Post-op, Pediatric, Gynecology/Obstetrics, Diagnostic/Lab Referral, or Others). Look for specialty-specific terminology, clinic letterhead, or medication types."}

2. PATIENT INFORMATION:
- Name: ${customPrompts.patientName || "Extract the patient's full name exactly as written. Look for 'Name:', 'Patient:', or similar labels."}
- Age: ${customPrompts.patientAge || "Extract patient age. Look for formats like '25 yrs', '30 years', '45Y', or age mentioned with patient details."}
- Gender: ${customPrompts.patientGender || "Extract patient gender. Look for M/F, Male/Female, or gender indicators."}
- UHID: ${customPrompts.patientUhid || "Extract UHID, membership number, patient ID, or registration number. Look for alphanumeric codes preceded by labels like 'UHID:', 'ID:', 'Reg No:', etc."}
- Date: ${customPrompts.patientDate || "Extract prescription date. Look for date stamps, 'Date:', or dates near the header/footer."}
- Allergies: ${customPrompts.patientAllergies || "Extract any mentioned allergies or drug sensitivities. Look for 'NKDA', 'No known allergies', or specific allergy mentions."}

3. CLINICAL DETAILS:
- Diagnosis: ${customPrompts.diagnosis || "Extract primary diagnosis or provisional diagnosis. Look for 'Diagnosis:', 'Dx:', 'Impression:', or medical condition names."}
- Chief Complaints: ${customPrompts.chiefComplaints || "Extract chief complaints or presenting symptoms. Look for 'C/O:', 'Chief complaints:', 'Presenting with:', or primary symptoms described."}
- Medical History: ${customPrompts.medicalHistory || "Extract past medical history, known conditions, or ongoing treatments. Look for 'H/O:', 'History:', 'PMH:', or mentions of HTN, DM, previous surgeries, etc."}
- Examination: ${customPrompts.examination || "Extract examination findings, physical assessment results. Look for 'O/E:', 'Examination:', 'Findings:', or clinical observations."}

4. VITALS:
- BP: ${customPrompts.vitalsBP || "Extract blood pressure readings. Look for formats like '120/80', 'BP: 140/90 mmHg', or similar BP notations."}
- Pulse: ${customPrompts.vitalsPulse || "Extract pulse rate. Look for 'Pulse:', 'HR:', numbers followed by 'bpm', '/min', or pulse-related terms."}
- Temperature: ${customPrompts.vitalsTemperature || "Extract body temperature. Look for temperature readings with °F, °C, or 'Temp:' labels."}
- SpO₂: ${customPrompts.vitalsSpO2 || "Extract oxygen saturation. Look for 'SpO2:', 'O2 sat:', percentages related to oxygen levels."}
- Others: ${customPrompts.vitalsOthers || "Extract weight, height, BMI, or other vital measurements. Look for 'Wt:', 'Ht:', 'BMI:', with appropriate units."}

5. MEDICATIONS (CRITICAL - EXTRACT ALL):
- Drug Name: ${customPrompts.medicationDrugName || "Extract all medication names (generic or brand names). Look for 'Rx:', numbered medication lists, or drug names with dosages."}
- Formulation: ${customPrompts.medicationFormulation || "Extract medication forms. Look for 'Tab', 'Tablet', 'Syrup', 'Ointment', 'Injection', 'Capsule', 'Drops', etc."}
- Strength: ${customPrompts.medicationStrength || "Extract medication strength or dosage. Look for numbers with 'mg', 'ml', 'g', 'mcg', '%' strength indicators."}
- Route: ${customPrompts.medicationRoute || "Extract administration route. Look for 'PO', 'Oral', 'IM', 'IV', 'Topical', 'Sublingual', or route specifications."}
- Frequency: ${customPrompts.medicationFrequency || "Extract medication frequency. Look for '1-0-1', 'OD', 'BD', 'TDS', 'QHS', 'twice daily', frequency patterns."}
- Duration: ${customPrompts.medicationDuration || "Extract treatment duration. Look for '5 days', '1 week', '15 days', 'SOS', 'PRN', or duration specifications."}
- Instructions: ${customPrompts.medicationInstructions || "Extract special medication instructions. Look for 'after food', 'before meals', 'apply on wound', 'with water', timing or application instructions."}

6. ADVICE:
- Lifestyle Advice: ${customPrompts.lifestyleAdvice || "Extract lifestyle or non-drug advice. Look for recommendations about rest, diet, exercise, wound care, physiotherapy, or lifestyle modifications."}
- Investigations: ${customPrompts.investigations || "Extract ordered investigations or lab tests. Look for 'Investigations:', test names like CBC, X-ray, MRI, blood tests, or diagnostic procedures."}
- Follow-up: ${customPrompts.followUpInstructions || "Extract follow-up instructions. Look for 'Review after', 'Follow up', appointment scheduling, or next visit instructions."}

7. DOCTOR'S DETAILS:
- Name: ${customPrompts.doctorName || "Extract doctor's name. Look for 'Dr.', physician name at the top/bottom, or signature area names."}
- Signature: ${customPrompts.doctorSignature || "Identify if a signature is present. Look for handwritten signatures, stamp impressions, or signature blocks."}
- Registration: ${customPrompts.doctorRegistration || "Extract medical registration number. Look for 'Reg No:', 'MCI No:', 'License No:', alphanumeric registration codes."}

8. CLINIC/HOSPITAL DETAILS:
- Clinic Name: ${customPrompts.clinicName || "Extract clinic or hospital name. Look for institution names in headers, letterheads, or clinic branding."}
- Location: ${customPrompts.clinicLocation || "Extract clinic address or location. Look for street addresses, city names, pin codes, or location details."}
- Contact: ${customPrompts.clinicContact || "Extract phone numbers, mobile numbers, or contact information. Look for number patterns with area codes or phone formatting."}
- Email: ${customPrompts.clinicEmail || "Extract email addresses or website URLs. Look for email patterns or web addresses in contact sections."}
- Branding: ${customPrompts.clinicBranding || "Identify presence of logos, letterheads, or clinic branding elements. Note any visual branding or institutional markers."}

CRITICAL INSTRUCTIONS:
1. Look for ALL medications - tablets, ointments, creams, drops, etc. Don't miss any!
2. For complaints section (C/O): Extract complete symptom description, duration, severity, what patient has tried before
3. For examination (O/E): Extract all physical findings - appearance, warmth, swelling, redness, discharge, etc.
4. Extract ALL readable medical information from every section of the prescription
5. If any information is not clearly visible or not mentioned, use "NA" as the value
6. Be extremely thorough and capture every detail visible in the prescription

Medical abbreviations to recognize:
- C/O = Chief complaints/complaints of
- O/E = On examination  
- Tab. = Tablet
- AF = After food
- BD = Twice daily
- TDS = Three times daily
- QID = Four times daily
- SOS = If needed
- PRN = As required
- HTN = Hypertension
- DM = Diabetes Mellitus
- NKDA = No Known Drug Allergies`;
  }

  private async extractWithOpenRouterField(base64Image: string, modelId: string, customPrompts: ExtractionPrompts = {}): Promise<PrescriptionData> {
    const response = await openRouter.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: this.createSystemPrompt(customPrompts) + "\n\nPlease analyze this prescription image and extract all the medical information according to the guidelines provided. Return ONLY valid JSON."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const rawContent = response.choices[0].message.content || "{}";

    let extractedData;
    try {
      extractedData = JSON.parse(rawContent);
    } catch (parseError) {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`${modelId} response parsing failed`);
      }
    }

    const validationResult = PrescriptionDataSchema.safeParse(extractedData);
    return validationResult.success ? validationResult.data : extractedData as PrescriptionData;
  }

  async extractWithOpenAI(base64Image: string, customPrompts: ExtractionPrompts = {}): Promise<ModelResult> {
    const startTime = Date.now();
    try {
      const data = await this.extractWithOpenRouterField(base64Image, "openai/gpt-4o", customPrompts);
      return {
        model: "openai",
        data,
        processingTime: Date.now() - startTime,
        confidence: 0.92
      };
    } catch (error) {
      console.error("OpenRouter OpenAI extraction error:", error);
      throw error;
    }
  }

  async extractWithClaude(base64Image: string, customPrompts: ExtractionPrompts = {}): Promise<ModelResult> {
    const startTime = Date.now();
    try {
      // OpenRouter ID for Claude 3.5 Sonnet
      const data = await this.extractWithOpenRouterField(base64Image, "anthropic/claude-3.5-sonnet", customPrompts);
      return {
        model: "claude",
        data,
        processingTime: Date.now() - startTime,
        confidence: 0.94
      };
    } catch (error) {
      console.error("OpenRouter Claude extraction error:", error);
      throw error;
    }
  }

  async extractWithGemini(base64Image: string, customPrompts: ExtractionPrompts = {}): Promise<ModelResult> {
    const startTime = Date.now();
    try {
      // OpenRouter ID for Gemini
      const data = await this.extractWithOpenRouterField(base64Image, "google/gemini-3-flash-preview", customPrompts);
      return {
        model: "gemini",
        data,
        processingTime: Date.now() - startTime,
        confidence: 0.88
      };
    } catch (error) {
      console.error("OpenRouter Gemini extraction error:", error);
      throw error;
    }
  }

  async extractWithAllModels(base64Image: string, selectedModels: string[], customPrompts: ExtractionPrompts = {}): Promise<ModelResult[]> {
    const promises: Promise<ModelResult>[] = [];

    if (selectedModels.includes("openai")) {
      promises.push(this.extractWithOpenAI(base64Image, customPrompts));
    }
    if (selectedModels.includes("claude")) {
      promises.push(this.extractWithClaude(base64Image, customPrompts));
    }
    if (selectedModels.includes("gemini")) {
      promises.push(this.extractWithGemini(base64Image, customPrompts));
    }

    const results = await Promise.allSettled(promises);

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<ModelResult> => result.status === 'fulfilled')
      .map(result => result.value);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const modelName = selectedModels[index];
        console.error(`Model ${modelName} via OpenRouter failed:`, result.reason);
      }
    });

    console.log(`Successfully processed ${successfulResults.length} out of ${selectedModels.length} models via OpenRouter`);

    return successfulResults;
  }
}

export const aiService = new AIService();
