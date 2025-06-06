import React from 'react';
import { History, User, Clock } from 'lucide-react';
import { CampaignWorkflowHistory } from '../../types';

interface CampaignWorkflowHistoryProps {
  history: CampaignWorkflowHistory[];
}

const CampaignWorkflowHistoryComponent: React.FC<CampaignWorkflowHistoryProps> = ({
  history
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

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <History size={20} className="text-blue-600" />
        <h3 className="text-lg font-medium text-gray-900">Workflow History</h3>
      </div>

      {history.length > 0 ? (
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={item.id} className="relative">
              {/* Timeline Line */}
              {index < history.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-200" />
              )}
              
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-blue-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">
                      Status changed to {formatStatus(item.toStatus)}
                    </span>
                    {item.fromStatus && (
                      <span className="text-sm text-gray-500">
                        from {formatStatus(item.fromStatus)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                    <User size={14} />
                    <span>{item.user?.name || 'Unknown User'}</span>
                    <span>•</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  
                  {item.notes && (
                    <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">
                      {item.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <History size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No workflow history available</p>
        </div>
      )}
    </div>
  );
};

export default CampaignWorkflowHistoryComponent;