import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Store, Package, User } from 'lucide-react';
import { useStore } from '../store';

export function FloatingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useStore((state) => state.profile);
  const userRole = profile?.role;

  const routes = [
    { path: '/', icon: Home, label: 'Home', color: 'text-emerald-400' },
    { path: '/shop', icon: Store, label: 'Shop', color: 'text-blue-400' },
    ...(userRole === 'admin' ? [{ path: '/product', icon: Package, label: 'Product Admin', color: 'text-purple-400' }] : []),
    { path: '/profile', icon: User, label: 'Profile', color: 'text-amber-400' },
    { path: '/login', icon: User, label: 'Account', color: 'text-orange-400' },
  ];

  let currentIndex = routes.findIndex(r => 
    r.path !== '/' ? location.pathname.startsWith(r.path) : location.pathname === '/'
  );
  if (currentIndex === -1) currentIndex = 0;

  const currentRoute = routes[currentIndex];
  const nextRoute = routes[(currentIndex + 1) % routes.length];
  const Icon = currentRoute.icon;

  return (
    <button
      onClick={() => navigate(nextRoute.path)}
      className="fixed bottom-6 left-6 z-[100] p-3 bg-neutral-900 text-white rounded-full shadow-lg border border-neutral-800 transition-transform hover:scale-105 flex items-center justify-center group"
    >
      <Icon className={`w-5 h-5 transition-colors ${currentRoute.color}`} />
      <span className="absolute left-full ml-3 bg-black/80 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Go to {nextRoute.label}
      </span>
    </button>
  );
}
