import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-7xl font-black text-gray-200 mb-2">404</h1>
        <p className="text-xl font-semibold text-gray-700 mb-1">Page Not Found</p>
        <p className="text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
