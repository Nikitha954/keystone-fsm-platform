import { useEffect, useState } from 'react';
import { forecastService, partService } from '@/services/index';
import { InventoryForecast } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { AlertTriangle, TrendingDown, Package, ShoppingCart, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryForecastPage() {
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  const fetchForecast = () => {
    forecastService.getForecast()
      .then(setForecasts)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const handleReorder = async (partId: number, name: string) => {
    setReorderingId(partId);
    try {
      await partService.reorder(partId);
      toast.success(`Automated Purchase Order generated: Restocked ${name}!`, { icon: '📦' });
      fetchForecast();
    } catch {
      toast.error('Failed to trigger reorder');
    } finally {
      setReorderingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const critical = forecasts.filter(f => f.criticalAlert || f.currentStock <= f.minStock);
  const chartData = forecasts
    .filter(f => f.daysUntilDepletion != null)
    .sort((a, b) => (a.daysUntilDepletion ?? 999) - (b.daysUntilDepletion ?? 999))
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            Predictive Inventory & Smart Reordering
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Statistical regression on parts consumption to flag depletion thresholds and reorder before field failures
          </p>
        </div>

        <button
          onClick={fetchForecast}
          className="btn-secondary text-xs flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Forecast
        </button>
      </div>

      {/* Critical Stock Depletion Alerts */}
      {critical.length > 0 && (
        <div className="card p-4 border-l-4 border-red-500 bg-red-50/70 dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="font-bold text-red-800 dark:text-red-400 text-sm">
              Critical Threshold: {critical.length} part{critical.length > 1 ? 's' : ''} require immediate replenishment
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {critical.map(f => (
              <div key={f.partId} className="bg-white dark:bg-gray-800 rounded-xl p-3.5 shadow-xs border border-red-100 dark:border-red-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{f.name}</p>
                      <p className="text-xs font-mono text-gray-500">{f.partNumber}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {f.criticalAlert ? 'Critical' : 'Low Stock'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      Current Stock: <strong className="text-gray-900 dark:text-white">{f.currentStock}</strong> / {f.minStock} min
                    </span>
                    <span className="font-bold text-red-600">
                      {f.daysUntilDepletion != null ? `${f.daysUntilDepletion}d left` : 'Below Min'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleReorder(f.partId, f.name)}
                  disabled={reorderingId === f.partId}
                  className="btn-primary mt-3 w-full justify-center text-xs py-1.5 bg-red-600 hover:bg-red-700 flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {reorderingId === f.partId ? 'Generating PO...' : 'Auto-Reorder Stock'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Days-until-depletion bar chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            Days Until Depletion (Top At-Risk Inventory Parts)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ left: 0, right: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0}
                angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Days Left', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip
                formatter={(val: number) => [`${val} days`, 'Until Depletion']}
                labelFormatter={(label) => `Part: ${label}`}
              />
              <ReferenceLine y={7} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '7d Critical', fill: '#ef4444', fontSize: 11 }} />
              <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '30d Warning', fill: '#f59e0b', fontSize: 11 }} />
              <Bar dataKey="daysUntilDepletion" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      (entry.daysUntilDepletion ?? 999) <= 7 ? '#ef4444' :
                      (entry.daysUntilDepletion ?? 999) <= 30 ? '#f59e0b' : '#22c55e'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Full Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <Package className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-800 dark:text-white text-sm">All Inventory Telemetry & Automated Restock</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Part #', 'Part Name', 'Stock', 'Min Buffer', 'Avg Daily Usage', 'Days Left', 'Depletion Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {forecasts.map(f => (
                <tr key={f.partId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{f.partNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{f.name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">{f.currentStock}</td>
                  <td className="px-4 py-3 text-gray-500">{f.minStock}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{f.avgDailyUsage.toFixed(2)} / day</td>
                  <td className="px-4 py-3">
                    {f.daysUntilDepletion != null ? (
                      <span className={`font-semibold ${
                        f.daysUntilDepletion <= 7 ? 'text-red-600' :
                        f.daysUntilDepletion <= 30 ? 'text-yellow-600' : 'text-green-600'
                      }`}>{f.daysUntilDepletion}d</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    {f.predictedDepletionDate
                      ? new Date(f.predictedDepletionDate).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {f.criticalAlert ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Critical</span>
                    ) : f.currentStock <= f.minStock ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Low Stock</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Healthy</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleReorder(f.partId, f.name)}
                      disabled={reorderingId === f.partId}
                      className="text-xs text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      Reorder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
