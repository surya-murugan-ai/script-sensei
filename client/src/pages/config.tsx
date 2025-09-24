import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExtractionConfig from "@/components/ExtractionConfig";

export default function Config() {
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
              <h1 className="text-3xl font-bold text-foreground">Model Configuration</h1>
              <p className="text-muted-foreground">
                Configure AI models and extraction field prompts
              </p>
            </div>
          </div>
        </div>

        {/* Extraction Configuration Component */}
        <ExtractionConfig />
      </div>
    </div>
  );
}