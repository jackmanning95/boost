import React, { createContext, useContext, useState, useCallback } from 'react';
import { AudienceSegment } from '../types';

interface TaxonomyContextType {
  audiences: AudienceSegment[];
  loading: boolean;
  error: Error | null;
  searchAudiences: (query: string) => AudienceSegment[];
  getAudiencesByCategory: (category: string) => AudienceSegment[];
  getAudienceById: (id: string) => AudienceSegment | undefined;
  addAudience: (audience: Omit<AudienceSegment, 'id'>) => void;
  getRecommendedAudiences: (baseAudiences: AudienceSegment[], count?: number) => AudienceSegment[];
  refreshAudiences: () => Promise<void>;
  updateAudiences: (newAudiences: AudienceSegment[]) => void;
}

const TaxonomyContext = createContext<TaxonomyContextType | undefined>(undefined);

const BATCH_SIZE = 50; // Reduced batch size for smoother updates
const SEARCH_LIMIT = 100;

export const TaxonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateAudiences = useCallback((newAudiences: AudienceSegment[]) => {
    setLoading(true);
    console.log('Starting audience update with', newAudiences.length, 'audiences');
    
    // Process audiences in batches
    const processBatch = async (startIndex: number) => {
      if (startIndex >= newAudiences.length) {
        console.log('Finished processing all audiences');
        setLoading(false);
        return;
      }

      const batch = newAudiences.slice(startIndex, startIndex + BATCH_SIZE);
      console.log(`Processing batch ${startIndex / BATCH_SIZE + 1}`, batch.length, 'audiences');
      
      setAudiences(prevAudiences => {
        const updatedAudiences = startIndex === 0 ? [] : prevAudiences;
        return [...updatedAudiences, ...batch];
      });

      // Schedule next batch with a small delay
      await new Promise(resolve => setTimeout(resolve, 50));
      processBatch(startIndex + BATCH_SIZE);
    };

    processBatch(0);
  }, []);

  const searchAudiences = useCallback((query: string): AudienceSegment[] => {
    console.log('Searching audiences with query:', query);
    console.log('Total audiences available:', audiences.length);

    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      const results = audiences.slice(0, SEARCH_LIMIT);
      console.log('Returning first', results.length, 'audiences');
      return results;
    }

    const results = audiences
      .filter((audience) => {
        const searchableText = [
          audience.name,
          audience.description,
          audience.category,
          audience.subcategory,
          audience.dataSupplier,
          ...audience.tags
        ].join(' ').toLowerCase();

        return searchableText.includes(lowerQuery);
      })
      .slice(0, SEARCH_LIMIT);

    console.log('Found', results.length, 'matching audiences');
    return results;
  }, [audiences]);

  const getAudiencesByCategory = useCallback((category: string): AudienceSegment[] => {
    const lowerCategory = category.toLowerCase();
    return audiences
      .filter(audience => 
        audience.category.toLowerCase() === lowerCategory ||
        audience.subcategory.toLowerCase() === lowerCategory
      )
      .slice(0, SEARCH_LIMIT);
  }, [audiences]);

  const getAudienceById = useCallback((id: string): AudienceSegment | undefined => {
    return audiences.find(audience => audience.id === id);
  }, [audiences]);

  const addAudience = useCallback((audience: Omit<AudienceSegment, 'id'>) => {
    const newAudience = {
      ...audience,
      id: `audience-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setAudiences(prev => [...prev, newAudience]);
  }, []);

  const getRecommendedAudiences = useCallback((baseAudiences: AudienceSegment[], count = 3): AudienceSegment[] => {
    if (baseAudiences.length === 0) return [];
    
    const selectedIds = new Set(baseAudiences.map(a => a.id));
    const selectedCategories = new Set(baseAudiences.map(a => a.category));
    const selectedTags = new Set(baseAudiences.flatMap(a => a.tags));
    
    return audiences
      .filter(audience => !selectedIds.has(audience.id))
      .map(audience => {
        let score = 0;
        if (selectedCategories.has(audience.category)) score += 3;
        if (baseAudiences.some(a => a.subcategory === audience.subcategory)) score += 2;
        score += audience.tags.filter(tag => selectedTags.has(tag)).length * 2;
        return { audience, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(({ audience }) => audience);
  }, [audiences]);

  const refreshAudiences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAudiences([]);
      console.log('Audiences refreshed');
    } catch (err) {
      console.error('Error refreshing audiences:', err);
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <TaxonomyContext.Provider value={{
      audiences,
      loading,
      error,
      searchAudiences,
      getAudiencesByCategory,
      getAudienceById,
      addAudience,
      getRecommendedAudiences,
      refreshAudiences,
      updateAudiences
    }}>
      {children}
    </TaxonomyContext.Provider>
  );
};

export function useTaxonomy(): TaxonomyContextType {
  const context = useContext(TaxonomyContext);
  if (!context) {
    throw new Error('useTaxonomy must be used within a TaxonomyProvider');
  }
  return context;
}