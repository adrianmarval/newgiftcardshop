'use client';

import { motion } from 'framer-motion';
import { NavItem } from './types';
import { SidebarItem } from './sidebar-item';
import { MoreDropDownMenu } from './more-dropdown-menu';

interface MobileNavProps {
  items: NavItem[];
  visibleCount: number;
}

export function MobileNav({ items, visibleCount }: MobileNavProps) {
  const visibleItems = items.slice(0, visibleCount);
  const hiddenItems = items.slice(visibleCount);

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 lg:hidden">
      <motion.div
        className="bg-background/80 border-border flex items-center justify-around border-t backdrop-blur-xl"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {visibleItems.map((item, index) => (
          <motion.div
            key={item.url}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <SidebarItem item={item} />
          </motion.div>
        ))}
        {hiddenItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: visibleItems.length * 0.05 }}
          >
            <MoreDropDownMenu items={hiddenItems} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}