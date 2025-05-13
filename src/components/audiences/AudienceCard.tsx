import React from 'react';
import { AudienceSegment } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Plus, Check, Users, DollarSign } from 'lucide-react';

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
  const handleToggle = () => {
    if (isSelected) {
      onDeselect?.(audience.id);
    } else {
      onSelect?.(audience);
    }
  };

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-[#509fe0]' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{audience.name}</CardTitle>
          {(onSelect || onDeselect) && (
            <Button
              variant={isSelected ? 'primary' : 'outline'}
              size="sm"
              onClick={handleToggle}
              icon={isSelected ? <Check size={16} /> : <Plus size={16} />}
            >
              {isSelected ? 'Selected' : 'Add'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm mb-3">{audience.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">{audience.category}</Badge>
          <Badge variant="secondary">{audience.subcategory}</Badge>
          {audience.tags.map((tag) => (
            <Badge key={tag} variant="default">{tag}</Badge>
          ))}
        </div>
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
              <p className="text-gray-500">CPM</p>
              <p className="font-medium">${audience.cpm?.toFixed(2) || 'N/A'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudienceCard;