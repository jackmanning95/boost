import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AudienceSegment } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TaxonomyContextType {
  audiences: AudienceSegment[];
  loading: boolean;
  error: Error | null;
  searchAudiences: (query: string, page?: number, pageSize?: number) => Promise<AudienceSegment[]>;
  getAudiencesByCategory: (category: string) => Promise<AudienceSegment[]>;
  getAudienceById: (id: string) => Promise<AudienceSegment | undefined>;
  getRecommendedAudiences: (baseAudiences: AudienceSegment[], count?: number) => Promise<AudienceSegment[]>;
  refreshAudiences: () => Promise<void>;
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
        .from('audiences')
        .select('count', { count: 'exact' });

      setTotalCount(count?.[0]?.count || 0);

      const { data, error: fetchError } = await supabase
        .from('audiences')
        .select('*')
        .order('name')
        .limit(SEARCH_LIMIT);

      if (fetchError) throw fetchError;

      const formattedAudiences = data.map(audience => ({
        id: audience.id,
        name: audience.name,
        description: audience.description || '',
        category: audience.category,
        subcategory: audience.subcategory || '',
        dataSupplier: audience.data_supplier || '',
        tags: audience.tags || [],
        reach: audience.reach || undefined,
        cpm: audience.cpm || undefined
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
        reach: audience.reach || undefined,
        cpm: audience.cpm || undefined
      }));
    } catch (err) {
      console.error('Error searching audiences:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAudiencesByCategory = useCallback(async (category: string): Promise<AudienceSegment[]> => {
    try {
      const { data, error } = await supabase
        .from('audiences')
        .select('*')
        .eq('category', category)
        .order('name');

      if (error) throw error;

      return data.map(audience => ({
        id: audience.id,
        name: audience.name,
        description: audience.description || '',
        category: audience.category,
        subcategory: audience.subcategory || '',
        dataSupplier: audience.data_supplier || '',
        tags: audience.tags || [],
        reach: audience.reach || undefined,
        cpm: audience.cpm || undefined
      }));
    } catch (err) {
      console.error('Error fetching audiences by category:', err);
      throw err;
    }
  }, []);

  const getAudienceById = useCallback(async (id: string): Promise<AudienceSegment | undefined> => {
    try {
      const { data, error } = await supabase
        .from('audiences')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return undefined;

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        category: data.category,
        subcategory: data.subcategory || '',
        dataSupplier: data.data_supplier || '',
        tags: data.tags || [],
        reach: data.reach || undefined,
        cpm: data.cpm || undefined
      };
    } catch (err) {
      console.error('Error fetching audience by ID:', err);
      throw err;
    }
  }, []);

  const getRecommendedAudiences = useCallback(async (
    baseAudiences: AudienceSegment[],
    count = 3
  ): Promise<AudienceSegment[]> => {
    try {
      if (baseAudiences.length === 0) return [];

      const categories = baseAudiences.map(a => a.category);
      const baseIds = baseAudiences.map(a => a.id);

      const { data, error } = await supabase
        .from('audiences')
        .select('*')
        .in('category', categories)
        .not('id', 'in', `(${baseIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(count);

      if (error) throw error;

      return data.map(audience => ({
        id: audience.id,
        name: audience.name,
        description: audience.description || '',
        category: audience.category,
        subcategory: audience.subcategory || '',
        dataSupplier: audience.data_supplier || '',
        tags: audience.tags || [],
        reach: audience.reach || undefined,
        cpm: audience.cpm || undefined
      }));
    } catch (err) {
      console.error('Error fetching recommended audiences:', err);
      throw err;
    }
  }, []);

  const refreshAudiences = useCallback(async () => {
    await fetchAudiences();
  }, [fetchAudiences]);

  return (
    <TaxonomyContext.Provider value={{
      audiences,
      loading,
      error,
      searchAudiences,
      getAudiencesByCategory,
      getAudienceById,
      getRecommendedAudiences,
      refreshAudiences,
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