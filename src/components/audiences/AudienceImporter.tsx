import React, { useRef } from 'react';
import { importExcelAudiences } from '../../lib/excelImporter';
import Button from '../ui/Button';
import { FileUp } from 'lucide-react';

interface AudienceImporterProps {
  onImport: (audiences: AudienceSegment[]) => void;
}

const AudienceImporter: React.FC<AudienceImporterProps> = ({ onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const audiences = await importExcelAudiences(file);
      onImport(audiences);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import Excel file. Please check the format and try again.');
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
        icon={<FileUp size={16} />}
      >
        Import Excel
      </Button>
    </div>
  );
};

export default AudienceImporter;