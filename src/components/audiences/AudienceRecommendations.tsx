import React from 'react';
import { AudienceSegment } from '../../types';
import { useTaxonomy } from '../../context/TaxonomyContext';
import AudienceCard from './AudienceCard';
import { Sparkles } from 'lucide-react';

interface AudienceRecommendationsProps {
  selectedAudiences: AudienceSegment[];
  onSelectAudience: (audience: AudienceSegment) => void;
}

const AudienceRecommendations: React.FC<AudienceRecommendationsProps> = ({
  selectedAudiences,
  onSelectAudience
}) => {
  const { getRecommendedAudiences } = useTaxonomy();
  
  const recommendedAudiences = selectedAudiences.length > 0
    ? getRecommendedAudiences(selectedAudiences, 3)
    : [];
  
  if (recommendedAudiences.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-8">
      <div className="flex items-center mb-4 space-x-2">
        <Sparkles size={20} className="text-amber-500" />
        <h2 className="text-xl font-semibold">Recommended Audiences</h2>
      </div>
      
      <p className="text-gray-600 mb-4">
        Based on your selected audiences, you might also be interested in these segments:
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendedAudiences.map(audience => (
          <AudienceCard
            key={audience.id}
            audience={audience}
            onSelect={onSelectAudience}
          />
        ))}
      </div>
    </div>
  );
};

export default AudienceRecommendations;