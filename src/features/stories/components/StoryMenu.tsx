/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MoreVertical, Edit3, Trash2, Pin, PinOff, Archive, type LucideIcon } from 'lucide-react';

export interface StoryMenuProps {
  readonly isPinned?: boolean;
  readonly onPin: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onArchive?: () => void;
}

interface MenuItemConfig {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly action?: () => void;
  readonly variant?: 'default' | 'danger';
  readonly dividerAbove?: boolean;
  readonly hide?: boolean;
}

export const StoryMenu = React.memo(function StoryMenu({
  isPinned = false,
  onPin,
  onEdit,
  onDelete,
  onArchive,
}: StoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const closeMenu = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) {
      triggerButtonRef.current?.focus();
    }
  }, []);

  // Declarative Action Definitions
  const menuItems: readonly MenuItemConfig[] = useMemo(
    () => [
      {
        label: isPinned ? 'Unpin story' : 'Pin story',
        icon: isPinned ? PinOff : Pin,
        action: onPin,
      },
      {
        label: 'Edit story',
        icon: Edit3,
        action: onEdit,
      },
      {
        label: 'Archive story',
        icon: Archive,
        action: onArchive,
        hide: !onArchive,
      },
      {
        label: 'Delete story',
        icon: Trash2,
        action: onDelete,
        variant: 'danger',
        dividerAbove: true,
      },
    ],
    [isPinned, onPin, onEdit, onArchive, onDelete]
  );

  const activeItems = useMemo(() => menuItems.filter((item) => !item.hide), [menuItems]);

  // Ensure ref cache does not retain stale trailing indices
  itemRefs.current.length = activeItems.length;

  // Outside pointer-down and Escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDownOutside(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu(false);
      }
    }

    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
      }
    }

    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, closeMenu]);

  // Focus first menu item when opened
  useEffect(() => {
    if (isOpen) {
      const firstItem = itemRefs.current[0];
      firstItem?.focus();
    }
  }, [isOpen]);

  // Keyboard navigation within the menu (ArrowUp / ArrowDown / Home / End / Tab)
  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const buttons = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
      if (buttons.length === 0) return;

      const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const nextIndex = currentIndex === -1 || currentIndex === buttons.length - 1 ? 0 : currentIndex + 1;
          buttons[nextIndex]?.focus();
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prevIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
          buttons[prevIndex]?.focus();
          break;
        }
        case 'Home': {
          event.preventDefault();
          buttons[0]?.focus();
          break;
        }
        case 'End': {
          event.preventDefault();
          buttons[buttons.length - 1]?.focus();
          break;
        }
        case 'Tab': {
          // Close menu on tab-out to preserve accessible focus flow
          closeMenu(false);
          break;
        }
      }
    },
    [closeMenu]
  );

  return (
    <div
      ref={menuRef}
      className="relative z-40"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label="Story options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'story-actions-menu' : undefined}
        className="p-1 text-white/90 hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <MoreVertical className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id="story-actions-menu"
          role="menu"
          aria-orientation="vertical"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-40 bg-neutral-900/95 border border-neutral-700/80 rounded-xl shadow-2xl backdrop-blur-xl py-1 z-50 text-[13px] overflow-hidden animate-in fade-in zoom-in-95 duration-100 focus:outline-none"
        >
          {activeItems.map((item, index) => {
            const Icon = item.icon;
            const isDanger = item.variant === 'danger';

            return (
              <div key={item.label}>
                {item.dividerAbove && <div className="h-px bg-neutral-800 my-0.5" role="separator" />}
                <button
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  role="menuitem"
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    closeMenu(true);
                    item.action?.();
                  }}
                  className={`w-full px-3 py-1.5 flex items-center gap-2.5 transition-colors text-left cursor-pointer focus:outline-none focus:bg-neutral-800/90 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/50 ${
                    isDanger
                      ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 focus:text-rose-300 focus:bg-rose-950/40'
                      : 'text-neutral-200 hover:text-white hover:bg-neutral-800/80 focus:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isDanger ? 'text-rose-400' : 'text-neutral-400'}`} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default StoryMenu;
