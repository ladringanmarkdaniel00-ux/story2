import { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical, Edit3, Trash2, Pin, PinOff, LucideIcon } from 'lucide-react';

interface ShopHeroMenuProps {
  isPinned?: boolean;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

interface MenuItemConfig {
  label: string;
  icon: LucideIcon;
  action: () => void;
  variant?: 'default' | 'danger';
  dividerAbove?: boolean;
}

export function ShopHeroMenu({ isPinned, onPin, onEdit, onDelete }: ShopHeroMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  // Handle Outside Click & Escape Key
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDownOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  // Action definitions
  const menuItems: MenuItemConfig[] = [
    {
      label: isPinned ? 'Unpin hero' : 'Pin hero',
      icon: isPinned ? PinOff : Pin,
      action: onPin,
    },
    {
      label: 'Edit hero',
      icon: Edit3,
      action: onEdit,
    },
    {
      label: 'Delete hero',
      icon: Trash2,
      action: onDelete,
      variant: 'danger',
      dividerAbove: true,
    },
  ];

  return (
    <div ref={menuRef} className="relative z-40">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label="Shop hero options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="w-7 h-7 rounded-full bg-black/60 hover:bg-neutral-800 text-white shadow-sm flex items-center justify-center transition-colors active:scale-95 cursor-pointer backdrop-blur-md"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 bg-neutral-900/95 border border-neutral-700/80 rounded-xl shadow-2xl backdrop-blur-xl py-1 z-50 text-[13px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isDanger = item.variant === 'danger';

            return (
              <div key={item.label}>
                {item.dividerAbove && <div className="h-px bg-neutral-800 my-0.5" />}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    closeMenu();
                    item.action();
                  }}
                  className={`w-full px-3 py-1.5 flex items-center gap-2.5 transition-colors text-left cursor-pointer ${
                    isDanger
                      ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40'
                      : 'text-neutral-200 hover:text-white hover:bg-neutral-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isDanger ? 'text-rose-400' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ShopHeroMenu;
