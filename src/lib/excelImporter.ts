import { read, utils } from 'xlsx';
import { AudienceSegment } from '../types';

function extractTags(description: string): string[] {
  const stopWords = new Set(['and', 'the', 'with', 'for', 'who', 'are', 'have']);
  return Array.from(new Set(
    description
      .toLowerCase()
      .split(/[,\s]+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5)
  ));
}

export async function importExcelAudiences(file: File): Promise<AudienceSegment[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);
        
        const audiences: AudienceSegment[] = jsonData.map((row: any, index) => ({
          id: `audience-${index + 1}`,
          name: row.name || row.Name || row.segment_name || row.Segment,
          description: row.description || row.Description || '',
          category: row.category || row.Category || 'Other',
          subcategory: row.subcategory || row.Subcategory || row.category || 'General',
          tags: extractTags(row.description || row.Description || ''),
          reach: Number(row.reach || row.Reach || 0) || undefined,
          cpm: Number(row.cpm || row.CPM || 0) || undefined
        }));
        
        console.log('Imported audiences:', audiences);
        resolve(audiences);
      } catch (error) {
        console.error('Error importing Excel file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}