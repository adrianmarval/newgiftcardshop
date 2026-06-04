'use client';

import * as React from 'react';
import { useState, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBell,
  FaCheckCircle,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaInfoCircle,
  FaSearch,
  FaTrashAlt,
  FaChevronRight,
  FaEnvelopeOpen,
  FaRegEnvelope,
  FaBolt,
} from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/contexts/notification-context';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  read: boolean;
  type:
    | 'stock_available'
    | 'payment_pending'
    | 'order_completed'
    | 'rate_promo'
    | 'batch_paid'
    | 'batch_status'
    | 'batch_under_review'
    | 'rate_update'
    | 'new_batch_submitted'
    | 'high_value_order'
    | 'low_stock_warning'
    | 'rate_mismatch_warning';
  actionUrl?: string;
  meta?: {
    brandName?: string;
    amount?: number;
    currency?: string;
    batchId?: number;
    orderId?: string;
    timeLeftMinutes?: number;
    spread?: number;
    sellerName?: string;
    buyerName?: string;
  };
}

export interface NotificationsViewProps {
  portal: 'buyer' | 'seller' | 'admin';
  initialNotifications?: NotificationItem[];
}

const DEFAULT_NOTIFICATIONS: Record<'buyer' | 'seller' | 'admin', NotificationItem[]> = {
  buyer: [
    {
      id: 'n-buyer-1',
      title: 'Amazon US disponible',
      description: 'Tarjetas disponibles para compra',
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
      read: false,
      type: 'stock_available',
      actionUrl: '/store/dashboard/browse-cards',
      meta: { brandName: 'Amazon US' },
    },
    {
      id: 'n-buyer-2',
      title: 'Pago pendiente',
      description: 'Orden #ORD-8849 - Transferí USDT',
      createdAt: new Date(Date.now() - 1000 * 60 * 45),
      read: false,
      type: 'payment_pending',
      actionUrl: '/store/dashboard/orders',
      meta: { orderId: 'ORD-8849', amount: 50.0, timeLeftMinutes: 8 },
    },
    {
      id: 'n-buyer-3',
      title: 'Orden #ORD-8712 completada',
      description: 'Códigos disponibles para descarga',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      read: true,
      type: 'order_completed',
      actionUrl: '/store/dashboard/orders',
      meta: { orderId: 'ORD-8712', amount: 42.5 },
    },
    {
      id: 'n-buyer-4',
      title: 'Nueva tasa para Apple US',
      description: 'Tasa preferencial activada',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
      type: 'rate_promo',
      actionUrl: '/store/dashboard/browse-cards',
    },
  ],
  seller: [
    {
      id: 'n-seller-1',
      title: 'Lote #BATCH-4029 liquidado',
      description: '$240.00 USDT transferidos',
      createdAt: new Date(Date.now() - 1000 * 60 * 10),
      read: false,
      type: 'batch_paid',
      actionUrl: '/sell/dashboard/cards',
      meta: { batchId: 4029, amount: 240.0 },
    },
    {
      id: 'n-seller-2',
      title: 'Lote #BATCH-3991 procesado',
      description: '9 tarjetas aprobadas, 1 rechazada',
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
      read: false,
      type: 'batch_status',
      actionUrl: '/sell/dashboard/cards',
      meta: { batchId: 3991 },
    },
    {
      id: 'n-seller-3',
      title: 'Tasa aumentada - Steam Global',
      description: 'Nueva tasa de 72% para tus lotes',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      read: true,
      type: 'rate_update',
      actionUrl: '/sell/dashboard/sell-cards',
    },
    {
      id: 'n-seller-4',
      title: 'Lote #BATCH-4050 en auditoría',
      description: 'Códigos siendo validados',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
      type: 'batch_under_review',
      actionUrl: '/sell/dashboard/cards',
      meta: { batchId: 4050 },
    },
  ],
  admin: [
    {
      id: 'n-admin-1',
      title: 'Nuevo lote por auditar',
      description: '@juancarlos cargó 15 tarjetas Amazon US',
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
      read: false,
      type: 'new_batch_submitted',
      actionUrl: '/admin/dashboard/batches',
      meta: { sellerName: 'juancarlos' },
    },
    {
      id: 'n-admin-2',
      title: 'Pago por verificar',
      description: '@pedrogift envió $1,200.00 USDT',
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
      type: 'high_value_order',
      actionUrl: '/admin/dashboard/orders',
      meta: { amount: 1200.0 },
    },
    {
      id: 'n-admin-3',
      title: 'Spread negativo - Apple US',
      description: 'Revisar configuración de tasas',
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
      read: false,
      type: 'rate_mismatch_warning',
      actionUrl: '/admin/dashboard/brands',
      meta: { brandName: 'Apple US' },
    },
    {
      id: 'n-admin-4',
      title: 'Stock bajo - Apple US',
      description: 'Solo 3 tarjetas disponibles',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
      type: 'low_stock_warning',
      actionUrl: '/admin/dashboard/brands',
    },
  ],
};

const getNotificationIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'payment_pending':
    case 'high_value_order':
      return <FaExclamationTriangle className="h-5 w-5 shrink-0 text-orange-500" />;
    case 'stock_available':
    case 'order_completed':
    case 'batch_paid':
      return <FaCheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />;
    case 'rate_promo':
    case 'rate_update':
      return <FaBolt className="h-5 w-5 shrink-0 text-amber-500" />;
    case 'new_batch_submitted':
    case 'batch_under_review':
      return <FaBell className="text-primary h-5 w-5 shrink-0" />;
    case 'low_stock_warning':
    case 'rate_mismatch_warning':
      return <FaExclamationCircle className="h-5 w-5 shrink-0 text-red-500" />;
    default:
      return <FaInfoCircle className="h-5 w-5 shrink-0 text-blue-500" />;
  }
};

const formatTimeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export const NotificationsView = ({ portal, initialNotifications }: NotificationsViewProps) => {
  const [, startTransition] = useTransition();
  const { setUnreadCount } = useNotifications();
  const defaultItems = initialNotifications || DEFAULT_NOTIFICATIONS[portal];

  const [notifications, setNotifications] = useState<NotificationItem[]>(defaultItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const unreadCount = React.useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useEffect(() => {
    setUnreadCount(portal, unreadCount);
  }, [portal, unreadCount, setUnreadCount]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const handleMarkAllAsRead = () => {
    startTransition(() => {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    });
  };

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: !item.read } : item)));
  };

  const handleDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredNotifications = notifications.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === 'all' || (activeTab === 'unread' && !item.read);

    return matchesSearch && matchesTab;
  });

  return (
    <Card className="border-border bg-card/60 flex h-full min-h-[500px] flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md">
      <CardHeader className="border-border bg-muted/20 border-b px-6 pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <div className="bg-primary/10 text-primary relative rounded-xl p-2.5">
              <FaBell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Alertas</CardTitle>
              <CardDescription className="text-muted-foreground mt-0.5 text-sm">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
              </CardDescription>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-background/50 hover:bg-muted h-9 gap-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
              onClick={handleMarkAllAsRead}
            >
              <FaCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Leer todo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="border-border bg-muted/10 flex flex-col gap-1 border-b p-4 px-6 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
            <TabsList className="bg-muted/50 border-border h-10 rounded-xl border p-1">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-lg px-4 text-xs font-semibold data-[state=active]:shadow-sm"
              >
                Todas
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground relative rounded-lg px-4 text-xs font-semibold data-[state=active]:shadow-sm"
              >
                Pendientes
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground ml-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <FaSearch className="text-muted-foreground/60 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background/50 border-border focus-visible:ring-primary/45 h-10 rounded-xl pl-9 text-sm focus-visible:ring-1"
            />
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-muted/40 border-border relative mb-2 rounded-full border p-6">
                <FaRegEnvelope className="text-muted-foreground/40 h-10 w-10" />
              </div>
              <h3 className="text-foreground text-lg font-semibold tracking-tight">Sin notificaciones</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">No hay alertas pendientes</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <AnimatePresence initial={false}>
                {filteredNotifications.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      onClick={() => handleMarkAsRead(item.id)}
                      className={cn(
                        'group/item relative flex cursor-pointer items-start gap-1 rounded-xl border p-4 transition-all duration-200',
                        'hover:border-primary/30 hover:bg-muted/20',
                        item.read
                          ? 'border-border bg-background/30 text-muted-foreground/90 opacity-60'
                          : 'border-border bg-muted/5 text-foreground',
                      )}
                    >
                      <div className="relative mt-0.5 shrink-0">{getNotificationIcon(item.type)}</div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn('truncate text-sm font-semibold', item.read ? 'text-muted-foreground' : 'text-foreground')}>
                            {item.title}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-[10px]">{formatTimeAgo(item.createdAt)}</span>
                        </div>
                        <p className={cn('truncate text-xs', item.read ? 'text-muted-foreground/70' : 'text-foreground/70')}>
                          {item.description}
                        </p>
                      </div>

                      {item.actionUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="border-border bg-background/50 hover:bg-muted h-7 w-7 shrink-0 self-center rounded-lg border opacity-0 transition-opacity group-hover/item:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = item.actionUrl!;
                          }}
                        >
                          <FaChevronRight className="text-muted-foreground h-3 w-3" />
                        </Button>
                      )}

                      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-muted text-muted-foreground h-6 w-6 rounded-md"
                          onClick={(e) => handleToggleRead(item.id, e)}
                        >
                          {item.read ? <FaRegEnvelope className="h-3 w-3" /> : <FaEnvelopeOpen className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive h-6 w-6 rounded-md"
                          onClick={(e) => handleDeleteNotification(item.id, e)}
                        >
                          <FaTrashAlt className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
