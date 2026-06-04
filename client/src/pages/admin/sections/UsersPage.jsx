import { useEffect, useState } from 'react';
import { FiSearch, FiFilter, FiEye, FiSlash, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import useAdminStore from '../../../store/adminStore';
import { updateUserStatus } from '../../../api/adminApi';
import DataTable from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import Pagination from '../../../components/admin/Pagination';
import Modal from '../../../components/admin/Modal';

const UsersPage = () => {
  const { users, pagination, fetchUsers, isLoading } = useAdminStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = () => {
    fetchUsers({ page, limit: 10, search, role: roleFilter, is_active: statusFilter });
  };

  useEffect(() => {
    loadData();
  }, [page, roleFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      await updateUserStatus(id, newStatus);
      toast.success(`User ${action}d successfully`);
      loadData();
      if (selectedUser?.id === id) {
        setSelectedUser({...selectedUser, is_active: newStatus});
      }
    } catch (err) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const columns = [
    {
      header: 'User',
      accessor: 'full_name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {row.full_name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold">{row.full_name}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    { header: 'Phone', accessor: 'phone' },
    { 
      header: 'Role', 
      accessor: 'role',
      render: (row) => <span className="capitalize">{row.role}</span>
    },
    { 
      header: 'Status', 
      accessor: 'is_active',
      render: (row) => <StatusBadge status={row.is_active ? 'true' : 'false'} />
    },
    { 
      header: 'Joined', 
      accessor: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setSelectedUser(row); setIsModalOpen(true); }}
            className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition"
            title="View Details"
          >
            <FiEye />
          </button>
          {row.is_active ? (
            <button 
              onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, true); }}
              className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
              title="Deactivate"
            >
              <FiSlash />
            </button>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); handleStatusChange(row.id, false); }}
              className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100 transition"
              title="Activate"
            >
              <FiCheck />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Users Management</h1>
          <p className="text-sm text-gray-500">Manage customers, mechanics, and admins.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, phone..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="mechanic">Mechanic</option>
            <option value="admin">Admin</option>
          </select>
          <select 
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div className="shadow-sm border border-gray-100 rounded-xl bg-white flex flex-col">
        <DataTable columns={columns} data={users} isLoading={isLoading} />
        <Pagination currentPage={pagination.page || 1} totalPages={pagination.totalPages || 1} onPageChange={setPage} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="User Details" size="md">
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
               <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-2xl">
                {selectedUser.full_name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark">{selectedUser.full_name}</h3>
                <p className="text-gray-500">{selectedUser.email} • {selectedUser.phone}</p>
                <div className="mt-2 flex gap-2">
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-bold rounded uppercase">{selectedUser.role}</span>
                  <StatusBadge status={selectedUser.is_active ? 'true' : 'false'} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Account Created</p>
                <p className="font-medium text-dark">{new Date(selectedUser.created_at).toLocaleString()}</p>
              </div>
              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Last Login</p>
                <p className="font-medium text-dark">Recently</p>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button 
                onClick={() => handleStatusChange(selectedUser.id, selectedUser.is_active)}
                className={`px-4 py-2 rounded-lg font-bold text-sm ${selectedUser.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                {selectedUser.is_active ? 'Deactivate Account' : 'Activate Account'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;
