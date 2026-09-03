import { NavItem } from './types';
import { SidebarItem } from './sidebar-item';
import { MoreDropDownMenu } from './more-dropdown-menu';
import type { AppSection } from '@/types';

const NAV_ITEMS: Record<AppSection, NavItem[]> = {
  buy: [
    { title: 'Inicio', url: '/store/dashboard', icon: 'home' },
    { title: 'Historial', url: '/store/dashboard/orders', icon: 'history' },
    { title: 'Comprar', url: '/store/dashboard/browse-cards', icon: 'cart' },
    { title: 'Cuenta', url: '/store/dashboard/account', icon: 'user' },
  ],
  sell: [
    { title: 'Home', url: '/sell/dashboard', icon: 'home' },
    { title: 'History', url: '/sell/dashboard/cards', icon: 'cards' },
    { title: 'Sell', url: '/sell/dashboard/sell-cards', icon: 'cash' },
    { title: 'Account', url: '/sell/dashboard/account', icon: 'user' },
  ],
  admin: [
    { title: 'Home', url: '/admin/dashboard', icon: 'home' },
    { title: 'Users', url: '/admin/dashboard/users', icon: 'users' },
    { title: 'Orders', url: '/admin/dashboard/orders', icon: 'cart' },
    { title: 'Lotes', url: '/admin/dashboard/batches', icon: 'cards' },
    { title: 'Pagos', url: '/admin/dashboard/payments', icon: 'cash' },
    { title: 'Platform', url: '/admin/dashboard/config', icon: 'settings' },
    { title: 'Brands', url: '/admin/dashboard/brands', icon: 'tag' },
    { title: 'Coins', url: '/admin/dashboard/coins', icon: 'coins' },
    { title: 'Logs', url: '/admin/dashboard/logs', icon: 'logs' },
    { title: 'Account', url: '/admin/dashboard/account', icon: 'user' },
    { title: 'Issues', url: '/admin/dashboard/issues', icon: 'alert' },
  ],
};

interface DashboardSidebarProps {
  portal: AppSection;
}

export async function DashboardSidebar({ portal }: DashboardSidebarProps) {
  const items = NAV_ITEMS[portal];
  const VISIBLE_ITEMS = 4;
  const visibleItems = items.slice(0, VISIBLE_ITEMS);
  const hiddenItems = items.slice(VISIBLE_ITEMS);

  const renderSidebarItem = (item: NavItem) => {
    return <SidebarItem key={item.url} item={item} />;
  };

  return (
    <>
      {/*Desktop Sidebar*/}
      <nav className="hidden h-full items-center justify-center lg:flex lg:flex-col lg:gap-1 lg:p-4">
        <div className="flex flex-col gap-1">{items.map((item) => renderSidebarItem(item))}</div>
      </nav>
      {/*Mobile Sidebar*/}
      <div className="lg:hidden">
        <nav className="bg-background/95 flex items-center justify-around px-2 backdrop-blur-xl">
          {visibleItems.map((item) => renderSidebarItem(item))}
          {hiddenItems.length > 0 && <MoreDropDownMenu items={hiddenItems} />}
        </nav>
      </div>
    </>
  );
}
