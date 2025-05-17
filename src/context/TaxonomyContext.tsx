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
      console.log('Starting audience fetch...');

      // First verify table exists and is accessible
      const { data: tableInfo, error: tableError } = await supabase
        .from('15 may')
        .select('*')
        .limit(1);

      if (tableError) {
        console.error('Table access error:', tableError);
        throw new Error(`Table access error: ${tableError.message}`);
      }

      console.log('Table access verified:', tableInfo);

      // Get all records
      const { data, error: fetchError } = await supabase
        .from('15 may')
        .select('segment_name, data_supplier, estimated_volumes, boost_cpm, segment_description');

      if (fetchError) {
        console.error('Data fetch error:', fetchError);
        throw fetchError;
      }

      console.log('Raw data fetched:', data);

      if (!data || data.length === 0) {
        console.log('No data returned from query');
        setAudiences([]);
        setTotalCount(0);
        return;
      }

      const formattedAudiences = data.map(audience => ({
        id: audience.segment_name,
        name: audience.segment_name,
        description: audience.segment_description || '',
        category: audience.data_supplier || 'Unknown',
        dataSupplier: audience.data_supplier || '',
        reach: audience.estimated_volumes ? parseInt(audience.estimated_volumes) : undefined,
        cpm: audience.boost_cpm ? parseFloat(audience.boost_cpm) : undefined
      }));

      console.log(`Formatted ${formattedAudiences.length} audiences:`, formattedAudiences[0]);
      
      setAudiences(formattedAudiences);
      setTotalCount(formattedAudiences.length);
      setError(null);
    } catch (err) {
      console.error('Error in fetchAudiences:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch audiences'));
      setAudiences([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching audiences...');
      fetchAudiences();
    }
  }, [user, fetchAudiences]);

  const searchAudiences = useCallback(async (
    query: string,
    page = 1,
    pageSize = SEARCH_LIMIT
  ): Promise<AudienceSegment[]> => {
    console.log('Searching audiences:', { query, page, pageSize, totalAudiences: audiences.length });

    if (!query) {
      return audiences.slice((page - 1) * pageSize, page * pageSize);
    }

    const searchQuery = query.toLowerCase();
    const filteredAudiences = audiences.filter(audience => 
      audience.name.toLowerCase().includes(searchQuery) ||
      audience.description.toLowerCase().includes(searchQuery) ||
      audience.category.toLowerCase().includes(searchQuery) ||
      audience.dataSupplier.toLowerCase().includes(searchQuery)
    );

    console.log(`Found ${filteredAudiences.length} matches for "${query}"`);
    return filteredAudiences.slice((page - 1) * pageSize, page * pageSize);
  }, [audiences]);

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