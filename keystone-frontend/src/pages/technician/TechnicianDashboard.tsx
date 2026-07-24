import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { workOrderService } from '@/services/workOrderService';
import { WorkOrder } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import { ClipboardList, Clock, CheckCircle, AlertTriangle, Play, Pause } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [activeJobs, setActiveJobs] = useState<WorkOrder[]>([]);
  const [newJobs, setNewJobs] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const [active, assigned] = await Promise.all([
        workOrderService.getMy({ status: 'IN_PROGRESS', size: 5 }),
        workOrderService.getMy({ status: 'ASSIGNED', size: 10 }),
      ]);
      setActiveJobs(active.content);
      setNewJobs(assigned.content);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleStart = async (wo: WorkOrder) => {
    try {
      await workOrderService.updateStatus(wo.id, 'IN_PROGRESS', 'Starting job');
      toast.success('Job started!');
      fetchJobs();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const handlePause = async (wo: WorkOrder) => {
    try {
      await workOrderService.updateStatus(wo.id, 'ON_HOLD', 'Job paused');
      toast.success('Job paused');
      fetchJobs();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const stats = [
    { label: 'Active Jobs', value: activeJobs.length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Assigned', value: newJobs.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'SLA Issues', value: [...activeJobs, ...newJobs].filter(w => w.slaBreach).length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Good day, {user?.firstName}!</h1>
        <p className="text-sm text-gray-500">Here's your workload for today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            Active Jobs
          </h2>
          <div className="space-y-3">
            {activeJobs.map(wo => (
              <div key={wo.id} className="card p-4 border-l-4 border-yellow-400">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-primary-600 font-medium">{wo.woNumber}</span>
                      <PriorityBadge priority={wo.priority} />
                      {wo.slaBreach && <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />SLA</span>}
                    </div>
                    <Link to={`/technician/workorders/${wo.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-primary-600 block truncate">{wo.title}</Link>
                    <p className="text-xs text-gray-500 mt-0.5">{wo.siteName} · {wo.customerName}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handlePause(wo)} className="btn-secondary py-1.5 px-3">
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                    <Link to={`/technician/workorders/${wo.id}`} className="btn-primary py-1.5 px-3">View</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Jobs */}
      {newJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Assigned to You</h2>
          <div className="space-y-3">
            {newJobs.map(wo => (
              <div key={wo.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-primary-600 font-medium">{wo.woNumber}</span>
                      <PriorityBadge priority={wo.priority} />
                      <StatusBadge status={wo.status} />
                    </div>
                    <Link to={`/technician/workorders/${wo.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-primary-600 block truncate">{wo.title}</Link>
                    <p className="text-xs text-gray-500 mt-0.5">{wo.siteName} · {wo.customerName}</p>
                    {wo.dueDate && <p className="text-xs text-gray-400 mt-0.5">Due: {format(new Date(wo.dueDate), 'MMM d, HH:mm')}</p>}
                  </div>
                  <button onClick={() => handleStart(wo)} className="btn-primary py-1.5 px-3 flex-shrink-0">
                    <Play className="w-3.5 h-3.5" /> Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeJobs.length === 0 && newJobs.length === 0 && (
        <div className="card p-12 text-center text-gray-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="font-medium">All caught up!</p>
          <p className="text-sm">No active or assigned work orders.</p>
        </div>
      )}
    </div>
  );
}
