import React from 'react';
import { Clock, User, MessageCircle, Users, Plus, Minus, Edit, CheckCircle } from 'lucide-react';
import { CampaignActivity } from '../../types';

interface CampaignActivityTimelineProps {
  activities: CampaignActivity[];
}

const CampaignActivityTimeline: React.FC<CampaignActivityTimelineProps> = ({
  activities
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <Plus size={16} className="text-green-600" />;
      case 'updated':
        return <Edit size={16} className="text-blue-600" />;
      case 'status_changed':
        return <CheckCircle size={16} className="text-purple-600" />;
      case 'comment_added':
        return <MessageCircle size={16} className="text-orange-600" />;
      case 'audience_added':
        return <Users size={16} className="text-teal-600" />;
      case 'audience_removed':
        return <Minus size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getActivityDescription = (activity: CampaignActivity) => {
    const { actionType, actionDetails, user } = activity;
    const userName = user?.name || 'Unknown User';

    switch (actionType) {
      case 'created':
        return `${userName} created the campaign "${actionDetails.campaign_name}"`;
      case 'updated':
        return `${userName} updated campaign details`;
      case 'status_changed':
        return `${userName} changed status from "${actionDetails.from_status}" to "${actionDetails.to_status}"`;
      case 'comment_added':
        return `${userName} ${actionDetails.is_reply ? 'replied to a comment' : 'added a comment'}`;
      case 'audience_added':
        return `${userName} added audience "${actionDetails.audience_name}"`;
      case 'audience_removed':
        return `${userName} removed audience "${actionDetails.audience_name}"`;
      default:
        return `${userName} performed an action`;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'status_changed':
        return 'bg-purple-100 text-purple-800';
      case 'comment_added':
        return 'bg-orange-100 text-orange-800';
      case 'audience_added':
        return 'bg-teal-100 text-teal-800';
      case 'audience_removed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Clock size={20} className="text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative">
              {/* Timeline Line */}
              {index < activities.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-200" />
              )}
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {getActivityIcon(activity.actionType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {getActivityDescription(activity)}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(activity.actionType)}`}>
                      {activity.actionType.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                    <User size={12} />
                    <span>{activity.user?.name || 'Unknown User'}</span>
                    <span>•</span>
                    <span>{formatDate(activity.createdAt)}</span>
                  </div>
                  
                  {/* Additional Details */}
                  {activity.actionDetails && Object.keys(activity.actionDetails).length > 0 && (
                    <div className="bg-gray-50 rounded-md p-3 text-sm">
                      {activity.actionType === 'comment_added' && activity.actionDetails.comment_content && (
                        <p className="text-gray-700 italic">
                          "{activity.actionDetails.comment_content}"
                        </p>
                      )}
                      {activity.actionType === 'status_changed' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">Status changed:</span>
                          <span className="font-medium text-red-600">{activity.actionDetails.from_status}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-green-600">{activity.actionDetails.to_status}</span>
                        </div>
                      )}
                      {(activity.actionType === 'audience_added' || activity.actionType === 'audience_removed') && (
                        <p className="text-gray-700">
                          <span className="font-medium">{activity.actionDetails.audience_name}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Clock size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No activity recorded yet</p>
        </div>
      )}
    </div>
  );
};

export default CampaignActivityTimeline;