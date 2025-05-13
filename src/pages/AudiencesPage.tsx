import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import AudienceSearch from '../components/audiences/AudienceSearch';
import AudienceCard from '../components/audiences/AudienceCard';
import AudienceRecommendations from '../components/audiences/AudienceRecommendations';
import { useTaxonomy } from '../context/TaxonomyContext';
import { useCampaign } from '../context/CampaignContext';
import { AudienceSegment } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { PlusCircle, Search, ShoppingCart, Sparkles } from 'lucide-react';

const AudiencesPage: React.FC = () => {
  const { loading } = useTaxonomy();
  const { activeCampaign, addAudienceToCampaign, removeAudienceFromCampaign } = useCampaign();
  const { isAdmin } = useAuth();
  const [searchResults, setSearchResults] = useState<AudienceSegment[]>([]);
  
  const handleSearchResults = (results: AudienceSegment[]) => {
    setSearchResults(results);
  };
  
  const selectedAudiences = activeCampaign?.audiences || [];
  
  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audience Taxonomy</h1>
          <p className="text-gray-600 mt-1">Browse and select audience segments for your campaigns</p>
        </div>
        
        {!isAdmin && activeCampaign && (
          <div className="flex items-center">
            <div className="mr-4 text-right hidden md:block">
              <p className="text-sm text-gray-600">Current Campaign</p>
              <p className="font-medium">{activeCampaign.name}</p>
            </div>
            <Link to="/campaign/build">
              <Button 
                variant="primary"
                icon={<ShoppingCart size={18} />}
              >
                Selected Audiences ({selectedAudiences.length})
              </Button>
            </Link>
          </div>
        )}
        
        {!isAdmin && !activeCampaign && (
          <Link to="/campaigns/new">
            <Button 
              variant="primary"
              icon={<PlusCircle size={18} />}
            >
              Create New Campaign
            </Button>
          </Link>
        )}
      </div>
      
      <div className="mb-8">
        <AudienceSearch onSearchResults={handleSearchResults} />
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#509fe0]"></div>
        </div>
      ) : searchResults.length > 0 ? (
        <div>
          <div className="flex items-center mb-4">
            <Sparkles size={20} className="text-[#509fe0] mr-2" />
            <h2 className="text-xl font-semibold">
              {searchResults.length === 6 ? 'Featured Audiences' : `Search Results (${searchResults.length})`}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map(audience => (
              <AudienceCard
                key={audience.id}
                audience={audience}
                isSelected={selectedAudiences.some(a => a.id === audience.id)}
                onSelect={!isAdmin ? addAudienceToCampaign : undefined}
                onDeselect={!isAdmin ? removeAudienceFromCampaign : undefined}
              />
            ))}
          </div>
          
          {!isAdmin && (
            <AudienceRecommendations
              selectedAudiences={selectedAudiences}
              onSelectAudience={addAudienceToCampaign}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No audience segments found matching your search criteria.</p>
        </div>
      )}
    </Layout>
  );
};

export default AudiencesPage;