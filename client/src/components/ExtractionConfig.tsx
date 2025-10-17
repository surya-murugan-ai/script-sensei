import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, RefreshCw } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const availableModels = [
  { id: "openai", label: "OpenAI GPT-4o", recommended: true },
  { id: "claude", label: "Claude 3.5 Sonnet" },
  { id: "gemini", label: "Gemini Pro Vision" },
];

const prescriptionTypes = [
  "General Medicine",
  "Dental", 
  "Dermatology",
  "Surgical / Post-op",
  "Pediatric",
  "Gynecology / Obstetrics",
  "Diagnostic / Lab Referral",
  "Others"
];

// Comprehensive extraction field categories
const extractionFieldCategories = {
  prescriptionType: {
    label: "1. Prescription Type",
    fields: [
      { id: "prescriptionType", label: "Prescription Type Detection", defaultPrompt: "Identify the type of prescription based on the specialty area (General Medicine, Dental, Dermatology, Surgical/Post-op, Pediatric, Gynecology/Obstetrics, Diagnostic/Lab Referral, or Others). Look for specialty-specific terminology, clinic letterhead, or medication types." }
    ]
  },
  patientInfo: {
    label: "2. Patient Information",
    fields: [
      { id: "patientName", label: "Patient Name", defaultPrompt: "Extract the patient's full name exactly as written. Look for 'Name:', 'Patient:', or similar labels." },
      { id: "patientAge", label: "Age", defaultPrompt: "Extract patient age. Look for formats like '25 yrs', '30 years', '45Y', or age mentioned with patient details." },
      { id: "patientGender", label: "Gender", defaultPrompt: "Extract patient gender. Look for M/F, Male/Female, or gender indicators." },
      { id: "patientUhid", label: "UHID / Patient ID", defaultPrompt: "Extract UHID, membership number, patient ID, or registration number. Look for alphanumeric codes preceded by labels like 'UHID:', 'ID:', 'Reg No:', etc." },
      { id: "patientDate", label: "Date", defaultPrompt: "Extract prescription date. Look for date stamps, 'Date:', or dates near the header/footer." },
      { id: "patientAllergies", label: "Allergies", defaultPrompt: "Extract any mentioned allergies or drug sensitivities. Look for 'NKDA', 'No known allergies', or specific allergy mentions." }
    ]
  },
  clinicalDetails: {
    label: "3. Clinical Details",
    fields: [
      { id: "diagnosis", label: "Diagnosis / Provisional Diagnosis", defaultPrompt: "Extract primary diagnosis or provisional diagnosis. Look for 'Diagnosis:', 'Dx:', 'Impression:', or medical condition names." },
      { id: "chiefComplaints", label: "Chief Complaints (C/O)", defaultPrompt: "Extract chief complaints or presenting symptoms. Look for 'C/O:', 'Chief complaints:', 'Presenting with:', or primary symptoms described." },
      { id: "medicalHistory", label: "Medical History (M/H)", defaultPrompt: "Extract past medical history, known conditions, or ongoing treatments. Look for 'H/O:', 'History:', 'PMH:', or mentions of HTN, DM, previous surgeries, etc." },
      { id: "examination", label: "On Examination (O/E)", defaultPrompt: "Extract examination findings, physical assessment results. Look for 'O/E:', 'Examination:', 'Findings:', or clinical observations." }
    ]
  },
  vitals: {
    label: "3.1. Vitals",
    fields: [
      { id: "vitalsBP", label: "Blood Pressure (BP)", defaultPrompt: "Extract blood pressure readings. Look for formats like '120/80', 'BP: 140/90 mmHg', or similar BP notations." },
      { id: "vitalsPulse", label: "Pulse", defaultPrompt: "Extract pulse rate. Look for 'Pulse:', 'HR:', numbers followed by 'bpm', '/min', or pulse-related terms." },
      { id: "vitalsTemperature", label: "Temperature", defaultPrompt: "Extract body temperature. Look for temperature readings with °F, °C, or 'Temp:' labels." },
      { id: "vitalsSpO2", label: "SpO₂", defaultPrompt: "Extract oxygen saturation. Look for 'SpO2:', 'O2 sat:', percentages related to oxygen levels." },
      { id: "vitalsOthers", label: "Other Vitals (Weight, Height, BMI)", defaultPrompt: "Extract weight, height, BMI, or other vital measurements. Look for 'Wt:', 'Ht:', 'BMI:', with appropriate units." }
    ]
  },
  medications: {
    label: "4. Prescription (Rx)",
    fields: [
      { id: "medicationDrugName", label: "Drug Name", defaultPrompt: "Extract all medication names (generic or brand names). Look for 'Rx:', numbered medication lists, or drug names with dosages." },
      { id: "medicationFormulation", label: "Formulation", defaultPrompt: "Extract medication forms. Look for 'Tab', 'Tablet', 'Syrup', 'Ointment', 'Injection', 'Capsule', 'Drops', etc." },
      { id: "medicationStrength", label: "Strength/Dosage", defaultPrompt: "Extract medication strength or dosage. Look for numbers with 'mg', 'ml', 'g', 'mcg', '%' strength indicators." },
      { id: "medicationRoute", label: "Route", defaultPrompt: "Extract administration route. Look for 'PO', 'Oral', 'IM', 'IV', 'Topical', 'Sublingual', or route specifications." },
      { id: "medicationFrequency", label: "Frequency", defaultPrompt: "Extract medication frequency. Look for '1-0-1', 'OD', 'BD', 'TDS', 'QHS', 'twice daily', frequency patterns." },
      { id: "medicationDuration", label: "Duration", defaultPrompt: "Extract treatment duration. Look for '5 days', '1 week', '15 days', 'SOS', 'PRN', or duration specifications." },
      { id: "medicationInstructions", label: "Special Instructions", defaultPrompt: "Extract special medication instructions. Look for 'after food', 'before meals', 'apply on wound', 'with water', timing or application instructions." }
    ]
  },
  advice: {
    label: "5. Advice / Additional Notes",
    fields: [
      { id: "lifestyleAdvice", label: "Lifestyle Advice", defaultPrompt: "Extract lifestyle or non-drug advice. Look for recommendations about rest, diet, exercise, wound care, physiotherapy, or lifestyle modifications." },
      { id: "investigations", label: "Investigations / Lab Tests", defaultPrompt: "Extract ordered investigations or lab tests. Look for 'Investigations:', test names like CBC, X-ray, MRI, blood tests, or diagnostic procedures." },
      { id: "followUpInstructions", label: "Follow-up Instructions", defaultPrompt: "Extract follow-up instructions. Look for 'Review after', 'Follow up', appointment scheduling, or next visit instructions." }
    ]
  },
  doctorDetails: {
    label: "6. Doctor's Details",
    fields: [
      { id: "doctorName", label: "Doctor's Name", defaultPrompt: "Extract doctor's name. Look for 'Dr.', physician name at the top/bottom, or signature area names." },
      { id: "doctorSignature", label: "Signature", defaultPrompt: "Identify if a signature is present. Look for handwritten signatures, stamp impressions, or signature blocks." },
      { id: "doctorRegistration", label: "Registration No.", defaultPrompt: "Extract medical registration number. Look for 'Reg No:', 'MCI No:', 'License No:', alphanumeric registration codes." }
    ]
  },
  clinicDetails: {
    label: "7. Clinic / Hospital Details",
    fields: [
      { id: "clinicName", label: "Clinic/Hospital Name", defaultPrompt: "Extract clinic or hospital name. Look for institution names in headers, letterheads, or clinic branding." },
      { id: "clinicLocation", label: "Location/Address", defaultPrompt: "Extract clinic address or location. Look for street addresses, city names, pin codes, or location details." },
      { id: "clinicContact", label: "Contact Numbers", defaultPrompt: "Extract phone numbers, mobile numbers, or contact information. Look for number patterns with area codes or phone formatting." },
      { id: "clinicEmail", label: "Email/Website", defaultPrompt: "Extract email addresses or website URLs. Look for email patterns or web addresses in contact sections." },
      { id: "clinicBranding", label: "Logo/Branding", defaultPrompt: "Identify presence of logos, letterheads, or clinic branding elements. Note any visual branding or institutional markers." }
    ]
  }
};

export default function ExtractionConfig() {
  const [selectedModels, setSelectedModels] = useState<string[]>(["openai", "claude", "gemini"]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [configName, setConfigName] = useState<string>("Default Configuration");
  const [activeTab, setActiveTab] = useState<string>("models");
  const { toast } = useToast();
  
  const { data: configs } = useQuery({
    queryKey: ['/api/configs'],
    select: (data) => data || [],
  });
  
  // Load saved configuration from database OR initialize with defaults
  useEffect(() => {
    if (configs && configs.length > 0) {
      // Find the default configuration
      const defaultConfig = configs.find((c: any) => c.isDefault) || configs[0];
      if (defaultConfig) {
        setConfigName(defaultConfig.name || "Default Configuration");
        setSelectedModels(defaultConfig.selectedModels || ["openai", "claude", "gemini"]);
        setSelectedFields(defaultConfig.selectedFields || []);
        setCustomPrompts(defaultConfig.customPrompts || {});
      }
    } else if (configs !== undefined && configs.length === 0) {
      // No configs in database, initialize with defaults
      const defaultPrompts: Record<string, string> = {};
      const defaultFields: string[] = [];
      
      Object.values(extractionFieldCategories).forEach(category => {
        category.fields.forEach(field => {
          defaultPrompts[field.id] = field.defaultPrompt;
          defaultFields.push(field.id);
        });
      });
      
      setCustomPrompts(defaultPrompts);
      setSelectedFields(defaultFields);
    }
  }, [configs]);
  
  // Save configuration mutation (for new configs)
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch('/api/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });
      if (!response.ok) throw new Error('Failed to save configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configs'] });
      toast({
        title: "Configuration Saved",
        description: "Extraction configuration has been saved successfully."
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update configuration mutation (for existing configs)
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await fetch(`/api/configs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/configs'] });
      toast({
        title: "Configuration Updated",
        description: "Extraction configuration has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handlePromptChange = (field: string, value: string) => {
    setCustomPrompts(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSaveConfig = async () => {
    // Find existing default config to update it instead of creating new one
    const existingDefaultConfig = configs?.find((c: any) => c.isDefault);
    
    const configData = {
      name: configName,
      selectedModels,
      selectedFields,
      customPrompts,
      isDefault: true
    };
    
    if (existingDefaultConfig) {
      // Update existing config
      updateConfigMutation.mutate({ id: existingDefaultConfig.id, data: configData });
    } else {
      // Create new config
      saveConfigMutation.mutate(configData);
    }
  };
  
  const resetToDefaults = () => {
    const defaultPrompts: Record<string, string> = {};
    const defaultFields: string[] = [];
    
    Object.values(extractionFieldCategories).forEach(category => {
      category.fields.forEach(field => {
        defaultPrompts[field.id] = field.defaultPrompt;
        defaultFields.push(field.id);
      });
    });
    
    setCustomPrompts(defaultPrompts);
    setSelectedFields(defaultFields);
    setSelectedModels(["openai", "claude", "gemini"]);
    
    toast({
      title: "Reset Complete",
      description: "Configuration has been reset to default settings."
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Model Configuration</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure AI models and customize extraction prompts for each field
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                data-testid="button-reset-defaults"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSaveConfig}
                disabled={saveConfigMutation.isPending || updateConfigMutation.isPending}
                data-testid="button-save-config"
              >
                <Save className="w-4 h-4 mr-2" />
                {(saveConfigMutation.isPending || updateConfigMutation.isPending) ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Configuration Name</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Enter configuration name"
                className="mt-1"
                data-testid="input-config-name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 py-4 border-b">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="models" data-testid="tab-models">AI Models</TabsTrigger>
                <TabsTrigger value="fields" data-testid="tab-fields">Extraction Fields</TabsTrigger>
                <TabsTrigger value="prompts" data-testid="tab-prompts">Field Prompts</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* AI Models Tab */}
              <TabsContent value="models" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Select AI Models</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose which AI models to use for extraction. Multiple models provide consensus and improve accuracy.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {availableModels.map((model) => (
                      <Card key={model.id} className={`cursor-pointer transition-colors ${
                        selectedModels.includes(model.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`} onClick={() => handleModelToggle(model.id)}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={model.id}
                              checked={selectedModels.includes(model.id)}
                              data-testid={`checkbox-model-${model.id}`}
                            />
                            <div className="flex-1">
                              <Label htmlFor={model.id} className="text-sm font-medium cursor-pointer">
                                {model.label}
                              </Label>
                              {model.recommended && (
                                <div className="mt-1">
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                    Recommended
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Extraction Fields Tab */}
              <TabsContent value="fields" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Data Fields to Extract</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select which fields should be extracted from prescriptions. Each field has a dedicated prompt that can be customized.
                    </p>
                  </div>
                  
                  {Object.entries(extractionFieldCategories).map(([categoryKey, category]) => (
                    <div key={categoryKey} className="space-y-3">
                      <h4 className="font-medium text-primary border-b pb-2">{category.label}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {category.fields.map((field) => (
                          <div key={field.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              id={field.id}
                              checked={selectedFields.includes(field.id)}
                              onCheckedChange={() => handleFieldToggle(field.id)}
                              data-testid={`checkbox-field-${field.id}`}
                            />
                            <Label htmlFor={field.id} className="text-sm cursor-pointer flex-1">
                              {field.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Field Prompts Tab */}
              <TabsContent value="prompts" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Field-Specific Extraction Prompts</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Customize the AI prompts for each extraction field. These prompts guide the AI models on what to look for and how to extract specific information.
                    </p>
                  </div>
                  
                  {Object.entries(extractionFieldCategories).map(([categoryKey, category]) => (
                    <div key={categoryKey} className="space-y-4">
                      <h4 className="font-medium text-primary border-b pb-2">{category.label}</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {category.fields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">{field.label}</Label>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                selectedFields.includes(field.id) 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {selectedFields.includes(field.id) ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <Textarea
                              value={customPrompts[field.id] || field.defaultPrompt}
                              onChange={(e) => handlePromptChange(field.id, e.target.value)}
                              disabled={!selectedFields.includes(field.id)}
                              className={`h-24 text-sm resize-none ${
                                !selectedFields.includes(field.id) ? 'opacity-50' : ''
                              }`}
                              placeholder={field.defaultPrompt}
                              data-testid={`textarea-prompt-${field.id}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
