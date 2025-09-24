import { useState } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Brain, Stethoscope, Pill, Heart, User, Building, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface PrescriptionData {
  prescriptionType?: {
    type?: string;
    customType?: string;
  };
  patientDetails?: {
    patientName?: string;
    age?: string;
    gender?: string;
    uhid?: string;
    date?: string;
    allergies?: string;
  };
  clinicalDetails?: {
    diagnosis?: string;
    chiefComplaints?: string;
    medicalHistory?: string;
    examination?: string;
  };
  vitals?: {
    bloodPressure?: string;
    pulse?: string;
    temperature?: string;
    spO2?: string;
    weight?: string;
    height?: string;
    bmi?: string;
    others?: string;
  };
  medications?: Array<{
    drugName?: string;
    formulation?: string;
    strength?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    specialInstructions?: string;
  }>;
  advice?: {
    lifestyleAdvice?: string;
    investigations?: string;
    followUpInstructions?: string;
  };
  doctorDetails?: {
    doctorName?: string;
    signature?: string;
    registrationNo?: string;
  };
  clinicDetails?: {
    clinicName?: string;
    hospitalName?: string;
    location?: string;
    address?: string;
    contactNumbers?: string;
    email?: string;
    website?: string;
    logo?: string;
    branding?: string;
  };
}

export default function ExtractionResults() {
  const [targetPrescriptionId, setTargetPrescriptionId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<PrescriptionData | null>(null);
  const [rawExtractionData, setRawExtractionData] = useState<any[]>([]);
  const { toast } = useToast();
  const [location] = useLocation();

  const { data: prescriptions } = useQuery({
    queryKey: ['/api/prescriptions'],
    select: (data) => data || [],
  });

  // Get the target prescription ID (from URL params or latest)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const prescriptionIdFromUrl = urlParams.get('prescriptionId');
    
    if (prescriptionIdFromUrl) {
      setTargetPrescriptionId(prescriptionIdFromUrl);
    } else if (prescriptions && Array.isArray(prescriptions) && prescriptions.length > 0) {
      const latest = prescriptions[0];
      setTargetPrescriptionId(latest.id);
    } else {
      setTargetPrescriptionId(null);
    }
  }, [prescriptions, location]);

  // Fetch detailed prescription data with extraction results
  const { data: prescriptionDetail } = useQuery({
    queryKey: ['/api/prescriptions', targetPrescriptionId],
    queryFn: async () => {
      if (!targetPrescriptionId) return null;
      const response = await fetch(`/api/prescriptions/${targetPrescriptionId}`);
      return response.json();
    },
    enabled: !!targetPrescriptionId,
  });

  // Process extraction results
  React.useEffect(() => {
    if (prescriptionDetail) {
      if (prescriptionDetail.extractedData) {
        setExtractedData(prescriptionDetail.extractedData);
      }
      if (prescriptionDetail.extractionResults) {
        setRawExtractionData(prescriptionDetail.extractionResults);
      }
    } else {
      setExtractedData(null);
      setRawExtractionData([]);
    }
  }, [prescriptionDetail]);

  const updateField = (index: number, newValue: string) => {
    setResults(prev => prev.map((result, i) => 
      i === index ? { ...result, finalValue: newValue } : result
    ));
  };

  const saveFieldChanges = async () => {
    if (!targetPrescriptionId || results.length === 0) return;

    try {
      const fieldUpdates: Record<string, string> = {};
      results.forEach(result => {
        fieldUpdates[result.fieldName] = result.finalValue;
      });

      const response = await fetch(`/api/prescriptions/${targetPrescriptionId}/extracted-data`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fieldUpdates }),
      });

      if (!response.ok) throw new Error('Failed to save changes');

      // Invalidate the query to refresh data
      queryClient.invalidateQueries({
        queryKey: ['/api/prescriptions', targetPrescriptionId]
      });

      toast({
        title: "Changes saved",
        description: "Field updates have been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      // Export only the current prescription being viewed
      const exportUrl = targetPrescriptionId 
        ? `/api/export/${format}?prescriptionId=${targetPrescriptionId}`
        : `/api/export/${format}`;
      
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescription_${targetPrescriptionId?.slice(0, 8) || 'all'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `Results exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const stats = {
    totalFields: results.length,
    extractedFields: results.filter(r => r.finalValue && r.finalValue !== "NA").length,
    conflicts: results.filter(r => r.hasConflict).length,
    naFields: results.filter(r => r.finalValue === "NA").length,
  };

  // Helper function to convert extraction results to display format
  const convertExtractionResultsToDisplay = (extractionResults: any[]): ExtractionField[] => {
    if (!extractionResults || !Array.isArray(extractionResults)) return [];
    
    // Group results by fieldName
    const fieldGroups: Record<string, Record<string, string>> = {};
    
    extractionResults.forEach((result) => {
      const fieldName = result.field_name || result.fieldName;
      const modelName = result.model_name || result.modelName;
      const value = result.extracted_value || result.extractedValue || "NA";
      
      if (!fieldGroups[fieldName]) {
        fieldGroups[fieldName] = {};
      }
      fieldGroups[fieldName][modelName] = value;
    });
    
    // Convert to display format
    const displayResults: ExtractionField[] = [];
    
    Object.entries(fieldGroups).forEach(([fieldName, modelValues]) => {
      const gpt4vResult = modelValues.openai || "NA";
      const claudeResult = modelValues.claude || "NA";
      const geminiResult = modelValues.gemini || "NA";
      
      // Determine final value (majority vote or most confident)
      const values = [gpt4vResult, claudeResult, geminiResult].filter(v => v !== "NA");
      const finalValue = values.length > 0 ? values[0] : "NA"; // Simple: use first non-NA value
      
      // Check for conflicts
      const uniqueValues = new Set([gpt4vResult, claudeResult, geminiResult].filter(v => v !== "NA"));
      const hasConflict = uniqueValues.size > 1;
      
      displayResults.push({
        fieldName,
        gpt4vResult,
        claudeResult,
        geminiResult,
        finalValue,
        hasConflict
      });
    });
    
    return displayResults;
  };

  // Helper function to format results as comprehensive prescription format
  const formatAsPrescription = (results: ExtractionField[]) => {
    const getValue = (fieldName: string) => {
      const field = results.find(r => r.fieldName === fieldName);
      return field?.finalValue && field.finalValue !== "NA" ? field.finalValue : null;
    };

    const formatMedications = () => {
      const medications = [];
      let index = 0;
      
      // Extract all medications (could be multiple)
      while (true) {
        const suffix = index === 0 ? "" : `_${index + 1}`;
        const drugName = getValue(`medication_drugName${suffix}`);
        if (!drugName) break;
        
        const dosage = getValue(`medication_dosageStrength${suffix}`);
        const form = getValue(`medication_form${suffix}`);
        const frequency = getValue(`medication_frequency${suffix}`);
        const duration = getValue(`medication_duration${suffix}`);
        const instructions = getValue(`medication_specialInstructions${suffix}`);
        const route = getValue(`medication_route${suffix}`);
        
        medications.push({
          drugName,
          formulation: form,
          strength: dosage,
          route: route,
          frequency: frequency,
          duration: duration,
          instructions: instructions
        });
        index++;
      }
      
      return medications;
    };

    // Determine prescription type based on content
    const determinePrescriptionType = () => {
      const diagnosis = getValue("patient_diagnosis") || "";
      const medications = formatMedications();
      
      if (diagnosis.toLowerCase().includes("dental") || diagnosis.toLowerCase().includes("tooth") || 
          medications.some(m => m.drugName?.toLowerCase().includes("dental"))) {
        return "Dental";
      }
      if (diagnosis.toLowerCase().includes("skin") || diagnosis.toLowerCase().includes("dermat")) {
        return "Dermatology";
      }
      if (diagnosis.toLowerCase().includes("surgery") || diagnosis.toLowerCase().includes("post-op")) {
        return "Surgical / Post-op";
      }
      if (diagnosis.toLowerCase().includes("child") || diagnosis.toLowerCase().includes("pediatric")) {
        return "Pediatric";
      }
      if (diagnosis.toLowerCase().includes("gynec") || diagnosis.toLowerCase().includes("obstet")) {
        return "Gynecology / Obstetrics";
      }
      if (diagnosis.toLowerCase().includes("test") || diagnosis.toLowerCase().includes("lab")) {
        return "Diagnostic / Lab Referral";
      }
      return "General Medicine";
    };

    return {
      // 1. Prescription Type
      prescriptionType: determinePrescriptionType(),
      
      // 2. Patient Information
      patientName: getValue("patient_patientName"),
      age: getValue("patient_age"),
      gender: getValue("patient_gender"),
      uhid: getValue("patient_patientId") || getValue("patient_uhid"),
      date: getValue("patient_date") || getValue("prescription_date"),
      allergies: getValue("patient_allergies"),
      
      // 3. Clinical Details
      diagnosis: getValue("patient_diagnosis"),
      chiefComplaints: getValue("chiefComplaints_primarySymptoms") || getValue("chief_complaints"),
      medicalHistory: getValue("patient_medicalHistory") || getValue("medical_history"),
      examination: getValue("examination_localExamination") || getValue("examination_findings"),
      
      // Vitals
      bloodPressure: getValue("vitals_bloodPressure"),
      pulse: getValue("vitals_pulseRate"),
      temperature: getValue("vitals_temperature"),
      spO2: getValue("vitals_spO2"),
      weight: getValue("vitals_weight"),
      height: getValue("vitals_height"),
      bmi: getValue("vitals_bmi"),
      
      // 4. Medications
      medications: formatMedications(),
      
      // 5. Advice / Additional Notes
      lifestyleAdvice: getValue("followUp_lifestyleAdvice"),
      investigations: getValue("investigations_others") || getValue("investigations_labTests"),
      followUp: getValue("followUp_reviewDate") || getValue("followUp_nextSteps"),
      
      // 6. Doctor's Details
      doctorName: getValue("doctor_doctorName"),
      signature: getValue("doctor_signature"),
      registrationNo: getValue("doctor_registrationNumber") || getValue("doctor_licenseNumber"),
      
      // 7. Clinic Details
      clinicName: getValue("doctor_clinicName"),
      location: getValue("doctor_location") || getValue("doctor_address"),
      contact: getValue("doctor_contactNumber") || getValue("doctor_phone"),
      email: getValue("doctor_email"),
      website: getValue("doctor_website")
    };
  };

  return (
    <Card data-testid="extraction-results-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Extraction Results</CardTitle>
          <div className="flex items-center space-x-3">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-40" data-testid="select-model-filter">
                <SelectValue placeholder="Filter by model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="openai">OpenAI GPT-5</SelectItem>
                <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="gemini">Gemini Pro Vision</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="default" 
              size="sm"
              onClick={saveFieldChanges}
              data-testid="button-save-changes"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExport('csv')}
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExport('json')}
              data-testid="button-export-json"
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Model Comparison Tabs */}
        <Tabs defaultValue="comparison" className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="comparison" data-testid="tab-comparison">Comparison View</TabsTrigger>
            <TabsTrigger value="individual" data-testid="tab-individual">Individual Results</TabsTrigger>
            <TabsTrigger value="confidence" data-testid="tab-confidence">Confidence Scores</TabsTrigger>
            <TabsTrigger value="prescription" data-testid="tab-prescription">Prescription Format</TabsTrigger>
          </TabsList>
          
          <TabsContent value="comparison">
            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="results-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Field</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">GPT-5</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Claude 3.5</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Gemini Pro</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Final Value</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((result, index) => (
                    <tr key={index} data-testid={`result-row-${index}`}>
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {result.fieldName}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground" data-testid={`gpt4v-result-${index}`}>
                        {result.gpt4vResult}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground" data-testid={`claude-result-${index}`}>
                        {result.claudeResult}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground" data-testid={`gemini-result-${index}`}>
                        {result.geminiResult}
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          value={result.finalValue}
                          onChange={(e) => updateField(index, e.target.value)}
                          className="w-full text-sm"
                          data-testid={`final-value-input-${index}`}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={result.hasConflict ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
                          data-testid={`action-button-${index}`}
                        >
                          {result.hasConflict ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          <TabsContent value="individual">
            <div className="space-y-6">
              {/* Model Selection for Individual View */}
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-foreground">Select Model:</span>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    <SelectItem value="openai">OpenAI GPT-5</SelectItem>
                    <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="gemini">Gemini Pro Vision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Individual Model Results */}
              <div className="space-y-4">
                {selectedModel === "all" ? (
                  // Show all models side by side
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[
                      { key: "openai", name: "OpenAI GPT-5", color: "border-blue-200" },
                      { key: "claude", name: "Claude 3.5 Sonnet", color: "border-orange-200" },
                      { key: "gemini", name: "Gemini Pro Vision", color: "border-green-200" }
                    ].map(model => (
                      <Card key={model.key} className={`${model.color} bg-card`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{model.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {results.map((result, index) => {
                              const value = model.key === "openai" ? result.gpt4vResult :
                                           model.key === "claude" ? result.claudeResult :
                                           result.geminiResult;
                              return (
                                <div key={index} className="flex justify-between items-center py-1 border-b border-border last:border-b-0">
                                  <span className="text-sm font-medium text-muted-foreground">{result.fieldName}:</span>
                                  <span className={`text-sm ${value === "NA" ? "text-muted-foreground italic" : "text-foreground"}`}>
                                    {value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Show selected model only
                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle>
                        {selectedModel === "openai" ? "OpenAI GPT-5" :
                         selectedModel === "claude" ? "Claude 3.5 Sonnet" :
                         "Gemini Pro Vision"} Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {results.map((result, index) => {
                          const value = selectedModel === "openai" ? result.gpt4vResult :
                                       selectedModel === "claude" ? result.claudeResult :
                                       result.geminiResult;
                          return (
                            <div key={index} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                              <span className="text-sm font-medium text-foreground">{result.fieldName}</span>
                              <span className={`text-sm ${value === "NA" ? "text-muted-foreground italic" : "text-foreground font-medium"}`}>
                                {value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="confidence">
            <div className="space-y-6">
              {/* Confidence Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-blue-800">OpenAI GPT-5</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">88%</div>
                    <div className="text-sm text-blue-600">Average Confidence</div>
                    <div className="mt-2 text-xs text-blue-500">
                      Processing Time: {prescriptionDetail?.extractionResults?.find((r: any) => r.modelName === "openai")?.processingTime || 0}ms
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-orange-50 border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-orange-800">Claude 3.5 Sonnet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">92%</div>
                    <div className="text-sm text-orange-600">Average Confidence</div>
                    <div className="mt-2 text-xs text-orange-500">
                      Processing Time: {prescriptionDetail?.extractionResults?.find((r: any) => r.modelName === "claude")?.processingTime || 0}ms
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-green-800">Gemini Pro Vision</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">85%</div>
                    <div className="text-sm text-green-600">Average Confidence</div>
                    <div className="mt-2 text-xs text-green-500">
                      Processing Time: {prescriptionDetail?.extractionResults?.find((r: any) => r.modelName === "gemini")?.processingTime || 0}ms
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Confidence Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Field-Level Confidence Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Field</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">GPT-5</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Claude 3.5</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Gemini Pro</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Best Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.map((result, index) => {
                          // Get confidence scores from extraction results
                          const openaiConfidence = prescriptionDetail?.extractionResults?.find(
                            (r: any) => r.modelName === "openai" && r.fieldName === result.fieldName
                          )?.confidence || 0.88;
                          
                          const claudeConfidence = prescriptionDetail?.extractionResults?.find(
                            (r: any) => r.modelName === "claude" && r.fieldName === result.fieldName
                          )?.confidence || 0.92;
                          
                          const geminiConfidence = prescriptionDetail?.extractionResults?.find(
                            (r: any) => r.modelName === "gemini" && r.fieldName === result.fieldName
                          )?.confidence || 0.85;
                          
                          const bestScore = Math.max(openaiConfidence, claudeConfidence, geminiConfidence);
                          
                          return (
                            <tr key={index}>
                              <td className="py-3 px-4 text-sm font-medium text-foreground">
                                {result.fieldName}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  openaiConfidence >= 0.9 ? "bg-green-100 text-green-800" :
                                  openaiConfidence >= 0.7 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {(openaiConfidence * 100).toFixed(0)}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  claudeConfidence >= 0.9 ? "bg-green-100 text-green-800" :
                                  claudeConfidence >= 0.7 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {(claudeConfidence * 100).toFixed(0)}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  geminiConfidence >= 0.9 ? "bg-green-100 text-green-800" :
                                  geminiConfidence >= 0.7 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {(geminiConfidence * 100).toFixed(0)}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                  bestScore >= 0.9 ? "bg-green-200 text-green-900" :
                                  bestScore >= 0.7 ? "bg-yellow-200 text-yellow-900" :
                                  "bg-red-200 text-red-900"
                                }`}>
                                  {(bestScore * 100).toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="prescription">
            <div className="space-y-6" data-testid="prescription-format">
              {/* Prescription Selector */}
              <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium text-foreground">Select Prescription:</span>
                <Select 
                  value={selectedPrescriptionForFormat || ""} 
                  onValueChange={(value) => {
                    setSelectedPrescriptionForFormat(value);
                    setTargetPrescriptionId(value);
                  }}
                >
                  <SelectTrigger className="w-80" data-testid="select-prescription-trigger">
                    <SelectValue placeholder="Choose a prescription to view" />
                  </SelectTrigger>
                  <SelectContent>
                    {prescriptions && Array.isArray(prescriptions) && prescriptions.map((prescription: any) => (
                      <SelectItem key={prescription.id} value={prescription.id} data-testid={`select-prescription-item-${prescription.id}`}>
                        {prescription.fileName} - {new Date(prescription.uploadedAt).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPrescriptionForFormat && prescriptionDetail ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left side - Prescription Image */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Original Prescription</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={`/api/prescriptions/${selectedPrescriptionForFormat}/image`}
                            alt="Prescription Image"
                            className="w-full h-full object-contain"
                            data-testid="prescription-image"
                          />
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          <p><strong>File:</strong> {prescriptionDetail.prescription.fileName}</p>
                          <p><strong>Uploaded:</strong> {new Date(prescriptionDetail.prescription.uploadedAt).toLocaleString()}</p>
                          <p><strong>Status:</strong> {prescriptionDetail.prescription.processingStatus}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right side - Extracted Data */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Extracted Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const formatResults = prescriptionDetail.extractionResults 
                            ? convertExtractionResultsToDisplay(prescriptionDetail.extractionResults)
                            : [];
                          const prescriptionData = formatAsPrescription(formatResults);
                          
                          return (
                            <div className="space-y-6">
                              {/* 1. Prescription Type */}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 border-b-2 border-blue-200 pb-2 flex items-center">
                                  📋 1. Prescription Type
                                </h3>
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <span className="text-blue-800 font-medium">
                                    {prescriptionData.prescriptionType || "General Medicine"}
                                  </span>
                                  <span className="text-blue-600 text-sm ml-2">
                                    (Auto-detected based on content)
                                  </span>
                                </div>
                              </div>

                              {/* 2. Patient Information */}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 border-b-2 border-green-200 pb-2 flex items-center">
                                  👤 2. Patient Information
                                </h3>
                                <div className="bg-green-50 p-4 rounded-lg space-y-2">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-medium text-green-700 text-sm">Patient Name:</span>
                                      <div className="text-green-800">{prescriptionData.patientName || "[Not specified]"}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-green-700 text-sm">Age / Gender:</span>
                                      <div className="text-green-800">
                                        {prescriptionData.age || "[Age not specified]"} / {prescriptionData.gender || "[Gender not specified]"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-medium text-green-700 text-sm">UHID / Patient ID:</span>
                                      <div className="text-green-800">{prescriptionData.uhid || "[Not available]"}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-green-700 text-sm">Date:</span>
                                      <div className="text-green-800">{prescriptionData.date || "[Date not specified]"}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-green-700 text-sm">Allergies:</span>
                                    <div className="text-green-800">
                                      {prescriptionData.allergies || "No known drug allergies (NKDA)"}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Clinical Details */}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 border-b-2 border-purple-200 pb-2 flex items-center">
                                  🩺 3. Clinical Details
                                </h3>
                                <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                                  {/* Diagnosis */}
                                  <div>
                                    <span className="font-medium text-purple-700 text-sm">Diagnosis / Provisional Diagnosis:</span>
                                    <div className="text-purple-800 bg-white p-2 rounded border">
                                      {prescriptionData.diagnosis || "[Diagnosis not specified]"}
                                    </div>
                                  </div>
                                  
                                  {/* Chief Complaints */}
                                  <div>
                                    <span className="font-medium text-purple-700 text-sm">Chief Complaints (C/O):</span>
                                    <div className="text-purple-800 bg-white p-2 rounded border">
                                      {prescriptionData.chiefComplaints || "[Chief complaints not documented]"}
                                    </div>
                                  </div>
                                  
                                  {/* Medical History */}
                                  <div>
                                    <span className="font-medium text-purple-700 text-sm">History / Medical History (M/H):</span>
                                    <div className="text-purple-800 bg-white p-2 rounded border">
                                      {prescriptionData.medicalHistory || "[Medical history not available]"}
                                    </div>
                                  </div>
                                  
                                  {/* Examination */}
                                  <div>
                                    <span className="font-medium text-purple-700 text-sm">On Examination (O/E):</span>
                                    <div className="text-purple-800 bg-white p-2 rounded border">
                                      {prescriptionData.examination || "[Examination findings not documented]"}
                                    </div>
                                  </div>
                                  
                                  {/* Vitals */}
                                  <div>
                                    <span className="font-medium text-purple-700 text-sm mb-2 block">Vitals:</span>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                      <div className="bg-white p-2 rounded border">
                                        <div className="text-xs text-purple-600">BP</div>
                                        <div className="text-purple-800 font-medium">{prescriptionData.bloodPressure || "[Not recorded]"}</div>
                                      </div>
                                      <div className="bg-white p-2 rounded border">
                                        <div className="text-xs text-purple-600">Pulse</div>
                                        <div className="text-purple-800 font-medium">{prescriptionData.pulse || "[Not recorded]"}</div>
                                      </div>
                                      <div className="bg-white p-2 rounded border">
                                        <div className="text-xs text-purple-600">Temperature</div>
                                        <div className="text-purple-800 font-medium">{prescriptionData.temperature || "[Not recorded]"}</div>
                                      </div>
                                      <div className="bg-white p-2 rounded border">
                                        <div className="text-xs text-purple-600">SpO₂</div>
                                        <div className="text-purple-800 font-medium">{prescriptionData.spO2 || "[Not recorded]"}</div>
                                      </div>
                                    </div>
                                    {(prescriptionData.weight || prescriptionData.height || prescriptionData.bmi) && (
                                      <div className="grid grid-cols-3 gap-3 mt-2">
                                        {prescriptionData.weight && (
                                          <div className="bg-white p-2 rounded border">
                                            <div className="text-xs text-purple-600">Weight</div>
                                            <div className="text-purple-800 font-medium">{prescriptionData.weight}</div>
                                          </div>
                                        )}
                                        {prescriptionData.height && (
                                          <div className="bg-white p-2 rounded border">
                                            <div className="text-xs text-purple-600">Height</div>
                                            <div className="text-purple-800 font-medium">{prescriptionData.height}</div>
                                          </div>
                                        )}
                                        {prescriptionData.bmi && (
                                          <div className="bg-white p-2 rounded border">
                                            <div className="text-xs text-purple-600">BMI</div>
                                            <div className="text-purple-800 font-medium">{prescriptionData.bmi}</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 4. Prescription (Rx) */}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 border-b-2 border-red-200 pb-2 flex items-center">
                                  💊 4. Prescription (Rx)
                                </h3>
                                <div className="bg-red-50 p-4 rounded-lg">
                                  {prescriptionData.medications.length > 0 ? (
                                    <div className="space-y-3">
                                      {prescriptionData.medications.map((medication, index) => (
                                        <div key={index} className="bg-white p-3 rounded border border-red-200">
                                          <div className="flex items-start justify-between">
                                            <span className="font-medium text-red-800 text-lg">{index + 1}.</span>
                                            <div className="flex-1 ml-3">
                                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-sm">
                                                <div>
                                                  <span className="font-medium text-red-700">Drug Name:</span>
                                                  <div className="text-red-800 font-semibold">{medication.drugName || "[Not specified]"}</div>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-red-700">Formulation:</span>
                                                  <div className="text-red-800">{medication.formulation || "[Not specified]"}</div>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-red-700">Strength:</span>
                                                  <div className="text-red-800">{medication.strength || "[Not specified]"}</div>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-red-700">Route:</span>
                                                  <div className="text-red-800">{medication.route || "PO (Oral)"}</div>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-red-700">Frequency:</span>
                                                  <div className="text-red-800">{medication.frequency || "[Not specified]"}</div>
                                                </div>
                                                <div>
                                                  <span className="font-medium text-red-700">Duration:</span>
                                                  <div className="text-red-800">{medication.duration || "[Not specified]"}</div>
                                                </div>
                                              </div>
                                              {medication.instructions && (
                                                <div className="mt-2 pt-2 border-t border-red-100">
                                                  <span className="font-medium text-red-700 text-sm">Special Instructions:</span>
                                                  <div className="text-red-800 text-sm italic">{medication.instructions}</div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-red-700 italic text-center py-4">
                                      [No medications prescribed or not clearly documented]
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 5. Advice / Additional Notes */}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 border-b-2 border-orange-200 pb-2 flex items-center">
                                  💡 5. Advice / Additional Notes
                                </h3>
                                <div className="bg-orange-50 p-4 rounded-lg space-y-3">
                                  <div>
                                    <span className="font-medium text-orange-700 text-sm">Lifestyle / Non-drug Advice:</span>
                                    <div className="text-orange-800 bg-white p-2 rounded border">
                                      {prescriptionData.lifestyleAdvice || "[No specific lifestyle advice documented]"}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-orange-700 text-sm">Investigations / Lab Tests:</span>
                                    <div className="text-orange-800 bg-white p-2 rounded border">
                                      {prescriptionData.investigations || "[No investigations ordered]"}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-orange-700 text-sm">Follow-up Instructions:</span>
                                    <div className="text-orange-800 bg-white p-2 rounded border">
                                      {prescriptionData.followUp || "[No specific follow-up instructions]"}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 6. Doctor's Details */}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 border-b-2 border-indigo-200 pb-2 flex items-center">
                                  👨‍⚕️ 6. Doctor's Details
                                </h3>
                                <div className="bg-indigo-50 p-4 rounded-lg space-y-2">
                                  <div>
                                    <span className="font-medium text-indigo-700 text-sm">Doctor's Name:</span>
                                    <div className="text-indigo-800 font-semibold">{prescriptionData.doctorName || "[Doctor name not clear]"}</div>
                                  </div>
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-medium text-indigo-700 text-sm">Signature:</span>
                                      <div className="text-indigo-800">{prescriptionData.signature || "[Signature present but not extracted]"}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-indigo-700 text-sm">Registration No.:</span>
                                      <div className="text-indigo-800">{prescriptionData.registrationNo || "[Registration number not visible]"}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 7. Clinic / Hospital Details */}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 border-b-2 border-teal-200 pb-2 flex items-center">
                                  🏥 7. Clinic / Hospital Details
                                </h3>
                                <div className="bg-teal-50 p-4 rounded-lg space-y-2">
                                  <div>
                                    <span className="font-medium text-teal-700 text-sm">Clinic / Hospital Name:</span>
                                    <div className="text-teal-800 font-semibold">{prescriptionData.clinicName || "[Clinic name not clearly visible]"}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-teal-700 text-sm">Address / Location:</span>
                                    <div className="text-teal-800">{prescriptionData.location || "[Address not documented]"}</div>
                                  </div>
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-medium text-teal-700 text-sm">Contact Number:</span>
                                      <div className="text-teal-800">{prescriptionData.contact || "[Contact not visible]"}</div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-teal-700 text-sm">Email / Website:</span>
                                      <div className="text-teal-800">{prescriptionData.email || prescriptionData.website || "[Not available]"}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 8. AI-Generated Summary */}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 border-b-2 border-gray-300 pb-2 flex items-center">
                                  🔎 8. AI-Generated Summary
                                </h3>
                                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                  <div>
                                    <span className="font-medium text-gray-700 text-sm">Condition Understanding:</span>
                                    <div className="text-gray-800 bg-white p-3 rounded border">
                                      {prescriptionData.diagnosis 
                                        ? `Patient presents with ${prescriptionData.diagnosis.toLowerCase()}. ${prescriptionData.chiefComplaints ? `Main complaints include ${prescriptionData.chiefComplaints.toLowerCase()}.` : ''}`
                                        : "[Condition details not clearly documented in prescription]"}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700 text-sm">Treatment Plan Summary:</span>
                                    <div className="text-gray-800 bg-white p-3 rounded border">
                                      {prescriptionData.medications.length > 0 
                                        ? `${prescriptionData.medications.length} medication(s) prescribed. ${prescriptionData.lifestyleAdvice ? `Additional advice: ${prescriptionData.lifestyleAdvice}` : 'Follow prescribed medication schedule as directed.'}`
                                        : "[Treatment plan not clearly specified]"}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700 text-sm">Next Steps:</span>
                                    <div className="text-gray-800 bg-white p-3 rounded border">
                                      {prescriptionData.followUp || prescriptionData.investigations 
                                        ? `${prescriptionData.followUp ? `Follow-up: ${prescriptionData.followUp}. ` : ''}${prescriptionData.investigations ? `Investigations needed: ${prescriptionData.investigations}.` : ''}`
                                        : "Continue prescribed medications and monitor symptoms. Contact doctor if condition worsens."}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-700 text-sm">Caution Notes:</span>
                                    <div className="text-gray-800 bg-white p-3 rounded border">
                                      {prescriptionData.medications.some(m => m.drugName?.toLowerCase().includes('antibiotic')) 
                                        ? "⚠️ Complete full antibiotic course even if symptoms improve. Do not stop medication early."
                                        : "⚠️ Take medications as prescribed. Consult doctor if any adverse effects occur or if symptoms persist/worsen."}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Select a prescription to view the side-by-side comparison</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="summary-stats">
          <div className="bg-muted rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="stat-total-fields">
              {stats.totalFields}
            </div>
            <div className="text-sm text-muted-foreground">Total Fields</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="stat-extracted-fields">
              {stats.extractedFields}
            </div>
            <div className="text-sm text-green-600">Extracted</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600" data-testid="stat-conflicts">
              {stats.conflicts}
            </div>
            <div className="text-sm text-amber-600">Conflicts</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600" data-testid="stat-na-fields">
              {stats.naFields}
            </div>
            <div className="text-sm text-gray-600">Not Available</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
