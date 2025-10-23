import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2, Clock, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface QueueItem {
  id: string;
  fileName: string;
  status: 'completed' | 'processing' | 'queued' | 'failed';
  progress: number;
  modelsProcessed?: number;
  totalModels?: number;
  queuePosition?: number;
}


export default function ProcessingQueue() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: prescriptions } = useQuery({
    queryKey: ['/api/prescriptions'],
    select: (data) => data || [],
    refetchInterval: (data) => {
      // Smart polling: more frequent for few images, less frequent for many images
      const hasProcessing = Array.isArray(data) && data.some((p: any) => p.processingStatus === 'processing' || p.processingStatus === 'queued');
      if (!hasProcessing) return false;
      
      // Dynamic polling based on number of processing items
      const processingCount = data.filter((p: any) => p.processingStatus === 'processing' || p.processingStatus === 'queued').length;
      
      if (processingCount <= 3) return 1000; // Fast polling for few images
      if (processingCount <= 10) return 3000; // Medium polling for moderate images
      return 5000; // Slower polling for many images
    },
  });

  const { data: configs } = useQuery({
    queryKey: ['/api/configs'],
    select: (data) => data || [],
  });

  // Get extraction results for all prescriptions to calculate progress
  const { data: allExtractionResults } = useQuery({
    queryKey: ['/api/extraction-results'],
    queryFn: async () => {
      const response = await fetch('/api/extraction-results');
      return response.json();
    },
    select: (data) => data || [],
    refetchInterval: (data) => {
      // Poll every 2 seconds if there are any processing prescriptions
      const hasProcessing = Array.isArray(prescriptions) && prescriptions.some((p: any) => p.processingStatus === 'processing' || p.processingStatus === 'queued');
      return hasProcessing ? 2000 : false;
    },
  });

  // Transform real prescription data into queue items
  const queueItems: QueueItem[] = Array.isArray(prescriptions) ? prescriptions.map((prescription: any) => {
    // Get default config to determine total models
    const defaultConfig = Array.isArray(configs) ? configs.find((c: any) => c.isDefault) : null;
    const selectedModels = defaultConfig?.selectedModels || ['openai', 'claude', 'gemini'];
    const totalModels = selectedModels.length;
    
    // Count unique models that have processed this prescription
    const prescriptionResults = Array.isArray(allExtractionResults) ? allExtractionResults.filter((result: any) => result.prescriptionId === prescription.id) : [];
    const uniqueModels = new Set(prescriptionResults.map((result: any) => result.modelName));
    const modelsProcessed = uniqueModels.size;
    
    // Calculate progress
    let progress = 0;
    let status: 'completed' | 'processing' | 'queued' | 'failed' = prescription.processingStatus;
    
    if (status === 'completed') {
      progress = 100;
    } else if (status === 'processing') {
      progress = Math.round((modelsProcessed / totalModels) * 100);
    } else if (status === 'failed') {
      progress = Math.round((modelsProcessed / totalModels) * 100);
    }
    
    // Calculate queue position for queued items
    let queuePosition = undefined;
    if (status === 'queued' && Array.isArray(prescriptions)) {
      const queuedPrescriptions = prescriptions
        .filter((p: any) => p.processingStatus === 'queued')
        .sort((a: any, b: any) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
      queuePosition = queuedPrescriptions.findIndex((p: any) => p.id === prescription.id) + 1;
    }
    
    return {
      id: prescription.id,
      fileName: prescription.fileName,
      status,
      progress,
      modelsProcessed,
      totalModels,
      queuePosition,
    };
  }) : [];

  const handleViewResults = (prescriptionId: string) => {
    setLocation(`/?prescriptionId=${prescriptionId}`);
  };

  const handleCancel = async (prescriptionId: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to cancel prescription');
      
      // Invalidate and refetch prescriptions
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      
      toast({
        title: "Prescription cancelled",
        description: "The prescription has been removed from the queue",
      });
    } catch (error) {
      toast({
        title: "Cancel failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRetry = async (prescriptionId: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}/retry`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to retry prescription');
      
      // Invalidate and refetch prescriptions
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      
      toast({
        title: "Prescription retry started",
        description: "The prescription has been queued for reprocessing",
      });
    } catch (error) {
      toast({
        title: "Retry failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-white" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-white animate-spin" />;
      case 'queued':
        return <Clock className="w-4 h-4 text-white" />;
      case 'failed':
        return <X className="w-4 h-4 text-white" />;
      default:
        return <Clock className="w-4 h-4 text-white" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'processing':
        return 'bg-blue-600';
      case 'queued':
        return 'bg-gray-400';
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusBackground = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'queued':
        return 'bg-muted border-border';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-muted border-border';
    }
  };

  const getStatusText = (item: QueueItem) => {
    switch (item.status) {
      case 'completed':
        return `Completed • ${item.modelsProcessed} models processed`;
      case 'processing':
        return `Processing • ${item.modelsProcessed}/${item.totalModels} models`;
      case 'queued':
        return `Queued • Position ${item.queuePosition} in queue`;
      case 'failed':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  const getActionButton = (item: QueueItem) => {
    switch (item.status) {
      case 'completed':
        return (
          <Button variant="ghost" size="sm" onClick={() => handleViewResults(item.id)} data-testid={`button-view-results-${item.id}`}>
            View Results
          </Button>
        );
      case 'queued':
        return (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => handleCancel(item.id)} data-testid={`button-cancel-${item.id}`}>
            Cancel
          </Button>
        );
      case 'failed':
        return (
          <Button variant="ghost" size="sm" onClick={() => handleRetry(item.id)} data-testid={`button-retry-${item.id}`}>
            Retry
          </Button>
        );
      default:
        return null;
    }
  };

  const getProgressText = (item: QueueItem) => {
    if (item.status === 'completed') return '100%';
    if (item.status === 'processing') return `${item.progress}%`;
    if (item.status === 'queued') return 'Waiting...';
    if (item.status === 'failed') return 'Failed';
    return '0%';
  };

  return (
    <Card data-testid="processing-queue-card">
      <CardHeader>
        <CardTitle>Processing Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {queueItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-4 border rounded-lg ${getStatusBackground(item.status)}`}
              data-testid={`queue-item-${item.id}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(item.status)}`}>
                  {getStatusIcon(item.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground" data-testid={`queue-item-filename-${item.id}`}>
                    {item.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`queue-item-status-${item.id}`}>
                    {getStatusText(item)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {item.status === 'processing' && (
                  <div className="w-24">
                    <Progress value={item.progress} className="h-2" />
                  </div>
                )}
                <span className={`text-sm ${
                  item.status === 'completed' ? 'text-green-600' :
                  item.status === 'processing' ? 'text-blue-600' :
                  item.status === 'failed' ? 'text-red-600' :
                  'text-muted-foreground'
                }`} data-testid={`queue-item-progress-${item.id}`}>
                  {getProgressText(item)}
                </span>
                {getActionButton(item)}
              </div>
            </div>
          ))}
          
          {queueItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-queue-message">
              No items in processing queue
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
