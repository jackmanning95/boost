import React, { createContext, useContext, useState, useEffect } from 'react';
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
  setAudiences: React.Dispatch<React.SetStateAction<AudienceSegment[]>>;
}

const TaxonomyContext = createContext<TaxonomyContextType | undefined>(undefined);

const ITEMS_PER_PAGE = 50; // Limit items per page for better performance

export const TaxonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const searchAudiences = (query: string): AudienceSegment[] => {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return audiences.slice(0, ITEMS_PER_PAGE); // Return first page only
    }

    return audiences
      .filter((audience) => {
        const searchableText = [
          audience.name,
          audience.description,
          audience.category,
          audience.subcategory,
          ...audience.tags
        ].join(' ').toLowerCase();

        return searchableText.includes(lowerQuery);
      })
      .slice(0, ITEMS_PER_PAGE); // Limit search results
  };

  const getAudiencesByCategory = (category: string): AudienceSegment[] => {
    const lowerCategory = category.toLowerCase();
    return audiences
      .filter(audience => 
        audience.category.toLowerCase() === lowerCategory ||
        audience.subcategory.toLowerCase() === lowerCategory
      )
      .slice(0, ITEMS_PER_PAGE);
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
  };

  const refreshAudiences = async () => {
    setLoading(true);
    setError(null);
    try {
      // Reset to empty state
      setAudiences([]);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
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
      refreshAudiences,
      setAudiences
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