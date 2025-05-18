import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Plus, Briefcase, Search, Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import AdvertiserAccountModal from './AdvertiserAccountModal';

export interface AdvertiserAccount {
  id: string;
  platform: string;
  advertiserName: string;
  advertiserId: string;
  createdAt: string;
}

interface AdvertiserAccountManagerProps {
  accounts: AdvertiserAccount[];
  onAdd: (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => void;
  onUpdate: (account: AdvertiserAccount) => void;
  onDelete: (accountId: string) => void;
}

type SortField = 'advertiserName' | 'platform' | 'advertiserId';
type SortDirection = 'asc' | 'desc';

const AdvertiserAccountManager: React.FC<AdvertiserAccountManagerProps> = ({
  accounts,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdvertiserAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('advertiserName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleAdd = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (account: AdvertiserAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleSave = (account: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => {
    if (editingAccount) {
      onUpdate({ ...account, id: editingAccount.id, createdAt: editingAccount.createdAt });
    } else {
      onAdd(account);
    }
    setIsModalOpen(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchQuery.toLowerCase();
    return (
      account.platform.toLowerCase().includes(searchLower) ||
      account.advertiserName.toLowerCase().includes(searchLower) ||
      account.advertiserId.toLowerCase().includes(searchLower)
    );
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    const aValue = a[sortField].toLowerCase();
    const bValue = b[sortField].toLowerCase();
    return aValue > bValue ? direction : -direction;
  });

  const SortButton: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <button
      className="flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900"
      onClick={() => handleSort(field)}
    >
      <span>{label}</span>
      <ArrowUpDown size={14} className={`
        transition-transform
        ${sortField === field && sortDirection === 'desc' ? 'rotate-180' : ''}
        ${sortField === field ? 'opacity-100' : 'opacity-50'}
      `} />
    </button>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Briefcase size={20} className="mr-2 text-blue-600" />
              Manage Advertiser Accounts
            </CardTitle>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              icon={<Plus size={16} />}
            >
              Add New Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                className="w-full pl-10 pr-4 py-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3">
                      <SortButton field="advertiserName" label="Advertiser Name" />
                    </th>
                    <th className="px-4 py-3">
                      <SortButton field="platform" label="Platform" />
                    </th>
                    <th className="px-4 py-3">
                      <SortButton field="advertiserId" label="Account ID" />
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedAccounts.map(account => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{account.advertiserName}</td>
                      <td className="px-4 py-3">{account.platform}</td>
                      <td className="px-4 py-3 font-mono text-sm">{account.advertiserId}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(account)}
                            icon={<Edit2 size={16} />}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(account.id)}
                            icon={<Trash2 size={16} />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sortedAccounts.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg mt-4">
                  <p className="text-gray-600">
                    {searchQuery
                      ? 'No accounts match your search'
                      : 'No advertiser accounts added yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AdvertiserAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        account={editingAccount}
      />
    </>
  );
};

export default AdvertiserAccountManager;