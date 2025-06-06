import React, { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { Campaign } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface AdminStatusUpdaterProps {
  campaign: Campaign;
  onStatusUpdate: (campaignId: string, status: string, notes?: string) => Promise<void>;
}

const STATUS_OPTIONS = [
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
  const { isAdmin } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(campaign.status);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isAdmin) return null;

  const handleStatusUpdate = async () => {
    if (selectedStatus === campaign.status && !notes.trim()) return;

    setIsUpdating(true);
    try {
      await onStatusUpdate(campaign.id, selectedStatus, notes.trim() || undefined);
      setNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const hasChanges = selectedStatus !== campaign.status || notes.trim();

  return (
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
            Notes (Optional)
          </label>
          <Input
            as="textarea"
            placeholder="Add notes about this status change..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleStatusUpdate}
            disabled={!hasChanges || isUpdating}
            isLoading={isUpdating}
            icon={<Save size={16} />}
          >
            Update Status
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminStatusUpdater;