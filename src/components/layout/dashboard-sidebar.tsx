import { NavItem } from './types';
import { SidebarItem } from './sidebar-item';
import { MoreDropDownMenu } from './more-dropdown-menu';
export type AppSection = 'buy' | 'sell' | 'admin';

const NAV_ITEMS: Record<AppSection, NavItem[]> = {
  buy: [
    { title: 'Inicio', url: '/store/dashboard', icon: 'home' },
    { title: 'Historial', url: '/store/dashboard/orders', icon: 'history' },
    { title: 'Comprar', url: '/store/dashboard/browse-cards', icon: 'cart' },
    { title: 'Perfil', url: '/store/dashboard/profile', icon: 'user' },
    { title: 'Notificaciones', url: '/store/dashboard/notifications', icon: 'bell', badgeKey: 'buyer' },
    { title: 'Tema', url: '/theme', icon: 'theme' },
  ],
  sell: [
    { title: 'Home', url: '/sell/dashboard', icon: 'home' },
    { title: 'History', url: '/sell/dashboard/cards', icon: 'cards' },
    { title: 'Sell', url: '/sell/dashboard/sell-cards', icon: 'cash' },
    { title: 'Profile', url: '/sell/dashboard/profile', icon: 'user' },
    { title: 'notifications', url: '/sell/dashboard/notifications', icon: 'bell', badgeKey: 'seller' },
    { title: 'Tema', url: '/theme', icon: 'theme' },
  ],
  admin: [
    { title: 'Home', url: '/admin/dashboard', icon: 'home' },
    { title: 'Users', url: '/admin/dashboard/users', icon: 'users' },
    { title: 'Orders', url: '/admin/dashboard/orders', icon: 'cart' },
    { title: 'Lotes', url: '/admin/dashboard/batches', icon: 'cards' },
    { title: 'Pagos', url: '/admin/dashboard/payments', icon: 'cash' },
    { title: 'Brands', url: '/admin/dashboard/brands', icon: 'tag' },
    { title: 'Config', url: '/admin/dashboard/configuracion', icon: 'settings' },
    { title: 'Perfil', url: '/admin/dashboard/profile', icon: 'user' },
    { title: 'Notificaciones', url: '/admin/dashboard/notifications', icon: 'bell', badgeKey: 'admin' },
    { title: 'Tema', url: '/theme', icon: 'theme' },
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
        <div className="flex flex-col gap-0">{items.map((item) => renderSidebarItem(item))}</div>
      </nav>
      {/*Mobile Sidebar*/}
      <div className="lg:hidden">
        <nav className="bg-background/95 border-border flex items-center justify-around border-t px-2 pt-2 backdrop-blur-xl">
          {visibleItems.map((item) => renderSidebarItem(item))}
          {hiddenItems.length > 0 && <MoreDropDownMenu items={hiddenItems} />}
        </nav>
      </div>
    </>
  );
}
