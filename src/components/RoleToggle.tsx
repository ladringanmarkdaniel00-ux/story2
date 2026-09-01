import React from 'react';
import { Shield, User, UserX } from 'lucide-react';
import { useStore, type UserProfile } from '../store';

export function RoleToggle() {
  const profile = useStore((state) => state.profile);
  const setRole = useStore((state) => state.setRole);
  
  const currentRole = profile?.role || 'guest';

  const roles: { value: UserProfile['role']; label: string; icon: React.ElementType }[] = [
    { value: 'guest', label: 'Guest', icon: UserX },
    { value: 'customer', label: 'User', icon: User },
    { value: 'admin', label: 'Admin', icon: Shield },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex bg-neutral-900/90 backdrop-blur-md rounded-full shadow-lg border border-neutral-800 p-1">
      {roles.map((role) => {
        const Icon = role.icon;
        const isActive = currentRole === role.value;
        return (
          <button
            key={role.value}
            onClick={() => setRole(role.value)}
            title={`Switch to ${role.label} role`}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all
              ${isActive 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}
