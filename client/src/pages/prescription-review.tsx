import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import PrescriptionFormatDisplay from "@/components/PrescriptionFormatDisplay";

export default function PrescriptionReview() {
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>("");

  // Get all prescriptions
  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['/api/prescriptions'],
    select: (data) => (data as any[]) || [],
  });

  // Get selected prescription details
  const { data: prescriptionData, isLoading: prescriptionLoading } = useQuery({
    queryKey: ['/api/prescriptions', selectedPrescriptionId],
    queryFn: async () => {
      if (!selectedPrescriptionId) return null;
      const response = await fetch(`/api/prescriptions/${selectedPrescriptionId}`, {
        headers: {
          "X-API-Key": import.meta.env.VITE_EXTERNAL_API_KEY || "",
        }
      });
      return response.json();
    },
    enabled: !!selectedPrescriptionId,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen flex bg-background" data-testid="prescription-review-page">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4" data-testid="header-main">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Prescription Review</h2>
              <p className="text-sm text-muted-foreground">View original prescriptions alongside AI extractions</p>
            </div>
            <Button variant="outline" data-testid="button-refresh">
              <Eye className="w-4 h-4 mr-2" />
              Side-by-Side View
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Prescription Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Prescription
            </label>
            <Select
              value={selectedPrescriptionId}
              onValueChange={setSelectedPrescriptionId}
              data-testid="select-prescription"
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a prescription to review..." />
              </SelectTrigger>
              <SelectContent>
                {prescriptionsLoading ? (
                  <SelectItem value="loading" disabled>Loading prescriptions...</SelectItem>
                ) : !prescriptions || prescriptions.length === 0 ? (
                  <SelectItem value="empty" disabled>No prescriptions available</SelectItem>
                ) : (
                  prescriptions.map((prescription: any) => (
                    <SelectItem
                      key={prescription.id}
                      value={prescription.id}
                      data-testid={`select-option-${prescription.id}`}
                    >
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(prescription.processingStatus)}
                        <span className="truncate">
                          {prescription.fileName || `Prescription ${prescription.id.slice(0, 8)}`}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getStatusColor(prescription.processingStatus)}`}
                        >
                          {prescription.processingStatus || 'unknown'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Side-by-Side View */}
          {selectedPrescriptionId && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
              {/* Original Prescription Image */}
              <Card className="flex flex-col" data-testid="card-original-image">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Original Prescription
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center p-4">
                  {prescriptionLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2 text-muted-foreground">Loading image...</span>
                    </div>
                  ) : prescriptionData && (prescriptionData as any).prescription ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={`/api/prescriptions/${selectedPrescriptionId}/image`}
                        alt="Original Prescription"
                        className="max-w-full max-h-full object-contain rounded-lg border border-border shadow-sm"
                        data-testid="img-original-prescription"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <FileText className="w-12 h-12 mb-2" />
                      <p>No image available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Extracted Data */}
              <Card className="flex flex-col" data-testid="card-extracted-data">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    AI Extracted Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4">
                  {prescriptionLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-2 text-muted-foreground">Loading extraction...</span>
                    </div>
                  ) : prescriptionData && (prescriptionData as any).prescription?.extractedData ? (
                    <div className="space-y-4">
                      <PrescriptionFormatDisplay
                        prescriptionId={selectedPrescriptionId}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <Eye className="w-12 h-12 mb-2" />
                      <p className="text-center">
                        {prescriptionData && (prescriptionData as any).prescription?.processingStatus === 'completed'
                          ? 'No extraction data available'
                          : 'Prescription not yet processed'
                        }
                      </p>
                      {prescriptionData && (prescriptionData as any).prescription?.processingStatus !== 'completed' && (
                        <p className="text-sm mt-1">
                          Status: {(prescriptionData as any).prescription?.processingStatus || 'unknown'}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Placeholder when no prescription selected */}
          {!selectedPrescriptionId && (
            <Card className="h-[calc(100vh-200px)]" data-testid="card-placeholder">
              <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="w-16 h-16 mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Prescription</h3>
                <p className="text-center max-w-md">
                  Choose a prescription from the dropdown above to view the original image
                  alongside the AI-extracted medical data.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}