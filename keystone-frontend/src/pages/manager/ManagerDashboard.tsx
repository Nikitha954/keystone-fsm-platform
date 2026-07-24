import { useEffect, useState } from 'react';
import { dashboardService } from '@/services/index';
import { DashboardStats } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ClipboardList, Users, Building2, AlertTriangle, CheckCircle, Clock, Package, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_COLORS = ['#3b82f6','#f59e0b','#f97316','#22c55e','#8b5cf6','#ef4444'];

export default function ManagerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getManagerDashboard()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { label: 'Total Work Orders', value: stats?.totalWorkOrders ?? 0, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', link: '/workorders' },
    { label: 'In Progress',       value: stats?.inProgressWorkOrders ?? 0, icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50', link: '/workorders?status=IN_PROGRESS' },
    { label: 'SLA Breached',      value: stats?.slaBreachedCount ?? 0, icon: AlertTriangle,  color: 'text-red-600', bg: 'bg-red-50', link: '/workorders' },
    { label: 'Completed',         value: stats?.completedWorkOrders ?? 0, icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50', link: '/workorders?status=COMPLETED' },
    { label: 'Total Customers',   value: stats?.totalCustomers ?? 0, icon: Building2,      color: 'text-purple-600', bg: 'bg-purple-50', link: '/customers' },
    { label: 'Technicians',       value: stats?.totalTechnicians ?? 0, icon: Users,          color: 'text-indigo-600', bg: 'bg-indigo-50', link: '/users' },
    { label: 'New Orders',        value: stats?.newWorkOrders ?? 0, icon: TrendingUp,      color: 'text-cyan-600', bg: 'bg-cyan-50', link: '/workorders?status=NEW' },
    { label: 'Low Stock Parts',   value: stats?.lowStockPartsCount ?? 0, icon: Package,        color: 'text-orange-600', bg: 'bg-orange-50', link: '/parts' },
  ];

  const pieData = [
    { name: 'New',         value: stats?.newWorkOrders ?? 0 },
    { name: 'Assigned',    value: stats?.assignedWorkOrders ?? 0 },
    { name: 'In Progress', value: stats?.inProgressWorkOrders ?? 0 },
    { name: 'On Hold',     value: stats?.onHoldWorkOrders ?? 0 },
    { name: 'Completed',   value: stats?.completedWorkOrders ?? 0 },
    { name: 'Cancelled',   value: stats?.cancelledWorkOrders ?? 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of all field service operations</p>
        </div>
        <Link to="/workorders/new" className="btn-primary">
          + New Work Order
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.label} to={card.link} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Work Orders by Status</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-white ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">No data yet</p>
          )}
        </div>

        {/* SLA Alert */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">SLA Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">SLA Breached</span>
              </div>
              <span className="text-xl font-bold text-red-600">{stats?.slaBreachedCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">Completed</span>
              </div>
              <span className="text-xl font-bold text-green-600">{stats?.completedWorkOrders ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">In Progress</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{stats?.inProgressWorkOrders ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
