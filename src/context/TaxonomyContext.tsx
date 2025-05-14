import React, { createContext, useContext, useState, useEffect } from 'react';
import { AudienceSegment } from '../types';
import { mockAudiences } from '../lib/mockData';

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
}

const TaxonomyContext = createContext<TaxonomyContextType | undefined>(undefined);

export const TaxonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAudiences = async () => {
    console.log('Fetching mock audiences...');
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Mock audiences loaded:', mockAudiences);
      setAudiences(mockAudiences);
      setError(null);
    } catch (err) {
      console.error('Error loading mock audiences:', err);
      setError(err instanceof Error ? err : new Error('Failed to load audiences'));
      setAudiences([]);
    } finally {
      setLoading(false);
      console.log('Mock data fetch complete');
    }
  };

  useEffect(() => {
    console.log('TaxonomyProvider mounted');
    fetchAudiences();
  }, []);

  const searchAudiences = (query: string): AudienceSegment[] => {
    console.log('Searching audiences with query:', query);
    console.log('Current audiences:', audiences);

    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return audiences;
    }

    const results = audiences.filter((audience) => {
      const searchableText = [
        audience.name,
        audience.description,
        audience.category,
        audience.subcategory,
        ...audience.tags
      ].join(' ').toLowerCase();

      return searchableText.includes(lowerQuery);
    });

    console.log('Search results:', results);
    return results;
  };

  const getAudiencesByCategory = (category: string): AudienceSegment[] => {
    const lowerCategory = category.toLowerCase();
    return audiences.filter(audience => 
      audience.category.toLowerCase() === lowerCategory ||
      audience.subcategory.toLowerCase() === lowerCategory
    );
  };

  const getAudienceById = (id: string): AudienceSegment | undefined => {
    return audiences.find(audience => audience.id === id);
  };

  const addAudience = (audience: Omit<AudienceSegment, 'id'>) => {
    const newAudience = {
      ...audience,
      id: `audience-${Date.now()}`
    };
    setAudiences(prev => [...prev, newAudience]);
  };

  const getRecommendedAudiences = (baseAudiences: AudienceSegment[], count = 3): AudienceSegment[] => {
    if (baseAudiences.length === 0) return [];
    
    const selectedIds = new Set(baseAudiences.map(a => a.id));
    const selectedCategories = new Set(baseAudiences.map(a => a.category));
    const selectedTags = new Set(baseAudiences.flatMap(a => a.tags));
    
    const candidates = audiences.filter(audience => !selectedIds.has(audience.id));
    
    const scoredCandidates = candidates.map(audience => {
      let score = 0;
      
      if (selectedCategories.has(audience.category)) score += 3;
      if (baseAudiences.some(a => a.subcategory === audience.subcategory)) score += 2;
      score += audience.tags.filter(tag => selectedTags.has(tag)).length * 2;
      
      return { audience, score };
    });
    
    return scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(({ audience }) => audience);
  };

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
      refreshAudiences: fetchAudiences
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