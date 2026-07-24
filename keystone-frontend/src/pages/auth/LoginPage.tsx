import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@keystone.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.firstName}!`);
      if (user.roles.includes('ROLE_MANAGER') || user.roles.includes('ROLE_DISPATCHER')) {
        navigate('/dashboard');
      } else if (user.roles.includes('ROLE_TECHNICIAN')) {
        navigate('/technician');
      } else {
        navigate('/portal');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Manager',     email: 'admin@keystone.com',      color: 'bg-purple-100 text-purple-700' },
    { role: 'Dispatcher',  email: 'dispatcher@keystone.com', color: 'bg-blue-100 text-blue-700' },
    { role: 'Technician',  email: 'tech@keystone.com',       color: 'bg-green-100 text-green-700' },
    { role: 'Customer',    email: 'customer@keystone.com',   color: 'bg-orange-100 text-orange-700' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">KEYSTONE</h1>
          <p className="text-gray-400 text-sm mt-1">Field Service Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input pr-10" placeholder="••••••••" required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3 font-medium">DEMO ACCOUNTS (password: Admin@123)</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(account => (
                <button
                  key={account.role}
                  onClick={() => setEmail(account.email)}
                  className={`text-xs px-3 py-2 rounded-lg font-medium text-left transition-colors hover:opacity-80 ${account.color}`}
                >
                  <div className="font-semibold">{account.role}</div>
                  <div className="text-xs opacity-70 truncate">{account.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          © 2024 KEYSTONE FSM Platform. Enterprise Edition.
        </p>
      </div>
    </div>
  );
}
