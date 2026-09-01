import { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical, Edit3, Trash2, Pin, PinOff, Archive, LucideIcon } from 'lucide-react';

interface PostMenuProps {
  isPinned?: boolean;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive?: () => void;
}

interface MenuItemConfig {
  label: string;
  icon: LucideIcon;
  action?: () => void;
  variant?: 'default' | 'danger';
  dividerAbove?: boolean;
  hide?: boolean;
}

export function PostMenu({ isPinned, onPin, onEdit, onDelete, onArchive }: PostMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  // Handle Outside Clicks & Escape Key
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

  // Declarative Action Definitions
  const menuItems: MenuItemConfig[] = [
    {
      label: isPinned ? 'Unpin post' : 'Pin post',
      icon: isPinned ? PinOff : Pin,
      action: onPin,
    },
    {
      label: 'Edit post',
      icon: Edit3,
      action: onEdit,
    },
    {
      label: 'Archive post',
      icon: Archive,
      action: onArchive,
      hide: !onArchive,
    },
    {
      label: 'Delete post',
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
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="p-1 text-neutral-500 hover:text-neutral-900 transition-colors active:scale-95 flex items-center justify-center cursor-pointer rounded-full"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 bg-neutral-900/95 border border-neutral-700/80 rounded-xl shadow-2xl backdrop-blur-xl py-1 z-50 text-[13px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems
            .filter((item) => !item.hide)
            .map((item, idx) => {
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
                      item.action?.();
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
