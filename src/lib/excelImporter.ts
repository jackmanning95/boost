import { read, utils } from 'xlsx';
import { AudienceSegment } from '../types';

const CHUNK_SIZE = 1000; // Process 1000 rows at a time

function extractTags(description: string): string[] {
  if (!description) return [];
  const stopWords = new Set(['and', 'the', 'with', 'for', 'who', 'are', 'have']);
  return Array.from(new Set(
    description
      .toLowerCase()
      .split(/[,\s]+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5)
  ));
}

function mapExcelRowToAudience(row: any, index: number): AudienceSegment {
  return {
    id: `audience-${index + 1}`,
    name: row['Segment Name'] || '',
    description: row['Segment Description'] || '',
    category: (row['Data Supplier'] || '').split('/')[0] || 'Other',
    subcategory: (row['Data Supplier'] || '').split('/')[1] || 'General',
    tags: extractTags(row['Segment Description'] || ''),
    reach: Number(row['Estimated Volumes']) || undefined,
    cpm: Number(row['Boost CPM']) || undefined
  };
}

export async function importExcelAudiences(file: File): Promise<AudienceSegment[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        console.log('Starting Excel import...');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);
        
        console.log(`Processing ${jsonData.length} rows...`);
        
        const audiences: AudienceSegment[] = [];
        
        // Process data in chunks
        for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
          const chunk = jsonData.slice(i, i + CHUNK_SIZE);
          const chunkAudiences = chunk.map((row, index) => 
            mapExcelRowToAudience(row, i + index)
          );
          audiences.push(...chunkAudiences);
          
          // Allow UI to update between chunks
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        console.log(`Successfully imported ${audiences.length} audiences`);
        resolve(audiences);
      } catch (error) {
        console.error('Error importing Excel file:', error);
        reject(new Error('Failed to import Excel file. Please check the format and try again.'));
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read the Excel file.'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}