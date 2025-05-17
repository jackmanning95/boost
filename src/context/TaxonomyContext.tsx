import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AudienceSegment } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TaxonomyContextType {
  audiences: AudienceSegment[];
  loading: boolean;
  error: Error | null;
  searchAudiences: (query: string, page?: number, pageSize?: number) => Promise<AudienceSegment[]>;
  totalCount: number;
}

const TaxonomyContext = createContext<TaxonomyContextType | undefined>(undefined);

const SEARCH_LIMIT = 100;

export const TaxonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { user } = useAuth();

  const fetchAudiences = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching audiences from Supabase...');

      const { data: count } = await supabase
        .from('15 may')
        .select('count', { count: 'exact' });

      setTotalCount(count?.[0]?.count || 0);

      const { data, error: fetchError } = await supabase
        .from('15 may')
        .select('*')
        .order('segment_name')
        .limit(SEARCH_LIMIT);

      if (fetchError) throw fetchError;

      const formattedAudiences = data.map(audience => ({
        id: audience.segment_name, // Using segment_name as ID since it's unique
        name: audience.segment_name,
        description: audience.segment_description || '',
        category: audience.data_supplier || 'Unknown',
        dataSupplier: audience.data_supplier || '',
        reach: audience.estimated_volumes || undefined,
        cpm: audience.boost_cpm ? parseFloat(audience.boost_cpm) : undefined
      }));

      console.log(`Fetched ${formattedAudiences.length} audiences`);
      setAudiences(formattedAudiences);
      setError(null);
    } catch (err) {
      console.error('Error fetching audiences:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch audiences'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAudiences();
    }
  }, [user, fetchAudiences]);

  const searchAudiences = useCallback(async (
    query: string,
    page = 1,
    pageSize = SEARCH_LIMIT
  ): Promise<AudienceSegment[]> => {
    try {
      setLoading(true);
      console.log('Searching audiences:', { query, page, pageSize });

      let queryBuilder = supabase
        .from('15 may')
        .select('*');

      if (query) {
        queryBuilder = queryBuilder.or(`segment_name.ilike.%${query}%,segment_description.ilike.%${query}%,data_supplier.ilike.%${query}%`);
      }

      const { data, error: searchError } = await queryBuilder
        .order('segment_name')
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (searchError) throw searchError;

      return data.map(audience => ({
        id: audience.segment_name,
        name: audience.segment_name,
        description: audience.segment_description || '',
        category: audience.data_supplier || 'Unknown',
        dataSupplier: audience.data_supplier || '',
        reach: audience.estimated_volumes || undefined,
        cpm: audience.boost_cpm ? parseFloat(audience.boost_cpm) : undefined
      }));
    } catch (err) {
      console.error('Error searching audiences:', err);
      throw err;
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
      totalCount
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