import React, { useState, useEffect } from 'react';
import { AudienceSegment } from '../../types';
import { useTaxonomy } from '../../context/TaxonomyContext';
import { Search } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface AudienceSearchProps {
  onSearchResults: (results: AudienceSegment[]) => void;
}

const AudienceSearch: React.FC<AudienceSearchProps> = ({ onSearchResults }) => {
  const { audiences, searchAudiences, loading } = useTaxonomy();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!loading) {
      handleSearch();
      
      const uniqueCategories = Array.from(
        new Set(audiences.map(audience => audience.category))
      ).sort();
      setCategories(uniqueCategories);
    }
  }, [loading, audiences]);

  const handleSearch = async () => {
    setIsSearching(true);
    
    try {
      const results = await searchAudiences(searchQuery);
      
      let filteredResults = results;
      if (selectedCategory) {
        filteredResults = results.filter(audience => audience.category === selectedCategory);
      }
      
      onSearchResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
      onSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search audiences by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedCategory === '' 
              ? 'bg-[#509fe0]/10 text-[#509fe0] font-medium' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => handleCategorySelect('')}
        >
          All Categories
        </button>
        
        {categories.map((category) => (
          <button
            key={category}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedCategory === category 
                ? 'bg-[#509fe0]/10 text-[#509fe0] font-medium' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => handleCategorySelect(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AudienceSearch;