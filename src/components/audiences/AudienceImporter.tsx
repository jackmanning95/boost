import React, { useRef, useState } from 'react';
import { importExcelAudiences } from '../../lib/excelImporter';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { useAuth } from '../../context/AuthContext';
import { AudienceSegment } from '../../types';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import { FileUp, Loader, RefreshCw, Plus } from 'lucide-react';

interface AudienceImporterProps {
  onImport: (audiences: AudienceSegment[]) => void;
}

const AudienceImporter: React.FC<AudienceImporterProps> = ({ onImport }) => {
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isRefreshMode, setIsRefreshMode] = useState(true);
  const { updateAudiences, audiences } = useTaxonomy();

  // Only render for admin users
  if (!isAdmin) {
    return null;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const importedAudiences = await importExcelAudiences(file, (progress) => {
        setImportProgress(progress);
        console.log('Import progress:', progress);
      });
      
      console.log('Imported audiences:', importedAudiences.length);
      
      if (isRefreshMode) {
        console.log('Refresh mode - replacing all audiences');
        updateAudiences(importedAudiences);
        onImport(importedAudiences);
      } else {
        console.log('Add mode - merging with existing audiences');
        const existingIds = new Set(audiences.map(a => a.id));
        const newAudiences = importedAudiences.filter(a => !existingIds.has(a.id));
        console.log('New audiences to add:', newAudiences.length);
        const mergedAudiences = [...audiences, ...newAudiences];
        updateAudiences(mergedAudiences);
        onImport(mergedAudiences);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(error instanceof Error ? error.message : 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-white border rounded-md p-1">
          <button
            className={`px-3 py-1 rounded text-sm transition-colors ${
              isRefreshMode 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setIsRefreshMode(true)}
          >
            <RefreshCw size={14} className="inline mr-1" />
            Refresh All
          </button>
          <button
            className={`px-3 py-1 rounded text-sm transition-colors ${
              !isRefreshMode 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setIsRefreshMode(false)}
          >
            <Plus size={14} className="inline mr-1" />
            Add New
          </button>
        </div>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          icon={isImporting ? <Loader className="animate-spin" size={16} /> : <FileUp size={16} />}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import Excel'}
        </Button>
      </div>
      
      {isImporting && (
        <div className="flex items-center gap-2">
          <ProgressBar progress={importProgress} className="flex-1" />
          <span className="text-sm text-gray-600">{importProgress}%</span>
        </div>
      )}
    </div>
  );
};

export default AudienceImporter;