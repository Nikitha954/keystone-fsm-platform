import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { workOrderService } from '@/services/workOrderService';
import { customerService } from '@/services/customerService';
import { userService } from '@/services/index';
import { Customer, Site, User } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FormData {
  title: string;
  description: string;
  priority: string;
  customerId: string;
  siteId: string;
  assignedToId: string;
  dueDate: string;
}

export default function CreateWorkOrderPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { priority: 'MEDIUM' }
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const selectedCustomerId = watch('customerId');

  useEffect(() => {
    Promise.all([
      customerService.getAll({ size: 100 }),
      userService.getTechnicians(),
    ]).then(([custData, techs]) => {
      setCustomers(custData.content);
      setTechnicians(techs);
    });
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      customerService.getSitesByCustomer(Number(selectedCustomerId))
        .then(setSites);
    } else {
      setSites([]);
    }
  }, [selectedCustomerId]);

  const onSubmit = async (data: FormData) => {
    try {
      const wo = await workOrderService.create({
        title: data.title,
        description: data.description,
        priority: data.priority,
        customerId: Number(data.customerId),
        siteId: Number(data.siteId),
        assignedToId: data.assignedToId ? Number(data.assignedToId) : undefined,
        dueDate: data.dueDate || undefined,
      });
      toast.success(`Work order ${wo.woNumber} created`);
      navigate(`/workorders/${wo.id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create work order');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-secondary py-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Work Order</h1>
          <p className="text-sm text-gray-500">Create a new field service job</p>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input
              {...register('title', { required: 'Title is required', maxLength: 500 })}
              className="input" placeholder="e.g. HVAC unit not cooling – Floor 3"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} rows={3}
              className="input resize-none" placeholder="Detailed description of the issue..." />
          </div>

          {/* Priority */}
          <div>
            <label className="label">Priority</label>
            <select {...register('priority')} className="input">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Customer */}
          <div>
            <label className="label">Customer <span className="text-red-500">*</span></label>
            <select {...register('customerId', { required: 'Customer is required' })} className="input">
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.customerId && <p className="text-red-500 text-xs mt-1">{errors.customerId.message}</p>}
          </div>

          {/* Site */}
          <div>
            <label className="label">Site <span className="text-red-500">*</span></label>
            <select {...register('siteId', { required: 'Site is required' })} className="input"
              disabled={!selectedCustomerId}>
              <option value="">Select site...</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name} – {s.address}</option>)}
            </select>
            {errors.siteId && <p className="text-red-500 text-xs mt-1">{errors.siteId.message}</p>}
          </div>

          {/* Assign Technician */}
          <div>
            <label className="label">Assign Technician <span className="text-gray-400 text-xs">(optional)</span></label>
            <select {...register('assignedToId')} className="input">
              <option value="">Unassigned</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="label">Due Date <span className="text-gray-400 text-xs">(optional)</span></label>
            <input type="datetime-local" {...register('dueDate')} className="input" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? 'Creating...' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
