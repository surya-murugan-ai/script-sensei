import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Eye, RotateCcw, X, BarChart3, ChevronDown, ChevronUp, Brain, Clock, Target, Trash2, ArrowLeft, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedComparisons, setExpandedComparisons] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<Set<string>>(new Set());
  
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['/api/prescriptions'],
    select: (data) => (Array.isArray(data) ? data : []),
  });

  // Get extraction results for model comparison
  const { data: allExtractionResults } = useQuery({
    queryKey: ['/api/extraction-results'],
    select: (data) => (Array.isArray(data) ? data : []),
  });

  // Get configuration to check which models were selected
  const { data: configs } = useQuery({
    queryKey: ['/api/configs'],
    select: (data) => data || [],
  });

  const handleViewResults = (id: string) => {
    // Navigate to home page with prescription ID in state, so results component can show this specific prescription
    setLocation("/?prescriptionId=" + id);
  };

  const handleReprocess = async (id: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${id}/reprocess`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to reprocess prescription');
      
      // Invalidate and refetch prescriptions
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      
      toast({
        title: "Reprocessing started",
        description: "The prescription has been queued for reprocessing with enhanced AI extraction",
      });
    } catch (error) {
      toast({
        title: "Reprocess failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${id}`, {
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

  const handleDelete = async (id: string, isCompleted: boolean = false) => {
    try {
      const url = isCompleted 
        ? `/api/prescriptions/${id}?force=true` 
        : `/api/prescriptions/${id}`;
        
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete prescription');
      }
      
      // Invalidate and refetch prescriptions
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/extraction-results'] });
      
      toast({
        title: "Prescription deleted",
        description: "The prescription and all associated data have been permanently removed",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSelectionChange = (prescriptionId: string, checked: boolean) => {
    const newSelected = new Set(selectedPrescriptions);
    if (checked) {
      newSelected.add(prescriptionId);
    } else {
      newSelected.delete(prescriptionId);
    }
    setSelectedPrescriptions(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedPrescriptions.size === 0) return;
    
    try {
      // Delete all selected prescriptions with force=true for completed ones
      const deletePromises = Array.from(selectedPrescriptions).map(async (id) => {
        const response = await fetch(`/api/prescriptions/${id}?force=true`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete prescription ${id}`);
        }
      });
      
      await Promise.all(deletePromises);
      
      // Clear selection and refresh data
      setSelectedPrescriptions(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/extraction-results'] });
      
      toast({
        title: "Prescriptions deleted",
        description: `${selectedPrescriptions.size} prescriptions have been permanently removed`,
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete selected prescriptions",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (!prescriptions) return;
    
    if (selectedPrescriptions.size === prescriptions.length) {
      // Deselect all
      setSelectedPrescriptions(new Set());
    } else {
      // Select all
      setSelectedPrescriptions(new Set(prescriptions.map((p: any) => p.id)));
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      let url;
      let filename;
      
      if (selectedPrescriptions.size === 0) {
        // Export all
        url = `/api/export/${format}`;
        filename = `prescriptions_all.${format}`;
      } else {
        // Export selected
        const ids = Array.from(selectedPrescriptions).join(',');
        url = `/api/export/${format}?prescriptionIds=${encodeURIComponent(ids)}`;
        filename = `prescriptions_selected.${format}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: `Downloaded ${selectedPrescriptions.size > 0 ? selectedPrescriptions.size : 'all'} prescription${selectedPrescriptions.size === 1 ? '' : 's'} as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'queued':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleComparison = (prescriptionId: string) => {
    const newExpanded = new Set(expandedComparisons);
    if (newExpanded.has(prescriptionId)) {
      newExpanded.delete(prescriptionId);
    } else {
      newExpanded.add(prescriptionId);
    }
    setExpandedComparisons(newExpanded);
  };

  const toggleAllFields = (prescriptionId: string, modelName: string) => {
    const key = `${prescriptionId}-${modelName}`;
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedFields(newExpanded);
  };

  const getModelResults = (prescriptionId: string) => {
    if (!allExtractionResults) return {};
    
    const prescriptionResults = allExtractionResults.filter(
      (result: any) => result.prescriptionId === prescriptionId
    );
    
    // Group by model name with proper normalization
    const modelGroups: Record<string, any[]> = {};
    prescriptionResults.forEach((result: any) => {
      let modelKey = 'unknown';
      const modelName = (result.modelName || '').toLowerCase();
      
      // Normalize model names to canonical keys
      if (modelName.includes('gpt') || modelName.includes('openai')) {
        modelKey = 'openai';
      } else if (modelName.includes('claude')) {
        modelKey = 'claude';
      } else if (modelName.includes('gemini') || modelName.includes('google')) {
        modelKey = 'gemini';
      } else if (modelName) {
        modelKey = modelName;
      }
      
      if (!modelGroups[modelKey]) {
        modelGroups[modelKey] = [];
      }
      modelGroups[modelKey].push(result);
    });
    
    return modelGroups;
  };

  const getModelStats = (modelResults: any[]) => {
    if (!modelResults || modelResults.length === 0) return { count: 0, avgConfidence: 0, timeValue: 0, timeUnit: 'ms' };
    
    const validResults = modelResults.filter(r => r.extractedValue && r.extractedValue !== "NA");
    const avgConfidence = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / validResults.length 
      : 0;
    
    // Get unique processing time (first result or max to avoid summing per-field times)
    const processingTimes = modelResults.map(r => r.processingTime || 0).filter(t => t > 0);
    const totalTimeMs = processingTimes.length > 0 ? Math.max(...processingTimes) : 0;
    
    // Convert to appropriate unit
    const timeValue = totalTimeMs > 1000 ? Math.round(totalTimeMs / 1000 * 10) / 10 : Math.round(totalTimeMs);
    const timeUnit = totalTimeMs > 1000 ? 's' : 'ms';
    
    return {
      count: validResults.length,
      avgConfidence: Math.round(avgConfidence * 10000) / 100, // Format as percentage
      timeValue,
      timeUnit
    };
  };

  const getModelColor = (modelName: string) => {
    switch (modelName?.toLowerCase()) {
      case 'openai':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'claude':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'gemini':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-background">
        <div className="flex-1 p-6">
          <div className="text-center py-8">Loading prescription history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6" data-testid="history-header">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-back-home">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Processing History</h1>
                <p className="text-muted-foreground">View and manage your prescription processing history</p>
              </div>
            </div>
            
            {prescriptions && prescriptions.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  data-testid="button-select-all"
                >
                  <Checkbox 
                    checked={selectedPrescriptions.size === prescriptions.length && prescriptions.length > 0}
                    className="mr-2"
                    disabled
                  />
                  {selectedPrescriptions.size === prescriptions.length ? 'Deselect All' : 'Select All'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  disabled={prescriptions.length === 0}
                  data-testid="button-export-csv"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  disabled={prescriptions.length === 0}
                  data-testid="button-export-json"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={selectedPrescriptions.size === 0}
                  data-testid="button-delete-selected"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedPrescriptions.size})
                </Button>
                
                {selectedPrescriptions.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedPrescriptions.size} selected
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        <Card data-testid="history-card">
          <CardHeader>
            <CardTitle>Prescription Processing History</CardTitle>
          </CardHeader>
          <CardContent>
            {!prescriptions || prescriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-history">
                No prescriptions processed yet. Upload some prescription images to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((prescription: any) => {
                  const modelResults = getModelResults(prescription.id);
                  const hasModelResults = Object.keys(modelResults).length > 0;
                  const isExpanded = expandedComparisons.has(prescription.id);
                  
                  return (
                    <div key={prescription.id} className="border rounded-lg bg-card">
                      {/* Main prescription row */}
                      <div
                        className="flex items-center justify-between p-4"
                        data-testid={`history-item-${prescription.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <Checkbox
                              checked={selectedPrescriptions.has(prescription.id)}
                              onCheckedChange={(checked) => handleSelectionChange(prescription.id, Boolean(checked))}
                              data-testid={`checkbox-${prescription.id}`}
                            />
                            <div>
                              <h3 className="font-medium text-foreground" data-testid={`history-filename-${prescription.id}`}>
                                {prescription.fileName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Uploaded: {formatDate(prescription.uploadedAt)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Size: {prescription.fileSize}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <span 
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.processingStatus)}`}
                            data-testid={`history-status-${prescription.id}`}
                          >
                            {prescription.processingStatus.charAt(0).toUpperCase() + prescription.processingStatus.slice(1)}
                          </span>
                          
                          <div className="flex space-x-2">
                            {prescription.processingStatus === 'completed' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewResults(prescription.id)}
                                  data-testid={`button-view-${prescription.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Results
                                </Button>
                                
                                {hasModelResults && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleComparison(prescription.id)}
                                    data-testid={`button-compare-${prescription.id}`}
                                  >
                                    <BarChart3 className="w-4 h-4 mr-1" />
                                    Compare Models
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 ml-1" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 ml-1" />
                                    )}
                                  </Button>
                                )}
                              </>
                            )}
                            
                            {prescription.processingStatus === 'queued' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                                onClick={() => handleCancel(prescription.id)}
                                data-testid={`button-cancel-${prescription.id}`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                            
                            {(prescription.processingStatus === 'failed' || prescription.processingStatus === 'completed') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReprocess(prescription.id)}
                                  data-testid={`button-reprocess-${prescription.id}`}
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  Reprocess
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive/80"
                                      data-testid={`button-delete-${prescription.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Prescription</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to permanently delete "{prescription.fileName}"? 
                                        {prescription.processingStatus === 'completed' && (
                                          <span className="block mt-2 font-medium text-yellow-600">
                                            ⚠️ This will permanently delete all extracted data and AI analysis results.
                                          </span>
                                        )}
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel data-testid={`button-cancel-delete-${prescription.id}`}>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(prescription.id, prescription.processingStatus === 'completed')}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        data-testid={`button-confirm-delete-${prescription.id}`}
                                      >
                                        Delete Permanently
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Model Comparison Section */}
                      {hasModelResults && isExpanded && (
                        <div className="border-t border-border p-4 bg-muted/30">
                          <div className="mb-4">
                            <h4 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                              <Brain className="w-5 h-5 mr-2" />
                              AI Model Comparison
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Compare how each AI model performed on this prescription
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['openai', 'claude', 'gemini'].map((expectedModel) => {
                              const results = modelResults[expectedModel] || [];
                              const stats = getModelStats(results);
                              const hasResults = results.length > 0;
                              
                              // Check if this model was selected in the configuration
                              const defaultConfig = configs?.find((c: any) => c.isDefault) || configs?.[0];
                              const selectedModels = defaultConfig?.selectedModels || ['openai', 'claude', 'gemini'];
                              const wasModelSelected = selectedModels.includes(expectedModel);
                              
                              return (
                                <Card key={expectedModel} className="relative" data-testid={`model-card-${expectedModel}`}>
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-base font-medium flex items-center">
                                        <Brain className="w-4 h-4 mr-2" />
                                        {expectedModel.toUpperCase()}
                                      </CardTitle>
                                      <Badge 
                                        variant="secondary" 
                                        className={`${getModelColor(expectedModel)} ${!hasResults ? 'opacity-50' : ''}`}
                                        data-testid={`model-${expectedModel}-badge`}
                                      >
                                        {hasResults ? `${stats.count} fields` : (!wasModelSelected ? 'Not Selected' : 'Failed')}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    {hasResults ? (
                                      <>
                                        {/* Performance metrics */}
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          <div className="flex items-center">
                                            <Target className="w-3 h-3 mr-1 text-muted-foreground" />
                                            <span className="text-muted-foreground">Confidence:</span>
                                          </div>
                                          <span className="font-medium">{stats.avgConfidence}%</span>
                                          
                                          <div className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1 text-muted-foreground" />
                                            <span className="text-muted-foreground">Time:</span>
                                          </div>
                                          <span className="font-medium">
                                            {stats.timeValue}{stats.timeUnit}
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-center py-4">
                                        {!wasModelSelected ? (
                                          <>
                                            <div className="text-muted-foreground text-sm font-medium mb-2">
                                              Model Not Selected
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              This model was not selected in the configuration
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="text-destructive text-sm font-medium mb-2">
                                              Extraction Failed
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {expectedModel === 'gemini' 
                                                ? 'API temporarily unavailable (503)' 
                                                : 'Processing error occurred'}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}

                                    {/* Key extracted fields preview */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                          Detailed Extractions
                                        </h5>
                                        {(() => {
                                          const validResults = results.filter((r: any) => r.extractedValue && r.extractedValue !== "NA");
                                          const isFieldsExpanded = expandedFields.has(`${prescription.id}-${expectedModel}`);
                                          return validResults.length > 15 && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 px-2 text-xs"
                                              onClick={() => toggleAllFields(prescription.id, expectedModel)}
                                              data-testid={`button-view-all-${expectedModel}`}
                                            >
                                              {isFieldsExpanded ? 'Show Less' : `View All ${validResults.length}`}
                                            </Button>
                                          );
                                        })()}
                                      </div>
                                      <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {(() => {
                                          const validResults = results.filter((r: any) => r.extractedValue && r.extractedValue !== "NA");
                                          const isFieldsExpanded = expandedFields.has(`${prescription.id}-${expectedModel}`);
                                          
                                          if (validResults.length === 0) {
                                            return (
                                              <div className="text-xs text-muted-foreground italic text-center py-2">
                                                No valid extractions
                                              </div>
                                            );
                                          }
                                          
                                          const displayResults = isFieldsExpanded ? validResults : validResults.slice(0, 15);
                                          
                                          return (
                                            <>
                                              {displayResults.map((result: any, idx: number) => (
                                                <div key={idx} className="text-xs border-b border-border pb-1 mb-1 last:border-b-0" data-testid={`model-${expectedModel}-extraction-${idx}`}>
                                                  <span className="text-muted-foreground font-medium">
                                                    {String(result.fieldName || 'unknown_field').replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}:
                                                  </span>
                                                  <span className="ml-1 text-foreground block">
                                                    {result.extractedValue.length > 50 
                                                      ? `${result.extractedValue.substring(0, 50)}...`
                                                      : result.extractedValue}
                                                  </span>
                                                  <div className="mt-1">
                                                    <span className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-0.5 rounded">
                                                      {Math.round((result.confidence || 0) * 100)}% confidence
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                              {!isFieldsExpanded && validResults.length > 15 && (
                                                <div className="text-xs text-muted-foreground italic text-center py-1">
                                                  +{validResults.length - 15} more fields... 
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}