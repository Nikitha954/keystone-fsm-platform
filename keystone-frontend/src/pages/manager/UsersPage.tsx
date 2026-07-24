import { useEffect, useState, useCallback } from 'react';
import { userService } from '@/services/index';
import { User } from '@/types';
import { Search, Plus, UserCheck, UserX, X, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface UserForm {
  username: string; email: string; password: string;
  firstName: string; lastName: string; phone: string; role: string;
}

const ROLE_COLORS: Record<string, string> = {
  ROLE_MANAGER: 'bg-purple-100 text-purple-700',
  ROLE_DISPATCHER: 'bg-blue-100 text-blue-700',
  ROLE_TECHNICIAN: 'bg-green-100 text-green-700',
  ROLE_CUSTOMER: 'bg-orange-100 text-orange-700',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserForm>();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAll({ search: search || undefined, page, size: 12 });
      setUsers(data.content); setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onCreate = async (data: UserForm) => {
    try {
      await userService.create({ ...data, roles: [data.role] });
      toast.success('User created'); setShowModal(false); reset(); fetchUsers();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create user'); }
  };

  const handleToggle = async (id: number, currentlyActive: boolean) => {
    try {
      await userService.toggleStatus(id);
      toast.success(`User ${currentlyActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500">Manage system users and roles</p>
        </div>
        <button onClick={() => { reset(); setShowModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or email..." className="input pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name','Email','Phone','Role','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
              ))}</tr>
            )) : users.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <span className="font-medium text-gray-900">{u.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-gray-600">{u.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map(r => (
                      <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.replace('ROLE_', '')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(u.id, u.isActive!)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${u.isActive ? 'text-red-600 hover:bg-red-50 border border-red-200' : 'text-green-600 hover:bg-green-50 border border-green-200'}`}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1 px-3">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="btn-secondary py-1 px-3">Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold">New User</h2>
              </div>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input {...register('firstName', { required: true })} className="input" />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input {...register('lastName', { required: true })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Username *</label>
                <input {...register('username', { required: true })} className="input" placeholder="john.doe" />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" {...register('email', { required: true })} className="input" />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" {...register('password', { required: true, minLength: 8 })} className="input" placeholder="Min 8 characters" />
                {errors.password && <p className="text-red-500 text-xs mt-1">Min 8 characters required</p>}
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('phone')} className="input" placeholder="+971-50-000-0000" />
              </div>
              <div>
                <label className="label">Role *</label>
                <select {...register('role', { required: true })} className="input">
                  <option value="">Select role...</option>
                  <option value="ROLE_MANAGER">Manager</option>
                  <option value="ROLE_DISPATCHER">Dispatcher</option>
                  <option value="ROLE_TECHNICIAN">Technician</option>
                  <option value="ROLE_CUSTOMER">Customer</option>
                </select>
                {errors.role && <p className="text-red-500 text-xs mt-1">Role is required</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
