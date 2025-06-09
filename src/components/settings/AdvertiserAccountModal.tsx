import React, { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { X } from 'lucide-react';
import { AdvertiserAccount } from './AdvertiserAccountManager';

interface AdvertiserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => void;
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
  'Programmatic Platforms',
  'DV360',
  'The Trade Desk',
  'StackAdapt',
  'Yahoo! DSP',
  'Amazon DSP',
  'MediaMath',
  'Reddit',
  'Other (please specify)'
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

  useEffect(() => {
    if (account) {
      setPlatform(account.platform);
      setAdvertiserName(account.advertiserName);
      setAdvertiserId(account.advertiserId);
      if (!PLATFORMS.includes(account.platform)) {
        setCustomPlatform(account.platform);
        setPlatform('Other (please specify)');
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

    if (platform === 'Other (please specify)' && !customPlatform.trim()) {
      newErrors.platform = 'Please specify a platform';
    }

    if (!advertiserName) {
      newErrors.advertiserNam
