import { read, utils } from 'xlsx';
import { AudienceSegment } from '../types';

const CHUNK_SIZE = 50; // Reduced chunk size for smoother processing

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
  // Ensure all required fields are present
  const segmentName = row['Segment Name'] || `Segment ${index + 1}`;
  const dataSupplier = row['Data Supplier'] || 'Unknown';
  const [category = 'Other', subcategory = 'General'] = dataSupplier.split('/').map(s => s.trim());

  return {
    id: `audience-${Date.now()}-${index}`, // Ensure unique IDs
    name: segmentName,
    description: row['Segment Description'] || '',
    category: category,
    subcategory: subcategory,
    dataSupplier: dataSupplier,
    tags: extractTags(row['Segment Description'] || ''),
    reach: parseInt(row['Estimated Volumes']) || undefined,
    cpm: parseFloat(row['Boost CPM']) || undefined
  };
}

export async function importExcelAudiences(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AudienceSegment[]> {
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
        let lastProgressUpdate = Date.now();
        
        // Process data in chunks with progress updates
        for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
          const chunk = jsonData.slice(i, i + CHUNK_SIZE);
          
          // Process each row in the chunk
          const chunkAudiences = chunk.map((row, index) => 
            mapExcelRowToAudience(row, i + index)
          );
          
          audiences.push(...chunkAudiences);
          
          // Update progress at most every 100ms
          const now = Date.now();
          if (now - lastProgressUpdate >= 100) {
            const progress = Math.min(100, Math.round((i + CHUNK_SIZE) / jsonData.length * 100));
            onProgress?.(progress);
            lastProgressUpdate = now;
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        console.log(`Successfully imported ${audiences.length} audiences`);
        onProgress?.(100);
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