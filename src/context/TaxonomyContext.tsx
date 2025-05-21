import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AudienceSegment } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TaxonomyContextType {
  audiences: AudienceSegment[];
  loading: boolean;
  error: Error | null;
  searchAudiences: (
    query: string,
    page?: number,
    pageSize?: number,
    dataSupplier?: string,
    cpmSort?: 'asc' | 'desc' | null
  ) => Promise<AudienceSegment[]>;
  totalCount: number;
  getRecommendedAudiences: (selectedAudiences: AudienceSegment[], limit?: number) => AudienceSegment[];
  dataSuppliers: string[];
}

const TaxonomyContext = createContext<TaxonomyContextType | undefined>(undefined);

// Complete list of data suppliers
const ALL_DATA_SUPPLIERS = [
  '33Across',
  '4SIGHT',
  'Acxiom',
  'Adstra',
  'Affinity Answers',
  'Affinity Solutions',
  'Alliant',
  'AnalyticsIQ',
  'Anteriad',
  'AutoScout',
  'Bombora',
  'Claritas',
  'ComScore',
  'Cordless Media',
  'Data Axle',
  'Dun & Bradstreet',
  'Dynata',
  'Epsilon',
  'Experian',
  'Experian (via geo)',
  'Experian Worldview',
  'Eyeota',
  'Eyeota Powered by Ibotta',
  'GDR',
  'GfK',
  'Goldfish Ads',
  'Gourmet Ads Data',
  'HG Data',
  'Infutor',
  'Intuition',
  'IRI',
  'IXI (Equifax)',
  'Kantar',
  'Katalyst',
  'Lifesight',
  'Lighthouse List',
  'MARS Consumer Health',
  'Media Source Solutions',
  'Peoplefinders DaaS',
  'Playwire',
  'Plunge Digital',
  'Powerlytics',
  'Selling Simplified',
  'ShareThis',
  'SMS-INC',
  'Sovrn',
  'Starcount',
  'Stirista',
  'TVision',
  'Verisk',
  'Webbula',
  'Wiland Ultimate',
  'YouGov',
  'Ziff Davis'
].sort();

export const TaxonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [dataSuppliers] = useState<string[]>(ALL_DATA_SUPPLIERS);
  const { user } = useAuth();

  const searchAudiences = useCallback(async (
    query: string,
    page = 1,
    pageSize = 12,
    dataSupplier?: string,
    cpmSort?: 'asc' | 'desc' | null
  ): Promise<AudienceSegment[]> => {
    try {
      console.log('Searching audiences with params:', { query, page, pageSize, dataSupplier, cpmSort });
      
      let queryBuilder = supabase
        .from('15 may')
        .select('*', { count: 'exact' });

      // Apply text search filter
      if (query) {
        queryBuilder = queryBuilder.or(
          `segment_name.ilike.%${query}%,` +
          `segment_description.ilike.%${query}%,` +
          `data_supplier.ilike.%${query}%`
        );
      }

      // Apply data supplier filter
      if (dataSupplier) {
        queryBuilder = queryBuilder.ilike('data_supplier', `%${dataSupplier}%`);
      }

      // Apply CPM sorting
      if (cpmSort) {
        queryBuilder = queryBuilder.order('boost_cpm', { ascending: cpmSort === 'asc' });
      } else {
        queryBuilder = queryBuilder.order('segment_name');
      }

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error: searchError, count } = await queryBuilder
        .range(start, end);

      if (searchError) {
        console.error('Search error:', searchError);
        throw searchError;
      }

      console.log('Search results:', { count, resultsCount: data?.length });

      if (count !== null) {
        setTotalCount(count);
      }

      if (!data) return [];

      return data.map(audience => ({
        id: audience.segment_name,
        name: audience.segment_name,
        description: audience.segment_description || '',
        category: audience.data_supplier?.split('/')[0]?.trim() || 'Other',
        subcategory: audience.data_supplier?.split('/')[1]?.trim() || '',
        dataSupplier: audience.data_supplier || '',
        tags: [],
        reach: parseInt(audience.estimated_volumes) || undefined,
        cpm: parseFloat(audience.boost_cpm?.replace(/[^0-9.]/g, '')) || undefined
      }));
    } catch (err) {
      console.error('Error searching audiences:', err);
      throw err;
    }
  }, []);

  const fetchInitialAudiences = useCallback(async () => {
    if (!user) {
      console.log('TaxonomyContext: No user, skipping fetch');
      return;
    }
    
    try {
      console.log('TaxonomyContext: Fetching initial audiences');
      setLoading(true);
      const results = await searchAudiences('');
      setAudiences(results);
      setError(null);
      console.log('TaxonomyContext: Initial audiences fetched:', results.length);
    } catch (err) {
      console.error('Error fetching initial audiences:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch audiences'));
      setAudiences([]);
    } finally {
      setLoading(false);
    }
  }, [user, searchAudiences]);

  useEffect(() => {
    if (user) {
      fetchInitialAudiences();
    } else {
      setAudiences([]);
    }
  }, [user, fetchInitialAudiences]);

  const getRecommendedAudiences = useCallback((
    selectedAudiences: AudienceSegment[],
    limit = 3
  ): AudienceSegment[] => {
    if (selectedAudiences.length === 0 || audiences.length === 0) {
      return [];
    }

    const selectedCategories = new Set(selectedAudiences.map(a => a.category));
    const selectedIds = new Set(selectedAudiences.map(a => a.id));

    const recommendations = audiences
      .filter(audience => 
        selectedCategories.has(audience.category) && 
        !selectedIds.has(audience.id)
      )
      .slice(0, limit);

    return recommendations;
  }, [audiences]);

  return (
    <TaxonomyContext.Provider value={{
      audiences,
      loading,
      error,
      searchAudiences,
      totalCount,
      getRecommendedAudiences,
      dataSuppliers
    }}>
      {children}
    </TaxonomyContext.Provider>
  );
};

export const useTaxonomy = (): TaxonomyContextType => {
  const context = useContext(TaxonomyContext);
  if (context === undefined) {
    throw new Error('useTaxonomy must be used within a TaxonomyProvider');
  }
  return context;
};