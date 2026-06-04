'use client';

import { useState, useRef, useEffect } from 'react';
import { NavItem } from './types';
import { SidebarItem } from './sidebar-item';
import { FaEllipsisH } from 'react-icons/fa';
import { cn } from '@/lib/utils';

interface MoreMenuProps {
  items: NavItem[];
}

export const MoreDropDownMenu = ({ items }: MoreMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center gap-1 rounded-xl p-3 transition-all duration-200',
          isOpen ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        aria-label="More options"
      >
        <FaEllipsisH className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-20 left-1/2 z-50 w-48 -translate-x-1/2">
          <div className="bg-background rounded-xl border shadow-lg backdrop-blur-xl">
            <nav className="flex gap-1 p-2">
              {items.map((item) => (
                <SidebarItem key={item.url} item={item} />
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};
