import React, { useState } from 'react';
import { AudienceSegment } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Plus, Check, Users, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

interface AudienceCardProps {
  audience: AudienceSegment;
  isSelected?: boolean;
  onSelect?: (audience: AudienceSegment) => void;
  onDeselect?: (audienceId: string) => void;
}

const AudienceCard: React.FC<AudienceCardProps> = ({
  audience,
  isSelected = false,
  onSelect,
  onDeselect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (isSelected) {
      onDeselect?.(audience.id);
    } else {
      onSelect?.(audience);
    }
  };

  const toggleDescription = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-[#509fe0]' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold line-clamp-2">{audience.name}</CardTitle>
          </div>
          {(onSelect || onDeselect) && (
            <Button
              variant={isSelected ? 'primary' : 'outline'}
              size="sm"
              onClick={handleToggle}
              icon={isSelected ? <Check size={16} /> : <Plus size={16} />}
            >
              {isSelected ? 'Remove' : 'Add'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Description with Read More toggle */}
          <div>
            <div className={`text-gray-600 text-sm ${isExpanded ? '' : 'line-clamp-2'}`}>
              {audience.description}
            </div>
            {audience.description && audience.description.length > 100 && (
              <button
                onClick={toggleDescription}
                className="text-[#509fe0] text-sm font-medium flex items-center mt-1 hover:underline"
              >
                {isExpanded ? (
                  <>
                    Show Less <ChevronUp size={14} className="ml-1" />
                  </>
                ) : (
                  <>
                    Read More <ChevronDown size={14} className="ml-1" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{audience.category}</Badge>
            <Badge variant="secondary">{audience.subcategory}</Badge>
            {audience.tags.map((tag) => (
              <Badge key={tag} variant="default">{tag}</Badge>
            ))}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Users size={16} className="text-gray-400" />
              <div>
                <p className="text-gray-500">Estimated Reach</p>
                <p className="font-medium">{audience.reach?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign size={16} className="text-gray-400" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-gray-500">CPM</p>
                  {audience.dataSupplier && (
                    <p className="text-xs font-bold text-gray-700">({audience.dataSupplier})</p>
                  )}
                </div>
                <p className="font-medium">${audience.cpm?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudienceCard;