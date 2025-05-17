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
  const { user, loading: authLoading } = useAuth();

  const fetchAudiences = useCallback(async () => {
    if (!user || authLoading) return;

    try {
      setLoading(true);
      console.log('Taxonomy: Fetching audiences for user:', user.email);

      const { data: audiences, error: audiencesError, count } = await supabase
        .from('audiences')
        .select('*', { count: 'exact' });

      if (audiencesError) {
        throw audiencesError;
      }

      console.log(`Taxonomy: Found ${count} audiences`);
      setTotalCount(count || 0);

      if (!audiences || audiences.length === 0) {
        console.log('Taxonomy: No audiences found');
        setAudiences([]);
        return;
      }

      const formattedAudiences = audiences.map(audience => ({
        id: audience.id,
        name: audience.name,
        description: audience.description || '',
        category: audience.category,
        subcategory: audience.subcategory || '',
        dataSupplier: audience.data_supplier || '',
        tags: audience.tags || [],
        reach: audience.reach,
        cpm: audience.cpm
      }));

      console.log(`Taxonomy: Successfully formatted ${formattedAudiences.length} audiences`);
      setAudiences(formattedAudiences);
      setError(null);
    } catch (err) {
      console.error('Taxonomy: Error fetching audiences:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch audiences'));
      setAudiences([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user && !authLoading) {
      console.log('Taxonomy: Initial fetch triggered for user:', user.email);
      fetchAudiences();
    }
  }, [user, authLoading, fetchAudiences]);

  const searchAudiences = useCallback(async (
    query: string,
    page = 1,
    pageSize = SEARCH_LIMIT
  ): Promise<AudienceSegment[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      console.log('Taxonomy: Searching audiences:', { query, page, pageSize });

      let queryBuilder = supabase
        .from('audiences')
        .select('*');

      if (query) {
        queryBuilder = queryBuilder.textSearch(
          'name,description,category,subcategory,data_supplier',
          query
        );
      }

      const { data, error: searchError } = await queryBuilder
        .order('name')
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (searchError) throw searchError;

      return data.map(audience => ({
        id: audience.id,
        name: audience.name,
        description: audience.description || '',
        category: audience.category,
        subcategory: audience.subcategory || '',
        dataSupplier: audience.data_supplier || '',
        tags: audience.tags || [],
        reach: audience.reach,
        cpm: audience.cpm
      }));
    } catch (err) {
      console.error('Taxonomy: Error searching audiences:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

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