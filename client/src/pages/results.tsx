import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PrescriptionFormatDisplay from "@/components/PrescriptionFormatDisplay";
import { useQuery } from "@tanstack/react-query";

export default function Results() {
  // Get the latest prescription for display
  const { data: prescriptions } = useQuery({
    queryKey: ['/api/prescriptions'],
    select: (data) => data || [],
  });

  const latestPrescriptionId = Array.isArray(prescriptions) && prescriptions.length > 0 ? prescriptions[0].id : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Extraction Results</h1>
              <p className="text-muted-foreground">
                View and analyze AI-extracted prescription data
              </p>
            </div>
          </div>
        </div>

        {/* Prescription Format Display */}
        <PrescriptionFormatDisplay prescriptionId={latestPrescriptionId} />
      </div>
    </div>
  );
}