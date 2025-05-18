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
        .from('15 may')
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

      const formattedAudiences = audiences.map((audience, index) => ({
        id: `audience-${index}`,
        name: audience.segment_name,
        description: audience.segment_description || '',
        category: audience.data_supplier?.split('/')[0]?.trim() || 'Other',
        subcategory: audience.data_supplier?.split('/')[1]?.trim() || '',
        dataSupplier: audience.data_supplier || '',
        tags: [],
        reach: parseInt(audience.estimated_volumes) || undefined,
        cpm: parseFloat(audience.boost_cpm?.replace(/[^0-9.]/g, '')) || undefined
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
    pageSize = 100
  ): Promise<AudienceSegment[]> => {
    if (!user) return [];

    try {
      console.log('Taxonomy: Searching audiences:', { query, page, pageSize });

      let queryBuilder = supabase
        .from('15 may')
        .select('*');

      if (query) {
        queryBuilder = queryBuilder.or(
          `segment_name.ilike.%${query}%,` +
          `segment_description.ilike.%${query}%,` +
          `data_supplier.ilike.%${query}%`
        );
      }

      const { data, error: searchError } = await queryBuilder
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (searchError) throw searchError;

      return data.map((audience, index) => ({
        id: `audience-${index}`,
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
      console.error('Taxonomy: Error searching audiences:', err);
      throw err;
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

export const useTaxonomy = (): TaxonomyContextType => {
  const context = useContext(TaxonomyContext);
  if (context === undefined) {
    throw new Error('useTaxonomy must be used within a TaxonomyProvider');
  }
  return context;
};