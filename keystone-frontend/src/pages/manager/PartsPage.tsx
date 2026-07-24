import { useEffect, useState, useCallback } from 'react';
import { partService } from '@/services/index';
import { Part } from '@/types';
import { Package, AlertTriangle, Plus, TrendingUp, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface PartForm { partNumber: string; name: string; description: string; unitCost: number; stockQty: number; minStock: number; }

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [stockAdjust, setStockAdjust] = useState<{ part: Part; qty: string } | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<PartForm>();

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partService.getAll({ page, size: 15 });
      setParts(data.content); setTotalPages(data.totalPages);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  const onCreate = async (data: PartForm) => {
    try {
      await partService.create({ ...data, unitCost: Number(data.unitCost), stockQty: Number(data.stockQty), minStock: Number(data.minStock) });
      toast.success('Part created'); setShowModal(false); reset(); fetchParts();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const handleAdjust = async () => {
    if (!stockAdjust) return;
    const qty = parseInt(stockAdjust.qty);
    if (isNaN(qty)) { toast.error('Invalid quantity'); return; }
    try {
      await partService.adjustStock(stockAdjust.part.id, qty);
      toast.success('Stock adjusted'); setStockAdjust(null); fetchParts();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const lowStockParts = parts.filter(p => p.lowStock);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parts & Inventory</h1>
          <p className="text-sm text-gray-500">Manage spare parts and stock levels</p>
        </div>
        <button onClick={() => { reset(); setShowModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Part
        </button>
      </div>

      {lowStockParts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-orange-800 text-sm">Low Stock Alert</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockParts.map(p => (
              <span key={p.id} className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                {p.name} ({p.stockQty} left)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Part #','Name','Description','Unit Cost','Stock','Min Stock','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : parts.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.partNumber}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-gray-500 max-w-40 truncate">{p.description ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">AED {p.unitCost.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${p.lowStock ? 'text-red-600' : 'text-gray-900'}`}>{p.stockQty}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.minStock}</td>
                <td className="px-4 py-3">
                  {p.lowStock ? (
                    <span className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" /> Low
                    </span>
                  ) : (
                    <span className="text-green-600 text-xs font-medium">OK</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setStockAdjust({ part: p, qty: '' })}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" /> Adjust
                  </button>
                </td>
              </tr>
            ))}
            {!loading && parts.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />No parts found
              </td></tr>
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

      {/* Create Part Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">New Part</h2>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Part Number *</label>
                  <input {...register('partNumber', { required: true })} className="input" placeholder="PART-001" />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input {...register('name', { required: true })} className="input" placeholder="Air Filter" />
                </div>
                <div>
                  <label className="label">Unit Cost *</label>
                  <input type="number" step="0.01" {...register('unitCost', { required: true })} className="input" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Stock Qty *</label>
                  <input type="number" {...register('stockQty', { required: true })} className="input" placeholder="0" />
                </div>
                <div>
                  <label className="label">Min Stock</label>
                  <input type="number" {...register('minStock')} className="input" defaultValue={5} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} rows={2} className="input resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
                  {isSubmitting ? 'Creating...' : 'Create Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {stockAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-1">Adjust Stock</h2>
            <p className="text-sm text-gray-500 mb-4">{stockAdjust.part.name} – Current: {stockAdjust.part.stockQty}</p>
            <label className="label">Quantity (positive = add, negative = remove)</label>
            <input type="number" value={stockAdjust.qty}
              onChange={e => setStockAdjust(s => s ? { ...s, qty: e.target.value } : null)}
              className="input mb-4" placeholder="e.g. 10 or -5" />
            <div className="flex gap-3">
              <button onClick={() => setStockAdjust(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleAdjust} className="btn-primary flex-1 justify-center">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
