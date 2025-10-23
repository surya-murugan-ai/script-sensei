import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudUpload, X, Play, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFileContext, UploadedFile } from "@/contexts/FileContext";

interface FileUploadProps {
  selectedFiles?: File[];
  onFilesSelected?: (files: File[]) => void;
}

// UploadedFile interface is now imported from context

export default function FileUpload({ selectedFiles: propSelectedFiles, onFilesSelected: propOnFilesSelected }: FileUploadProps) {
  const { selectedFiles: contextSelectedFiles, setSelectedFiles: contextSetSelectedFiles, uploadedFiles, setUploadedFiles } = useFileContext();
  
  // Use context values if available, otherwise fall back to props
  const selectedFiles = contextSelectedFiles.length > 0 ? contextSelectedFiles : (propSelectedFiles || []);
  const onFilesSelected = contextSetSelectedFiles || propOnFilesSelected || (() => {});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      // apiRequest returns a Response, we need to handle FormData differently
      const response = await fetch("/api/prescriptions/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = (await response.text()) || response.statusText;
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Files uploaded successfully",
        description: `${data.prescriptions.length} files uploaded and queued for processing`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      status: 'ready' as const
    }));
    setUploadedFiles((prev: UploadedFile[]) => [...prev, ...newFiles]);
    onFilesSelected([...selectedFiles, ...acceptedFiles]);
  }, [selectedFiles, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setUploadedFiles((prev: UploadedFile[]) => prev.filter((_, i) => i !== index));
    onFilesSelected(selectedFiles.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploadedFiles([]);
    onFilesSelected([]);
  };

  const processAll = async () => {
    // First upload the files
    try {
      const files = uploadedFiles.map(f => f.file);
      const uploadResult = await uploadMutation.mutateAsync(files);
      
      // Fetch current configuration for processing
      let selectedModels = ['openai', 'claude', 'gemini'];
      let customPrompts = {};
      
      try {
        const configResponse = await fetch('/api/configs', {
          credentials: 'include'
        });
        if (configResponse.ok) {
          const configs = await configResponse.json();
          const defaultConfig = configs.find((c: any) => c.isDefault) || configs[0];
          selectedModels = defaultConfig?.selectedModels || ['openai', 'claude', 'gemini'];
          customPrompts = defaultConfig?.customPrompts || {};
        }
      } catch (error) {
        console.warn('Failed to fetch config, using defaults:', error);
      }
      
      // Then process each uploaded prescription with AI
      if (uploadResult && uploadResult.prescriptions) {
        // Process all images in parallel for better performance
        const processingPromises = uploadResult.prescriptions.map(async (prescription: any) => {
          // Find the corresponding file for this prescription
          const file = files.find(f => f.name === prescription.fileName);
          if (!file) return;
          
          // Update UI to show processing status
          setUploadedFiles((prev: UploadedFile[]) => 
            prev.map((uf: UploadedFile) => 
              uf.file.name === file.name ? { ...uf, status: 'processing' as const } : uf
            )
          );
          
          // Create FormData for processing
          const formData = new FormData();
          formData.append('file', file);
          formData.append('selectedModels', JSON.stringify(selectedModels));
          formData.append('customPrompts', JSON.stringify(customPrompts));
          
          try {
            // Process with AI models
            const processResponse = await fetch(`/api/prescriptions/${prescription.id}/process`, {
              method: "POST",
              body: formData,
              credentials: "include",
            });

            if (!processResponse.ok) {
              // Update UI to show error status
              setUploadedFiles((prev: UploadedFile[]) => 
                prev.map((uf: UploadedFile) => 
                  uf.file.name === file.name ? { ...uf, status: 'error' as const } : uf
                )
              );
              throw new Error(`Processing failed for ${prescription.fileName}`);
            } else {
            // Update UI to show completed status
            setUploadedFiles((prev: UploadedFile[]) => 
              prev.map((uf: UploadedFile) => 
                uf.file.name === file.name ? { ...uf, status: 'completed' as const } : uf
              )
            );
            
            // 🔥 REFRESH DATA IMMEDIATELY after each image completes
            queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
            queryClient.invalidateQueries({ queryKey: ['/api/extraction-results'] });
            // Force refetch to ensure UI updates immediately
            queryClient.refetchQueries({ queryKey: ['/api/prescriptions'] });
            queryClient.refetchQueries({ queryKey: ['/api/extraction-results'] });
            }
          } catch (error) {
            // Update UI to show error status
            setUploadedFiles((prev: UploadedFile[]) => 
              prev.map((uf: UploadedFile) => 
                uf.file.name === file.name ? { ...uf, status: 'error' as const } : uf
              )
            );
            console.error(`Processing failed for ${prescription.fileName}:`, error);
          }
        });
        
        // Wait for all processing to complete
        await Promise.allSettled(processingPromises);
        
        // Clear uploaded files after successful processing
        setUploadedFiles([]);
        onFilesSelected([]);
        
        toast({
          title: "Processing completed",
          description: `${uploadResult.prescriptions.length} prescriptions processed with AI models`,
        });
      }
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "Failed to process prescriptions with AI models",
        variant: "destructive",
      });
    }
  };

  const totalSize = uploadedFiles.reduce((acc, { file }) => acc + file.size, 0);
  const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  return (
    <Card data-testid="file-upload-card">
      <CardHeader>
        <CardTitle>Upload Prescription Images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drag and Drop Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary hover:bg-primary/5"
          }`}
          data-testid="drop-zone"
        >
          <input {...getInputProps()} data-testid="file-input" />
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <CloudUpload className="text-2xl text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                {isDragActive ? "Drop files here..." : "Drag & drop prescription images here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse your files</p>
            </div>
            <Button type="button" data-testid="button-browse-files">
              Browse Files
            </Button>
            <p className="text-xs text-muted-foreground">Supports JPG, PNG • Max 10MB per file</p>
          </div>
        </div>

        {/* File Preview Area */}
        {uploadedFiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="file-preview-grid">
            {uploadedFiles.map((uploadedFile, index) => (
              <div 
                key={index} 
                className="bg-muted rounded-lg p-4 fade-in"
                data-testid={`file-preview-${index}`}
              >
                <div className="aspect-square bg-white rounded-md mb-3 relative overflow-hidden">
                  <img
                    src={URL.createObjectURL(uploadedFile.file)}
                    alt={`Preview of ${uploadedFile.file.name}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-6 h-6 p-0"
                      onClick={() => removeFile(index)}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  {uploadedFile.status === 'processing' && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="animate-spin">
                        <Play className="text-primary text-2xl" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p 
                    className="text-sm font-medium text-foreground truncate" 
                    title={uploadedFile.file.name}
                    data-testid={`file-name-${index}`}
                  >
                    {uploadedFile.file.name}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground" data-testid={`file-size-${index}`}>
                      {formatFileSize(uploadedFile.file.size)}
                    </span>
                    <span 
                      className={`px-2 py-1 rounded-full ${
                        uploadedFile.status === 'ready' ? 'text-green-600 bg-green-50' :
                        uploadedFile.status === 'processing' ? 'text-blue-600 bg-blue-50' :
                        uploadedFile.status === 'completed' ? 'text-green-600 bg-green-100' :
                        'text-red-600 bg-red-50'
                      }`}
                      data-testid={`file-status-${index}`}
                    >
                      {uploadedFile.status.charAt(0).toUpperCase() + uploadedFile.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Batch Actions */}
        {uploadedFiles.length > 0 && (
          <div className="flex items-center justify-between" data-testid="batch-actions">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={processAll}
                disabled={uploadMutation.isPending}
                data-testid="button-process-all"
              >
                <Play className="w-4 h-4 mr-2" />
                {uploadMutation.isPending ? "Processing..." : "Process All"}
              </Button>
              <Button 
                variant="outline" 
                onClick={clearAll}
                data-testid="button-clear-all"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground" data-testid="file-summary">
              <span data-testid="uploaded-count">{uploadedFiles.length}</span> files ready • {" "}
              <span data-testid="total-size">{formatFileSize(totalSize)}</span> total
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
