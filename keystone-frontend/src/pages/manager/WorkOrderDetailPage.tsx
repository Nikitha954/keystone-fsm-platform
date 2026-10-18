// pages/manager/WorkOrderDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workOrderService } from '@/services/workOrderService';
import { userService, partService, triageService } from '@/services/index';
import { WorkOrder, WorkOrderStatus, User, Part, TriageResponse } from '@/types';
import { StatusBadge, PriorityBadge } from '@/components/common/Badges';
import SignaturePadModal from '@/components/common/SignaturePadModal';
import FeedbackModal from '@/components/common/FeedbackModal';
import { useOfflineSync, queueOfflineJob } from '@/hooks/useOfflineSync';
import { format } from 'date-fns';
import {
  ArrowLeft, Clock, User as UserIcon, AlertTriangle, Send,
  Sparkles, PenTool, Star, Package, CheckCircle2, Shield,
  Wifi, WifiOff, FileText, Wrench
} from 'lucide-react';
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
  const { isManager, isDispatcher, isTechnician, isCustomer } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [etaMinutes, setEtaMinutes] = useState('15');
  const [sendingEta, setSendingEta] = useState(false);
  const [triaging, setTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResponse | null>(null);

  // Offline work notes & signature
  const [workNotes, setWorkNotes] = useState('');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Parts logging
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partNotes, setPartNotes] = useState('');
  const [loggingPart, setLoggingPart] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      workOrderService.getById(Number(id)),
      (isManager() || isDispatcher()) ? userService.getTechnicians() : Promise.resolve([]),
      partService.getAll({ size: 50 }).catch(() => ({ content: [] })),
    ]).then(([woData, techs, partsData]) => {
      setWo(woData);
      setWorkNotes(woData.workNotes || '');
      setTechnicians(techs);
      setParts(partsData.content || []);
    }).catch(() => toast.error('Failed to load work order'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSendEta = async () => {
    if (!wo) return;
    setSendingEta(true);
    try {
      await workOrderService.notifyEta(wo.id, Number(etaMinutes));
      toast.success(`Automated SMS & Email dispatched: Technician is ${etaMinutes} mins away!`, { icon: '📲' });
    } catch {
      toast.error('Failed to dispatch ETA notification');
    } finally {
      setSendingEta(false);
    }
  };

  const handleTriage = async () => {
    if (!wo) return;
    setTriaging(true);
    try {
      const res = await triageService.triage(wo.id, wo.title + ' - ' + (wo.description || ''));
      setTriageResult(res);
      toast.success(`AI Triage complete: Category ${res.category} (${Math.round(res.confidence * 100)}% confidence)`, { icon: '✨' });
      // Refresh work order
      const updated = await workOrderService.getById(wo.id);
      setWo(updated);
    } catch {
      toast.error('AI Triage execution failed');
    } finally {
      setTriaging(false);
    }
  };

  const handleApplyRecommendedTech = async () => {
    if (!wo || !triageResult?.suggestedTechnicianId) return;
    try {
      const updated = await workOrderService.assign(wo.id, triageResult.suggestedTechnicianId);
      setWo(updated);
      toast.success(`Assigned recommended technician ${triageResult.suggestedTechnicianName}!`, { icon: '🎯' });
    } catch {
      toast.error('Failed to apply recommended technician');
    }
  };

  const handleAssign = async () => {
    if (!wo || !selectedTech) return;
    try {
      const updated = await workOrderService.assign(wo.id, Number(selectedTech));
      setWo(updated);
      toast.success('Technician assigned successfully');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Assignment failed');
    }
  };

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    if (!wo) return;
    if (!isOnline) {
      // Offline-first queue
      await queueOfflineJob({
        workOrderId: wo.id,
        status: newStatus,
        reason: statusReason || 'Updated in offline mode',
        queuedAt: Date.now(),
      });
      setWo({ ...wo, status: newStatus });
      return;
    }

    try {
      const updated = await workOrderService.updateStatus(wo.id, newStatus, statusReason);
      setWo(updated);
      toast.success(`Status changed to ${newStatus.replace('_', ' ')}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Status update failed');
    }
  };

  const handleSaveSignature = async (sigDataUrl: string) => {
    if (!wo) return;
    if (!isOnline) {
      await queueOfflineJob({
        workOrderId: wo.id,
        customerSignature: sigDataUrl,
        workNotes: workNotes,
        status: 'COMPLETED',
        queuedAt: Date.now(),
      });
      setWo({ ...wo, customerSignature: sigDataUrl, status: 'COMPLETED', workNotes });
      return;
    }

    try {
      const updated = await workOrderService.completeOffline(wo.id, {
        customerSignature: sigDataUrl,
        workNotes: workNotes,
      });
      setWo(updated);
      toast.success('Customer signature recorded and encrypted!', { icon: '✍️' });
    } catch {
      toast.error('Failed to save signature');
    }
  };

  const handleSaveNotes = async () => {
    if (!wo) return;
    if (!isOnline) {
      await queueOfflineJob({
        workOrderId: wo.id,
        workNotes: workNotes,
        queuedAt: Date.now(),
      });
      setWo({ ...wo, workNotes });
      return;
    }

    try {
      const updated = await workOrderService.completeOffline(wo.id, { workNotes });
      setWo(updated);
      toast.success('Work notes updated successfully');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const handleLogPartUsage = async () => {
    if (!wo || !selectedPartId) return;
    setLoggingPart(true);
    const qty = Number(partQty) || 1;

    if (!isOnline) {
      await queueOfflineJob({
        workOrderId: wo.id,
        partsUsed: [{ partId: Number(selectedPartId), quantity: qty, notes: partNotes }],
        queuedAt: Date.now(),
      });
      toast.success(`Queued offline part deduction (${qty} unit)`);
      setSelectedPartId('');
      setPartNotes('');
      setLoggingPart(false);
      return;
    }

    try {
      await partService.logUsage(wo.id, {
        partId: Number(selectedPartId),
        quantity: qty,
        notes: partNotes,
      });
      toast.success('Part usage logged! Stock automatically deducted.', { icon: '📦' });
      setSelectedPartId('');
      setPartNotes('');
      // Refresh parts list
      partService.getAll({ size: 50 }).then(res => setParts(res.content || []));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to log part usage');
    } finally {
      setLoggingPart(false);
    }
  };

  const handleFeedbackSubmit = async (data: { rating: number; feedback: string }) => {
    if (!wo) return;
    try {
      const updated = await workOrderService.submitFeedback(wo.id, data);
      setWo(updated);
      toast.success('Thank you! Your feedback has been verified and recorded.', { icon: '🌟' });
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!wo) return <div className="text-center py-20 text-gray-400">Work order not found</div>;

  const nextStatuses = NEXT_STATUSES[wo.status] ?? [];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Offline Status Connectivity Banner */}
      {!isOnline && (
        <div className="p-3 bg-amber-500 text-white rounded-xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <span>Offline-First Mode Active</span>
            <span className="text-xs bg-amber-600 px-2 py-0.5 rounded-full font-normal">
              {pendingCount} item{pendingCount !== 1 ? 's' : ''} queued in IndexedDB
            </span>
          </div>
          <span className="text-xs">Changes will auto-sync upon reconnection</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary py-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">{wo.woNumber}</h1>
              <StatusBadge status={wo.status} />
              <PriorityBadge priority={wo.priority} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{wo.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wo.slaBreach && (
            <span className="flex items-center gap-1 text-red-600 text-xs font-semibold bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" /> SLA Breached
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Details, AI Triage, Customer Feedback) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Details Card */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-600" />
              Service Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Customer', wo.customerName],
                ['Site Location', wo.siteName],
                ['Assigned Technician', wo.assignedToName ?? 'Unassigned'],
                ['Dispatcher / Creator', wo.createdByName],
                ['Scheduled Due', wo.dueDate ? format(new Date(wo.dueDate), 'MMM d, yyyy HH:mm') : '—'],
                ['SLA Deadline', wo.slaDueDate ? format(new Date(wo.slaDueDate), 'MMM d, yyyy HH:mm') : '—'],
                ['Started At', wo.startedAt ? format(new Date(wo.startedAt), 'MMM d, yyyy HH:mm') : '—'],
                ['Completed At', wo.completedAt ? format(new Date(wo.completedAt), 'MMM d, yyyy HH:mm') : '—'],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">{value}</div>
                </div>
              ))}
            </div>

            {wo.description && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Issue Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  {wo.description}
                </p>
              </div>
            )}
          </div>

          {/* AI-Powered Work Order Triage & Dispatching Card */}
          <div className="card p-5 border-l-4 border-primary-600 bg-gradient-to-br from-white via-primary-50/20 to-blue-50/30 dark:from-gray-800 dark:to-gray-800/60 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 rounded-lg text-primary-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    AI Work Order Triage & Smart Dispatch
                  </h3>
                  <p className="text-xs text-gray-500">
                    NLP analysis of urgency, job duration, and skill/location technician matching
                  </p>
                </div>
              </div>

              {(isManager() || isDispatcher()) && (
                <button
                  onClick={handleTriage}
                  disabled={triaging}
                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${triaging ? 'animate-spin' : ''}`} />
                  {triaging ? 'Analyzing...' : wo.triageCategory ? 'Re-Analyze AI' : 'Run AI Triage'}
                </button>
              )}
            </div>

            {wo.triageCategory || triageResult ? (
              <div className="space-y-3.5 pt-2">
                {/* Metrics Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Category</span>
                    <p className="text-sm font-bold text-primary-600 mt-0.5">
                      {triageResult?.category || wo.triageCategory}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Urgency</span>
                    <p className={`text-sm font-bold mt-0.5 ${
                      (triageResult?.urgency || wo.triageUrgency) === 'CRITICAL' ? 'text-red-600' :
                      (triageResult?.urgency || wo.triageUrgency) === 'HIGH' ? 'text-amber-600' : 'text-blue-600'
                    }`}>
                      {triageResult?.urgency || wo.triageUrgency || 'MEDIUM'}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Est. Duration</span>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                      ⏱️ {triageResult?.estimatedDurationMinutes || wo.estimatedDurationMinutes || 60}m
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-gray-400">AI Confidence</span>
                    <p className="text-sm font-bold text-emerald-600 mt-0.5">
                      {Math.round(((triageResult?.confidence ?? wo.triageConfidence) || 0.85) * 100)}%
                    </p>
                  </div>
                </div>

                {/* Required Skills */}
                {triageResult?.requiredSkills && triageResult.requiredSkills.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Required Skills & Certifications:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {triageResult.requiredSkills.map(sk => (
                        <span key={sk} className="text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 px-2 py-0.5 rounded-md font-medium">
                          ✓ {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Action */}
                {triageResult?.suggestedAction && (
                  <div className="text-xs bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-300">
                    <strong>Recommended Triage Action:</strong> {triageResult.suggestedAction}
                  </div>
                )}

                {/* Recommended Technician Card */}
                {triageResult?.suggestedTechnicianName && wo.status === 'NEW' && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                        {triageResult.suggestedTechnicianName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Top AI Match:</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {triageResult.suggestedTechnicianName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {triageResult.suggestedTechnicianDistanceKm != null && `📍 ${triageResult.suggestedTechnicianDistanceKm} km away • `}
                          {triageResult.suggestedTechnicianEtaMinutes != null && `🚗 ~${triageResult.suggestedTechnicianEtaMinutes} min drive`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleApplyRecommendedTech}
                      className="btn-primary py-1 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Auto-Dispatch
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-2">
                Click "Run AI Triage" to extract urgency classification, estimated duration, and recommended technician.
              </p>
            )}
          </div>

          {/* Customer Feedback & Rating Loop Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  Customer Satisfaction & Feedback Loop
                </h3>
              </div>
              {wo.customerRating == null && (
                <button
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 text-amber-700 hover:bg-amber-50"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  Leave Service Rating
                </button>
              )}
            </div>

            {wo.customerRating != null ? (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map(st => (
                      <Star
                        key={st}
                        className={`w-4 h-4 ${
                          st <= (wo.customerRating ?? 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {wo.customerRating} / 5 Stars Verified Review
                  </span>
                </div>
                {wo.customerFeedback && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic mt-1 bg-white/70 dark:bg-gray-800/70 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    "{wo.customerFeedback}"
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500">
                  {wo.status === 'COMPLETED'
                    ? 'Automated feedback invitation sent to customer. Awaiting customer review submission.'
                    : 'Customer rating survey will be automatically dispatched upon job completion.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions, Offline Sign-Off, Parts Consumption */}
        <div className="space-y-5">
          {/* Status Transitions */}
          {nextStatuses.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm">Update Status</h3>
              <input
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                placeholder="Reason / transition note"
                className="input mb-3 text-xs"
              />
              <div className="space-y-1.5">
                {nextStatuses.map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-950/30 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors flex items-center justify-between"
                  >
                    <span>→ Transition to {status.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Technician Manual Assignment */}
          {(isManager() || isDispatcher()) && ['NEW', 'ASSIGNED'].includes(wo.status) && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-primary-600" /> Assign Technician
              </h3>
              <select
                value={selectedTech}
                onChange={e => setSelectedTech(e.target.value)}
                className="input mb-2.5 text-xs"
              >
                <option value="">Choose technician...</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.fullName} ({t.email})</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!selectedTech}
                className="btn-primary w-full justify-center text-xs py-2 disabled:opacity-50"
              >
                Assign Technician
              </button>
            </div>
          )}

          {/* Customer ETA Alert (SMS + Email) */}
          {['ASSIGNED', 'IN_PROGRESS'].includes(wo.status) && (
            <div className="card p-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-100 dark:border-indigo-900">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm flex items-center gap-1.5">
                <Send className="w-4 h-4 text-indigo-600" /> Dispatch Customer ETA
              </h3>
              <p className="text-xs text-gray-500 mb-2">Triggers automated SMS & Email to customer</p>
              <div className="flex gap-1.5 mb-2.5">
                {[10, 15, 30, 45].map(m => (
                  <button
                    key={m}
                    onClick={() => setEtaMinutes(String(m))}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      etaMinutes === String(m)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <button
                onClick={handleSendEta}
                disabled={sendingEta}
                className="btn-primary w-full justify-center text-xs py-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {sendingEta ? 'Dispatching...' : `Send Alert (${etaMinutes} min away)`}
              </button>
            </div>
          )}

          {/* Offline Work Notes & Customer Digital Sign-Off */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-primary-600" /> Field Notes & Customer Sign-Off
            </h3>

            {/* Notes input */}
            <textarea
              value={workNotes}
              onChange={e => setWorkNotes(e.target.value)}
              placeholder="Technician diagnostic notes, pressure tests, parts fitted..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mb-2"
            />
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="btn-secondary text-xs flex-1 justify-center py-1.5"
              >
                Save Notes
              </button>
              <button
                type="button"
                onClick={() => setIsSignatureModalOpen(true)}
                className="btn-primary text-xs flex-1 justify-center py-1.5 flex items-center gap-1"
              >
                <PenTool className="w-3.5 h-3.5" />
                {wo.customerSignature ? 'Re-Sign' : 'Capture Signature'}
              </button>
            </div>

            {/* Display Captured Signature */}
            {wo.customerSignature && (
              <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  Verified Customer Digital Signature:
                </span>
                <img
                  src={wo.customerSignature}
                  alt="Customer Signature"
                  className="max-h-20 max-w-full mx-auto bg-white dark:bg-gray-950 p-1 rounded-lg border border-gray-200 dark:border-gray-800"
                />
              </div>
            )}
          </div>

          {/* Predictive Inventory: Parts Consumed on Job */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm flex items-center gap-1.5">
              <Package className="w-4 h-4 text-orange-500" /> Log Parts Consumed
            </h3>
            <p className="text-xs text-gray-500 mb-2">Auto-deducts inventory & evaluates low-stock threshold</p>

            <div className="space-y-2">
              <select
                value={selectedPartId}
                onChange={e => setSelectedPartId(e.target.value)}
                className="input text-xs"
              >
                <option value="">Select Part from Inventory...</option>
                {parts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.partNumber}) - Stock: {p.stockQty}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={partQty}
                  onChange={e => setPartQty(e.target.value)}
                  placeholder="Qty"
                  className="input text-xs w-20"
                />
                <input
                  type="text"
                  value={partNotes}
                  onChange={e => setPartNotes(e.target.value)}
                  placeholder="Installation notes"
                  className="input text-xs flex-1"
                />
              </div>

              <button
                onClick={handleLogPartUsage}
                disabled={!selectedPartId || loggingPart}
                className="btn-primary w-full justify-center text-xs py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                {loggingPart ? 'Deducting Stock...' : 'Record Part Usage'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSaveSignature}
        customerName={wo.customerName}
      />

      {/* Customer Satisfaction & Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
        workOrderNumber={wo.woNumber}
      />
    </div>
  );
}
