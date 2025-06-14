import React, { useState } from 'react';
import { Settings, Save, MessageSquare } from 'lucide-react';
import { Campaign } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface AdminStatusUpdaterProps {
  campaign: Campaign;
  onStatusUpdate: (campaignId: string, status: string, notes?: string) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_on_client', label: 'Waiting on Client' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed / Needs Attention' },
  { value: 'completed', label: 'Completed' }
];

const AdminStatusUpdater: React.FC<AdminStatusUpdaterProps> = ({
  campaign,
  onStatusUpdate
}) => {
  const { isAdmin, user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(campaign.status);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [notifyClient, setNotifyClient] = useState(true);

  if (!isAdmin) return null;

  const handleStatusUpdate = async () => {
    if (selectedStatus === campaign.status && !notes.trim()) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(campaign.id, selectedStatus, notes.trim() || undefined);
      
      // Send additional notification if requested
      if (notifyClient && notes.trim()) {
        await supabase
          .from('notifications')
          .insert({
            user_id: campaign.clientId,
            title: 'Campaign Update',
            message: `Update on your campaign "${campaign.name}": ${notes.trim()}`,
            read: false,
            campaign_id: campaign.id
          });
      }
      
      setNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const sendQuickUpdate = async (message: string) => {
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: campaign.clientId,
          title: 'Campaign Update',
          message: `Update on your campaign "${campaign.name}": ${message}`,
          read: false,
          campaign_id: campaign.id
        });

      // Also add as a comment
      await supabase
        .from('campaign_comments')
        .insert({
          campaign_id: campaign.id,
          user_id: user?.id,
          content: message
        });

    } catch (error) {
      console.error('Error sending quick update:', error);
    }
  };

  const hasChanges = selectedStatus !== campaign.status || notes.trim();

  return (
    <div className="space-y-6">
      {/* Status Updater */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Settings size={20} className="text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Update Campaign Status</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Notes
            </label>
            <Input
              as="textarea"
              placeholder="Add notes about this status change or general update..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="notify-client"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="notify-client" className="ml-2 block text-sm text-gray-700">
              Send notification to client
            </label>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleStatusUpdate}
              disabled={!hasChanges || isUpdating}
              isLoading={isUpdating}
              icon={<Save size={16} />}
            >
              Update Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Updates */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MessageSquare size={20} className="text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Quick Updates</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Send quick status updates to the client without changing the campaign status.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendQuickUpdate("We're reviewing your campaign requirements and will have an update soon.")}
          >
            Under Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendQuickUpdate("Your campaign setup is in progress. We'll notify you once it's ready to launch.")}
          >
            Setup in Progress
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendQuickUpdate("We need some additional information from you to proceed with your campaign.")}
          >
            Need Info
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendQuickUpdate("Your campaign is performing well. We'll send a detailed report soon.")}
          >
            Good Performance
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminStatusUpdater;