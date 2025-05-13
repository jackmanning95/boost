import React, { createContext, useContext, useState, useEffect } from 'react';
import { AudienceSegment } from '../types';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type BoostTaxo = Database['public']['Tables']['boost_taxo']['Row'];

interface TaxonomyContextType {
  audiences: AudienceSegment[];
  loading: boolean;
  searchAudiences: (query: string) => AudienceSegment[];
  getAudiencesByCategory: (category: string) => AudienceSegment[];
  getAudienceById: (id: string) => AudienceSegment | undefined;
  addAudience: (audience: Omit<AudienceSegment, 'id'>) => void;
  getRecommendedAudiences: (baseAudiences: AudienceSegment[], count?: number) => AudienceSegment[];
}

const TaxonomyContext = createContext<TaxonomyContextType | undefined>(undefined);

function extractTags(description: string | null): string[] {
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

function extractCategoryInfo(dataSupplier: string | null): [string, string] {
  if (!dataSupplier) return ['Other', 'General'];
  
  const parts = dataSupplier.split('/').map(part => part.trim());
  const mainCategory = parts[0] || 'Other';
  const subCategory = parts[1] || mainCategory;
  
  return [
    mainCategory.charAt(0).toUpperCase() + mainCategory.slice(1),
    subCategory.charAt(0).toUpperCase() + subCategory.slice(1)
  ];
}

function transformBoostTaxoToAudience(row: BoostTaxo): AudienceSegment {
  console.log('Transforming row:', row);
  
  const [category, subcategory] = extractCategoryInfo(row.data_supplier);
  const tags = extractTags(row.segment_description);
  
  const audience: AudienceSegment = {
    id: row.segment_name,
    name: row.segment_name,
    description: row.segment_description || '',
    category,
    subcategory,
    tags,
    reach: row.estimated_volumes || undefined,
    cpm: row.boost_cpm || undefined
  };
  
  console.log('Transformed audience:', audience);
  return audience;
}

export const TaxonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAudiences() {
      console.log('Fetching audiences...');
      try {
        const { data, error } = await supabase
          .from('boost_taxo')
          .select('*')
          .order('segment_name');

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        console.log('Raw data from Supabase:', data);

        if (data && isMounted) {
          const formattedAudiences = data.map(transformBoostTaxoToAudience);
          console.log('Formatted audiences:', formattedAudiences);
          setAudiences(formattedAudiences);
          setError(null);
        }
      } catch (err) {
        console.error('Error in fetchAudiences:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch audiences'));
        setAudiences([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAudiences();

    return () => {
      isMounted = false;
    };
  }, []);

  const searchAudiences = (query: string): AudienceSegment[] => {
    console.log('Searching audiences with query:', query);
    console.log('Current audiences:', audiences);
    
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      console.log('Empty query, returning all audiences');
      return audiences;
    }

    const results = audiences.filter((audience) => {
      const matches = 
        audience.name.toLowerCase().includes(lowerQuery) ||
        audience.description.toLowerCase().includes(lowerQuery) ||
        audience.category.toLowerCase().includes(lowerQuery) ||
        audience.subcategory.toLowerCase().includes(lowerQuery) ||
        audience.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      
      if (matches) {
        console.log('Matched audience:', audience);
      }
      
      return matches;
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
      searchAudiences,
      getAudiencesByCategory,
      getAudienceById,
      addAudience,
      getRecommendedAudiences
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