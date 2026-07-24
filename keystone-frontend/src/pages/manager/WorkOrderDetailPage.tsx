// pages/manager/WorkOrderDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrderService } from '@/services/workOrderService';
import { userService } from '@/services/index';
import { WorkOrder, WorkOrderStatus, User } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import { format } from 'date-fns';
import { ArrowLeft, Clock, User as UserIcon, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

const NEXT_STATUSES: Partial<Record<WorkOrderStatus, WorkOrderStatus[]>> = {
  NEW:         ['ASSIGNED', 'CANCELLED'],
  ASSIGNED:    ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
  ON_HOLD:     ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED:   ['CLOSED'],
};

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isManager, isDispatcher, isTechnician } = useAuth();
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState('');
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      workOrderService.getById(Number(id)),
      (isManager() || isDispatcher()) ? userService.getTechnicians() : Promise.resolve([]),
    ]).then(([woData, techs]) => {
      setWo(woData); setTechnicians(techs);
    }).catch(() => toast.error('Failed to load work order'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAssign = async () => {
    if (!wo || !selectedTech) return;
    try {
      const updated = await workOrderService.assign(wo.id, Number(selectedTech));
      setWo(updated); toast.success('Technician assigned');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Assignment failed'); }
  };

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    if (!wo) return;
    try {
      const updated = await workOrderService.updateStatus(wo.id, newStatus, statusReason);
      setWo(updated); toast.success(`Status changed to ${newStatus.replace('_',' ')}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Status update failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!wo) return <div className="text-center py-20 text-gray-400">Work order not found</div>;

  const nextStatuses = NEXT_STATUSES[wo.status] ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary py-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{wo.woNumber}</h1>
          <p className="text-sm text-gray-500">{wo.title}</p>
        </div>
        {wo.slaBreach && (
          <span className="flex items-center gap-1 text-red-600 text-xs font-semibold bg-red-50 px-2 py-1 rounded-full ml-auto">
            <AlertTriangle className="w-3.5 h-3.5" /> SLA Breached
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="md:col-span-2 space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Status', <StatusBadge status={wo.status} />],
                ['Priority', <PriorityBadge priority={wo.priority} />],
                ['Customer', wo.customerName],
                ['Site', wo.siteName],
                ['Assigned To', wo.assignedToName ?? 'Unassigned'],
                ['Created By', wo.createdByName],
                ['Due Date', wo.dueDate ? format(new Date(wo.dueDate), 'MMM d, yyyy HH:mm') : '—'],
                ['SLA Due', wo.slaDueDate ? format(new Date(wo.slaDueDate), 'MMM d, yyyy HH:mm') : '—'],
                ['Started', wo.startedAt ? format(new Date(wo.startedAt), 'MMM d, yyyy HH:mm') : '—'],
                ['Completed', wo.completedAt ? format(new Date(wo.completedAt), 'MMM d, yyyy HH:mm') : '—'],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                  <div className="font-medium text-gray-800 dark:text-gray-200">{value}</div>
                </div>
              ))}
            </div>
            {wo.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{wo.description}</p>
              </div>
            )}
            {wo.totalTimeMinutes != null && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                Total time: <strong>{Math.floor(wo.totalTimeMinutes / 60)}h {wo.totalTimeMinutes % 60}m</strong>
              </div>
            )}
          </div>

          {/* Status History */}
          {wo.statusHistory && wo.statusHistory.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Status History</h3>
              <div className="space-y-3">
                {wo.statusHistory.map(h => (
                  <div key={h.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        {h.oldStatus && <StatusBadge status={h.oldStatus} />}
                        {h.oldStatus && <span className="text-gray-400">→</span>}
                        <StatusBadge status={h.newStatus} />
                        <span className="text-gray-400 text-xs">by {h.changedByName}</span>
                      </div>
                      {h.changeReason && <p className="text-gray-500 text-xs mt-0.5">{h.changeReason}</p>}
                      <p className="text-gray-400 text-xs">{format(new Date(h.changedAt), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div className="space-y-4">
          {/* Assign technician */}
          {(isManager() || isDispatcher()) && ['NEW','ASSIGNED'].includes(wo.status) && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Assign Technician
              </h3>
              <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} className="input mb-3">
                <option value="">Select technician...</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
              <button onClick={handleAssign} disabled={!selectedTech} className="btn-primary w-full justify-center">Assign</button>
            </div>
          )}

          {/* Status transitions */}
          {nextStatuses.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Update Status</h3>
              <input value={statusReason} onChange={e => setStatusReason(e.target.value)}
                placeholder="Reason (optional)" className="input mb-3" />
              <div className="space-y-2">
                {nextStatuses.map(status => (
                  <button key={status} onClick={() => handleStatusChange(status)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium transition-colors">
                    → {status.replace('_',' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
