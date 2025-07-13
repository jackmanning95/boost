import React, { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { X } from 'lucide-react';
import { AdvertiserAccount } from '../../types';

interface AdvertiserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => Promise<void>;
  account?: AdvertiserAccount | null;
}

const PLATFORMS = [
  'Meta',
  'Instagram',
  'TikTok',
  'X/Twitter',
  'LinkedIn',
  'Pinterest',
  'Snapchat',
  'DV360',
  'The Trade Desk',
  'Xandr',
  'MediaMath',
  'Amazon DSP',
  'Yahoo! DSP',
  'StackAdapt',
  'Other'
];

const AdvertiserAccountModal: React.FC<AdvertiserAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  account
}) => {
  const [platform, setPlatform] = useState('');
  const [customPlatform, setCustomPlatform] = useState('');
  const [advertiserName, setAdvertiserName] = useState('');
  const [advertiserId, setAdvertiserId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setPlatform(account.platform);
      setAdvertiserName(account.advertiserName);
      setAdvertiserId(account.advertiserId);
      if (!PLATFORMS.includes(account.platform)) {
        setCustomPlatform(account.platform);
        setPlatform('Other');
      } else {
        setCustomPlatform('');
      }
    } else {
      setPlatform('');
      setAdvertiserName('');
      setAdvertiserId('');
      setCustomPlatform('');
    }
    setErrors({});
  }, [account, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!platform) {
      newErrors.platform = 'Platform is required';
    }

    if (platform === 'Other' && !customPlatform.trim()) {
      newErrors.platform = 'Please specify a platform';
    }

    if (!advertiserName) {
      newErrors.advertiserName = 'Advertiser name is required';
    }

    if (!advertiserId) {
      newErrors.advertiserId = 'Advertiser ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        platform: platform === 'Other' ? customPlatform : platform,
        advertiserName,
        advertiserId
      });
      onClose();
    } catch (error) {
      console.error('Error saving advertiser account:', error);
      setErrors({ submit: 'Failed to save account. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
      // Close when clicking outside the modal
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {account ? 'Edit Advertiser Account' : 'Add New Advertiser Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={`w-full rounded-md border ${
                errors.platform ? 'border-red-500' : 'border-gray-300'
              } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="">Select a platform</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {platform === 'Other' && (
              <input
                type="text"
                placeholder="Enter custom platform name"
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {errors.platform && (
              <p className="mt-1 text-sm text-red-600">{errors.platform}</p>
            )}
          </div>

          <Input
            label="Advertiser Name"
            value={advertiserName}
            onChange={(e) => setAdvertiserName(e.target.value)}
            error={errors.advertiserName}
            placeholder="e.g., Client A"
          />

          <Input
            label="Advertiser ID"
            value={advertiserId}
            onChange={(e) => setAdvertiserId(e.target.value)}
            error={errors.advertiserId}
            placeholder="Enter the platform-specific ID"
          />

          {errors.submit && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              {account ? 'Save Changes' : 'Add Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvertiserAccountModal;