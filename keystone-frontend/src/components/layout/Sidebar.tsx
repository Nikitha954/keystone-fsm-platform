import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, ClipboardList, Users, Building2,
  Package, Settings, ChevronLeft, ChevronRight, Wrench, Shield
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps { open: boolean; onToggle: () => void; }

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    to: '/dashboard',   icon: LayoutDashboard, roles: ['ROLE_MANAGER','ROLE_DISPATCHER'] },
  { label: 'Work Orders',  to: '/workorders',  icon: ClipboardList,   roles: ['ROLE_MANAGER','ROLE_DISPATCHER'] },
  { label: 'Customers',    to: '/customers',   icon: Building2,       roles: ['ROLE_MANAGER','ROLE_DISPATCHER'] },
  { label: 'Parts',        to: '/parts',       icon: Package,         roles: ['ROLE_MANAGER'] },
  { label: 'Users',        to: '/users',       icon: Users,           roles: ['ROLE_MANAGER'] },
  // Technician
  { label: 'My Dashboard', to: '/technician',         icon: LayoutDashboard, roles: ['ROLE_TECHNICIAN'] },
  { label: 'My Jobs',      to: '/technician/workorders', icon: Wrench,       roles: ['ROLE_TECHNICIAN'] },
];

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const { user } = useAuth();

  const visibleItems = navItems.filter(item =>
    item.roles.some(r => user?.roles?.includes(r as any))
  );

  return (
    <div className={clsx(
      'flex flex-col bg-gray-900 text-white transition-all duration-300 relative',
      open ? 'w-60' : 'w-16'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {open && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm tracking-wide">KEYSTONE</p>
            <p className="text-xs text-gray-400">Field Service</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard' || item.to === '/technician'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {open && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {open && user && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-xs text-gray-400 truncate">
                {user.roles[0]?.replace('ROLE_', '')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center border border-gray-600 z-10"
      >
        {open ? <ChevronLeft className="w-3 h-3 text-white" /> : <ChevronRight className="w-3 h-3 text-white" />}
      </button>
    </div>
  );
}
