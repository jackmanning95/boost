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

export const TaxonomyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [dataSuppliers, setDataSuppliers] = useState<string[]>([]);
  const { user, loading: authLoading } = useAuth();

  const normalizeDataSupplier = (supplier: string | null): string => {
    if (!supplier) return '';
    
    // Normalize AccountScout variations
    if (supplier.toLowerCase().includes('accountscout')) {
      return 'AccountScout';
    }
    
    // Remove any trailing numbers or special characters
    return supplier.trim().replace(/\s*\d+$/, '');
  };

  const fetchAudiences = useCallback(async () => {
    if (!user || authLoading) return;

    try {
      setLoading(true);
      console.log('Taxonomy: Fetching audiences for user:', user.email);

      // First, fetch unique data suppliers
      const { data: supplierData, error: supplierError } = await supabase
        .from('15 may')
        .select('data_supplier')
        .not('data_supplier', 'is', null)
        .distinct();

      if (supplierError) {
        throw supplierError;
      }

      // Normalize and deduplicate suppliers
      const uniqueSuppliers = Array.from(new Set(
        supplierData
          .map(item => normalizeDataSupplier(item.data_supplier))
          .filter(Boolean)
      )).sort();

      setDataSuppliers(uniqueSuppliers);

      // Then fetch all audiences
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

      const formattedAudiences = audiences.map(audience => ({
        id: audience.segment_name,
        name: audience.segment_name,
        description: audience.segment_description || '',
        category: audience.data_supplier?.split('/')[0]?.trim() || 'Other',
        subcategory: audience.data_supplier?.split('/')[1]?.trim() || '',
        dataSupplier: normalizeDataSupplier(audience.data_supplier),
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
    pageSize = 12,
    dataSupplier?: string,
    cpmSort?: 'asc' | 'desc' | null
  ): Promise<AudienceSegment[]> => {
    if (!user) return [];

    try {
      console.log('Taxonomy: Searching audiences:', { query, page, pageSize, dataSupplier, cpmSort });

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
        if (dataSupplier === 'AccountScout') {
          queryBuilder = queryBuilder.ilike('data_supplier', '%accountscout%');
        } else {
          queryBuilder = queryBuilder.ilike('data_supplier', `${dataSupplier}%`);
        }
      }

      // Apply CPM sorting
      if (cpmSort) {
        const sortOrder = cpmSort === 'asc' ? 'asc' : 'desc';
        queryBuilder = queryBuilder.order('boost_cpm', { ascending: cpmSort === 'asc' });
      } else {
        queryBuilder = queryBuilder.order('segment_name');
      }

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error: searchError, count } = await queryBuilder
        .range(start, end);

      if (searchError) throw searchError;

      if (count !== null) {
        setTotalCount(count);
      }

      return data.map(audience => ({
        id: audience.segment_name,
        name: audience.segment_name,
        description: audience.segment_description || '',
        category: audience.data_supplier?.split('/')[0]?.trim() || 'Other',
        subcategory: audience.data_supplier?.split('/')[1]?.trim() || '',
        dataSupplier: normalizeDataSupplier(audience.data_supplier),
        tags: [],
        reach: parseInt(audience.estimated_volumes) || undefined,
        cpm: parseFloat(audience.boost_cpm?.replace(/[^0-9.]/g, '')) || undefined
      }));
    } catch (err) {
      console.error('Taxonomy: Error searching audiences:', err);
      throw err;
    }
  }, [user]);

  const getRecommendedAudiences = useCallback((
    selectedAudiences: AudienceSegment[],
    limit = 3
  ): AudienceSegment[] => {
    if (selectedAudiences.length === 0 || audiences.length === 0) {
      return [];
    }

    // Get categories from selected audiences
    const selectedCategories = new Set(selectedAudiences.map(a => a.category));
    const selectedIds = new Set(selectedAudiences.map(a => a.id));

    // Find audiences in the same categories but not already selected
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