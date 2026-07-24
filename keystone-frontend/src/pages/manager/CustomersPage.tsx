import { useEffect, useState, useCallback } from 'react';
import { customerService } from '@/services/customerService';
import { Customer } from '@/types';
import { Search, Plus, Building2, Phone, Mail, MapPin, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface CustomerForm {
  name: string; email: string; phone: string; address: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerForm>();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customerService.getAll({ search: search || undefined, page, size: 12 });
      setCustomers(data.content);
      setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openCreate = () => { setEditCustomer(null); reset({}); setShowModal(true); };
  const openEdit = (c: Customer) => { setEditCustomer(c); reset({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '' }); setShowModal(true); };

  const onSubmit = async (data: CustomerForm) => {
    try {
      if (editCustomer) {
        await customerService.update(editCustomer.id, data);
        toast.success('Customer updated');
      } else {
        await customerService.create(data);
        toast.success('Customer created');
      }
      setShowModal(false); fetchCustomers();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Operation failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this customer?')) return;
    try { await customerService.delete(id); toast.success('Customer deactivated'); fetchCustomers(); }
    catch { toast.error('Failed to deactivate'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500">Manage your client accounts</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Add Customer</button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search customers..." className="input pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 h-36 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(c => (
            <div key={c.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.siteCount} site{c.siteCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-xs text-gray-500 mb-4">
                {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{c.phone}</div>}
                {c.address && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /><span className="truncate">{c.address}</span></div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="btn-secondary py-1 px-3 text-xs flex-1 justify-center">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Deactivate</button>
              </div>
            </div>
          ))}
          {customers.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No customers found</p>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1 px-3">Prev</button>
          <span className="py-1 px-3 text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="btn-secondary py-1 px-3">Next</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editCustomer ? 'Edit Customer' : 'New Customer'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input {...register('name', { required: 'Name is required' })} className="input" placeholder="Company name" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" {...register('email')} className="input" placeholder="contact@company.com" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('phone')} className="input" placeholder="+971-50-000-0000" />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea {...register('address')} rows={2} className="input resize-none" placeholder="Full address" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
                  {isSubmitting ? 'Saving...' : editCustomer ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
