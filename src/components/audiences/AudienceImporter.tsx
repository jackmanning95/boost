import React, { useRef, useState } from 'react';
import { importExcelAudiences } from '../../lib/excelImporter';
import { AudienceSegment } from '../../types';
import Button from '../ui/Button';
import { FileUp, Loader } from 'lucide-react';

interface AudienceImporterProps {
  onImport: (audiences: AudienceSegment[]) => void;
}

const AudienceImporter: React.FC<AudienceImporterProps> = ({ onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const audiences = await importExcelAudiences(file);
      onImport(audiences);
    } catch (error) {
      console.error('Import failed:', error);
      alert(error instanceof Error ? error.message : 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        icon={isImporting ? <Loader className="animate-spin" size={16} /> : <FileUp size={16} />}
        disabled={isImporting}
      >
        {isImporting ? 'Importing...' : 'Import Excel'}
      </Button>
    </div>
  );
};

export default AudienceImporter;