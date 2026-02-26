import { useState } from "react";
import { Link } from "wouter";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";
import PrescriptionFormatDisplay from "@/components/PrescriptionFormatDisplay";
import ProcessingQueue from "@/components/ProcessingQueue";
import { Button } from "@/components/ui/button";
import { Download, HelpCircle, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Get the latest prescription for display
  const { data: prescriptions } = useQuery({
    queryKey: ['/api/prescriptions'],
    select: (data) => data || [],
  });

  const latestPrescriptionId = (prescriptions as any[]) && (prescriptions as any[]).length > 0 ? (prescriptions as any[])[0].id : null;

  const handleExportAll = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/export/${format}`, {
        headers: {
          "X-API-Key": import.meta.env.VITE_EXTERNAL_API_KEY || "",
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescriptions.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Failed to export ${format}:`, error);
    }
  };

  return (
    <div className="min-h-screen flex bg-background" data-testid="home-page">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="bg-card border-b border-border px-6 py-4" data-testid="header-main">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Prescription Extraction</h2>
              <p className="text-sm text-muted-foreground">Upload and analyze handwritten prescriptions with AI</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/results">
                <Button
                  variant="outline"
                  data-testid="button-view-results"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Results
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-help"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
              <Button
                onClick={() => handleExportAll('csv')}
                data-testid="button-export-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 space-y-6 overflow-auto" data-testid="main-content">
          <FileUpload
            selectedFiles={selectedFiles}
            onFilesSelected={setSelectedFiles}
          />

          <PrescriptionFormatDisplay prescriptionId={latestPrescriptionId} />

          <ProcessingQueue />
        </main>
      </div>
    </div>
  );
}
