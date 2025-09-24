import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Brain, Stethoscope, Pill, Heart, User, Building, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PrescriptionFormatDisplayProps {
  prescriptionId: string | null;
}

export default function PrescriptionFormatDisplay({ prescriptionId }: PrescriptionFormatDisplayProps) {
  const { toast } = useToast();

  // Fetch extraction results
  const { data: extractionResults } = useQuery({
    queryKey: ['/api/extraction-results'],
    select: (data) => Array.isArray(data) ? data : [],
  });

  // Fetch prescription detail
  const { data: prescriptionDetail } = useQuery({
    queryKey: ['/api/prescriptions', prescriptionId],
    queryFn: async () => {
      if (!prescriptionId) return null;
      const response = await fetch(`/api/prescriptions/${prescriptionId}`);
      return response.json();
    },
    enabled: !!prescriptionId,
  });

  // Helper function to get field value from structured data or fallback to extraction results
  const getFieldValue = (fieldPath: string, fallbackFieldName?: string): string => {
    // First try to get from structured extracted data - check both possible nested structures
    const extractedData = prescriptionDetail?.extractedData || prescriptionDetail?.prescription?.extractedData;
    if (extractedData) {
      const keys = fieldPath.split('.');
      let value = extractedData;
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          value = null;
          break;
        }
      }
      
      if (value && value !== "NA" && value !== "") {
        return String(value);
      }
    }
    
    // Fallback to extraction results consensus
    if (Array.isArray(extractionResults) && prescriptionId && fallbackFieldName) {
      const results = extractionResults.filter((r: any) => 
        (r.prescriptionId === prescriptionId || r.prescription_id === prescriptionId) &&
        (r.fieldName === fallbackFieldName || r.field_name === fallbackFieldName) &&
        (r.extractedValue !== "NA" && r.extracted_value !== "NA" && r.extractedValue !== "" && r.extracted_value !== "")
      );
      
      if (results.length > 0) {
        // Get most common value
        const valueCounts: Record<string, number> = {};
        results.forEach((r: any) => {
          const value = r.extractedValue || r.extracted_value || "";
          if (value) {
            valueCounts[value] = (valueCounts[value] || 0) + 1;
          }
        });
        
        const mostCommon = Object.entries(valueCounts).reduce((a, b) => 
          valueCounts[a[0]] > valueCounts[b[0]] ? a : b
        );
        
        return mostCommon[0] || "";
      }
    }
    
    return "";
  };

  // Helper function to get medications array
  const getMedications = () => {
    // First try structured data - check both possible nested structures
    const extractedData = prescriptionDetail?.extractedData || prescriptionDetail?.prescription?.extractedData;
    if (extractedData?.medications && Array.isArray(extractedData.medications)) {
      const structuredMeds = extractedData.medications.filter((med: any) => 
        med.drugName && med.drugName !== "NA" && med.drugName !== ""
      );
      return structuredMeds;
    }
    
    // Fallback to extraction results - group by medication index
    if (!Array.isArray(extractionResults) || !prescriptionId) return [];
    
    const results = extractionResults.filter((r: any) => 
      (r.prescriptionId === prescriptionId || r.prescription_id === prescriptionId) &&
      (r.fieldName?.includes('medication_') || r.field_name?.includes('medication_'))
    );
    
    const medicationGroups: Record<string, any> = {};
    
    results.forEach((r: any) => {
      const fieldName = r.fieldName || r.field_name || "";
      const value = r.extractedValue || r.extracted_value || "";
      
      if (value && value !== "NA") {
        // Parse field name like "medication_drugName" or "medication_1_drugName"
        const match = fieldName.match(/medication_(?:(\d+)_)?(\w+)/);
        if (match) {
          const index = match[1] || "0";
          const field = match[2];
          
          if (!medicationGroups[index]) {
            medicationGroups[index] = {};
          }
          medicationGroups[index][field] = value;
        }
      }
    });
    
    // Convert to array format
    return Object.values(medicationGroups)
      .filter(med => med.drugName)
      .map(med => ({
        drugName: med.drugName,
        formulation: med.formulation || med.form,
        strength: med.strength || med.dosageStrength,
        route: med.route,
        frequency: med.frequency,
        duration: med.duration,
        specialInstructions: med.specialInstructions || med.instructions
      }));
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const exportUrl = prescriptionId 
        ? `/api/export/${format}?prescriptionId=${prescriptionId}`
        : `/api/export/${format}`;
      
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescription_${prescriptionId?.slice(0, 8) || 'all'}.${format}`;
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

  if (!prescriptionId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No prescription selected</p>
            <p className="text-sm text-muted-foreground">Upload a prescription to see extraction results</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const medications = getMedications();
  

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Prescription Extraction</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
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
      </Card>

      {/* 1. Prescription Type */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-700">
            <FileText className="w-5 h-5" />
            <span>1. Prescription Type</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            {getFieldValue('prescriptionType.type', 'prescriptionType') || 
             getFieldValue('prescriptionType.customType', 'prescriptionType_custom') || 
             "General Medicine"}
          </p>
        </CardContent>
      </Card>

      {/* 2. Patient Information */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-700">
            <User className="w-5 h-5" />
            <span>2. Patient Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const patientName = getFieldValue('patientDetails.patientName', 'patient_patientName');
            const age = getFieldValue('patientDetails.age', 'patient_age');
            const gender = getFieldValue('patientDetails.gender', 'patient_gender');
            const uhid = getFieldValue('patientDetails.uhid', 'patient_uhid');
            const allergies = getFieldValue('patientDetails.allergies', 'patient_allergies');
            const diagnosis = getFieldValue('clinicalDetails.diagnosis', 'patient_diagnosis');
            const date = getFieldValue('patientDetails.date', 'patient_date');
            
            return (
              <>
                {patientName && (
                  <div>
                    <span className="font-medium">Name: </span>
                    <span>{patientName}</span>
                  </div>
                )}
                {age && (
                  <div>
                    <span className="font-medium">Age: </span>
                    <span>{age}</span>
                  </div>
                )}
                {gender && (
                  <div>
                    <span className="font-medium">Gender: </span>
                    <span>{gender}</span>
                  </div>
                )}
                {uhid && (
                  <div>
                    <span className="font-medium">UHID: </span>
                    <span>{uhid}</span>
                  </div>
                )}
                {date && (
                  <div>
                    <span className="font-medium">Date: </span>
                    <span>{date}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">Allergies: </span>
                  <span>{allergies || "No known allergies"}</span>
                </div>
                <div>
                  <span className="font-medium">Diagnosis: </span>
                  <span>{diagnosis || "[Diagnosis not documented]"}</span>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* 3. Clinical Details */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-purple-700">
            <Stethoscope className="w-5 h-5" />
            <span>3. Clinical Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const chiefComplaints = getFieldValue('clinicalDetails.chiefComplaints', 'chiefComplaints_primarySymptoms');
            const medicalHistory = getFieldValue('clinicalDetails.medicalHistory', 'patient_medicalHistory');
            const examination = getFieldValue('clinicalDetails.examination', 'examination_localExamination');
            const bloodPressure = getFieldValue('vitals.bloodPressure', 'vitals_bloodPressure');
            const pulse = getFieldValue('vitals.pulse', 'vitals_pulseRate');
            const temperature = getFieldValue('vitals.temperature', 'vitals_temperature');
            const spO2 = getFieldValue('vitals.spO2', 'vitals_spO2');
            const weight = getFieldValue('vitals.weight', 'vitals_weight');
            const height = getFieldValue('vitals.height', 'vitals_height');
            const bmi = getFieldValue('vitals.bmi', 'vitals_bmi');
            
            return (
              <>
                <div>
                  <h4 className="font-semibold text-purple-600 mb-2">Chief Complaints (C/O):</h4>
                  <div className="pl-4 text-sm bg-muted p-3 rounded">
                    {chiefComplaints || "[Chief complaints not documented]"}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-purple-600 mb-2">History / Medical History (M/H):</h4>
                  <div className="pl-4 text-sm bg-muted p-3 rounded">
                    {medicalHistory || "[Medical history not available]"}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-purple-600 mb-2">On Examination (O/E):</h4>
                  <div className="pl-4 text-sm bg-muted p-3 rounded">
                    {examination || "[Examination findings not documented]"}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-purple-600 mb-2">Vitals:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">BP</p>
                      <p className="text-sm font-medium">{bloodPressure || "[Not recorded]"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Pulse</p>
                      <p className="text-sm font-medium">{pulse || "[Not recorded]"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      <p className="text-sm font-medium">{temperature || "[Not recorded]"}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">SpO₂</p>
                      <p className="text-sm font-medium">{spO2 || "[Not recorded]"}</p>
                    </div>
                    {(weight || height || bmi) && (
                      <>
                        {weight && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Weight</p>
                            <p className="text-sm font-medium">{weight}</p>
                          </div>
                        )}
                        {height && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Height</p>
                            <p className="text-sm font-medium">{height}</p>
                          </div>
                        )}
                        {bmi && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">BMI</p>
                            <p className="text-sm font-medium">{bmi}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* 4. Prescription (Rx) */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-700">
            <Pill className="w-5 h-5" />
            <span>4. Prescription (Rx)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {medications.length > 0 ? (
            <div className="space-y-3">
              {medications.map((med: any, index: number) => (
                <div key={index} className="bg-red-50 p-4 rounded-lg">
                  <div className="font-medium text-red-800 mb-2">
                    {med.formulation && med.formulation !== "Not recorded" ? `${med.formulation} ` : ""}
                    {med.drugName}
                    {med.strength && med.strength !== "Not recorded" ? ` ${med.strength}` : ""}
                  </div>
                  <div className="text-sm text-red-600 space-y-1">
                    {med.frequency && (
                      <div>
                        <span className="font-medium">Frequency: </span>
                        {med.frequency}
                        {med.route && ` (${med.route})`}
                      </div>
                    )}
                    {med.duration && (
                      <div>
                        <span className="font-medium">Duration: </span>
                        {med.duration}
                      </div>
                    )}
                    {(med.specialInstructions || med.instructions) && (
                      <div>
                        <span className="font-medium">Instructions: </span>
                        {med.specialInstructions || med.instructions}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              [No medications documented]
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Advice / Notes */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-700">
            <MessageSquare className="w-5 h-5" />
            <span>5. Advice / Additional Notes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const lifestyleAdvice = getFieldValue('advice.lifestyleAdvice', 'followUp_lifestyleAdvice');
            const investigations = getFieldValue('advice.investigations', 'investigations_others');
            const followUp = getFieldValue('advice.followUpInstructions', 'followUp_reviewDate');
            
            return (
              <>
                <div>
                  <span className="font-medium">Lifestyle Advice: </span>
                  <span>{lifestyleAdvice || "[No lifestyle advice documented]"}</span>
                </div>
                <div>
                  <span className="font-medium">Investigations: </span>
                  <span>{investigations || "[No investigations ordered]"}</span>
                </div>
                <div>
                  <span className="font-medium">Follow-up Instructions: </span>
                  <span>{followUp || "[No follow-up instructions]"}</span>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* 6. Doctor's Details */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-indigo-700">
            <User className="w-5 h-5" />
            <span>6. Doctor's Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const doctorName = getFieldValue('doctorDetails.doctorName', 'doctor_doctorName');
            const signature = getFieldValue('doctorDetails.signature', 'doctor_signature');
            const registrationNo = getFieldValue('doctorDetails.registrationNo', 'doctor_registrationNumber');
            
            return (
              <>
                <div>
                  <span className="font-medium">Doctor's Name: </span>
                  <span>{doctorName || "[Not specified in image]"}</span>
                </div>
                <div>
                  <span className="font-medium">Signature: </span>
                  <span>{signature || "[Not documented]"}</span>
                </div>
                <div>
                  <span className="font-medium">Registration No.: </span>
                  <span>{registrationNo || "[Not specified]"}</span>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* 7. Clinic / Hospital Details */}
      <Card className="border-l-4 border-l-teal-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-teal-700">
            <Building className="w-5 h-5" />
            <span>7. Clinic / Hospital Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const clinicName = getFieldValue('clinicDetails.clinicName', 'doctor_clinicName');
            const hospitalName = getFieldValue('clinicDetails.hospitalName', 'doctor_hospitalName');
            const location = getFieldValue('clinicDetails.location', 'doctor_location');
            const address = getFieldValue('clinicDetails.address', 'doctor_address');
            const contact = getFieldValue('clinicDetails.contactNumbers', 'doctor_contactNumber');
            const email = getFieldValue('clinicDetails.email', 'doctor_email');
            const website = getFieldValue('clinicDetails.website', 'doctor_website');
            
            return (
              <>
                <div>
                  <span className="font-medium">Clinic/Hospital Name: </span>
                  <span>{clinicName || hospitalName || "[Not specified in image]"}</span>
                </div>
                <div>
                  <span className="font-medium">Location: </span>
                  <span>{location || address || "[Not documented]"}</span>
                </div>
                <div>
                  <span className="font-medium">Contact: </span>
                  <span>{contact || "[Not specified]"}</span>
                </div>
                {email && (
                  <div>
                    <span className="font-medium">Email: </span>
                    <span>{email}</span>
                  </div>
                )}
                {website && (
                  <div>
                    <span className="font-medium">Website: </span>
                    <span>{website}</span>
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* 8. AI-Generated Summary */}
      <Card className="border-l-4 border-l-gray-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-700">
            <Brain className="w-5 h-5" />
            <span>8. 🔎 AI-Generated Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
            {(() => {
              const diagnosis = getFieldValue('clinicalDetails.diagnosis', 'patient_diagnosis');
              const allergies = getFieldValue('patientDetails.allergies', 'patient_allergies');
              const chiefComplaints = getFieldValue('clinicalDetails.chiefComplaints', 'chiefComplaints_primarySymptoms');
              const medications = getMedications();
              const patientName = getFieldValue('patientDetails.patientName', 'patient_patientName');
              const age = getFieldValue('patientDetails.age', 'patient_age');
              const prescriptionType = getFieldValue('prescriptionType.type', 'prescriptionType') || "General Medicine";
              
              if (!diagnosis && medications.length === 0 && !chiefComplaints) {
                return "No significant medical information was extracted from this prescription image. Please ensure the image is clear and contains readable prescription details.";
              }
              
              let summary = "📋 ";
              
              if (patientName && age) {
                summary += `Patient ${patientName} (${age} years) `;
              } else if (patientName) {
                summary += `Patient ${patientName} `;
              } else {
                summary += "The patient ";
              }
              
              if (diagnosis) {
                summary += `has been diagnosed with ${diagnosis.toLowerCase()}. `;
              } else if (chiefComplaints) {
                summary += `presents with complaints of ${chiefComplaints.toLowerCase()}. `;
              }
              
              if (allergies && allergies !== "No known allergies") {
                summary += `⚠️ Known allergies: ${allergies}. `;
              }
              
              if (medications.length > 0) {
                const medNames = medications.map((m: any) => m.drugName).join(", ");
                summary += `💊 Prescribed medications: ${medNames}. `;
              }
              
              summary += `This is a ${prescriptionType.toLowerCase()} prescription. `;
              summary += "⚠️ Please ensure proper medication adherence and follow-up as advised by the healthcare provider.";
              
              return summary;
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}