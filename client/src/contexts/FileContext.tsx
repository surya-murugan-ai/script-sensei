import { createContext, useContext, useState, ReactNode } from 'react';

export interface UploadedFile {
  file: File;
  id?: string;
  status: 'ready' | 'processing' | 'completed' | 'error';
  progress?: number;
}

interface FileContextType {
  selectedFiles: File[];
  setSelectedFiles: (files: File[] | ((prev: File[]) => File[])) => void;
  uploadedFiles: UploadedFile[];
  setUploadedFiles: (files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  return (
    <FileContext.Provider value={{
      selectedFiles,
      setSelectedFiles,
      uploadedFiles,
      setUploadedFiles,
    }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFileContext() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
}
