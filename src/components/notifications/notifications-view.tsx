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
    | 'stock_available' | 'payment_pending' | 'order_completed' | 'rate_promo'
    | 'batch_paid' | 'batch_status' | 'batch_under_review' | 'rate_update'
    | 'new_batch_submitted' | 'high_value_order' | 'low_stock_warning' | 'rate_mismatch_warning';
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
      meta: { orderId: 'ORD-8849', amount: 50.00, timeLeftMinutes: 8 },
    },
    {
      id: 'n-buyer-3',
      title: 'Orden #ORD-8712 completada',
      description: 'Códigos disponibles para descarga',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      read: true,
      type: 'order_completed',
      actionUrl: '/store/dashboard/orders',
      meta: { orderId: 'ORD-8712', amount: 42.50 },
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
      meta: { batchId: 4029, amount: 240.00 },
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
      meta: { amount: 1200.00 },
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
      return <FaExclamationTriangle className="h-5 w-5 text-orange-500 shrink-0" />;
    case 'stock_available':
    case 'order_completed':
    case 'batch_paid':
      return <FaCheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />;
    case 'rate_promo':
    case 'rate_update':
      return <FaBolt className="h-5 w-5 text-amber-500 shrink-0" />;
    case 'new_batch_submitted':
    case 'batch_under_review':
      return <FaBell className="h-5 w-5 text-primary shrink-0" />;
    case 'low_stock_warning':
    case 'rate_mismatch_warning':
      return <FaExclamationCircle className="h-5 w-5 text-red-500 shrink-0" />;
    default:
      return <FaInfoCircle className="h-5 w-5 text-blue-500 shrink-0" />;
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

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    setUnreadCount(portal, unreadCount);
  }, [portal, unreadCount, setUnreadCount]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const handleMarkAllAsRead = () => {
    startTransition(() => {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    });
  };

  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: !item.read } : item))
    );
  };

  const handleDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredNotifications = notifications.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === 'all' || (activeTab === 'unread' && !item.read);

    return matchesSearch && matchesTab;
  });

  return (
    <Card className="border border-border bg-card/60 flex h-full min-h-[500px] flex-col backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-muted/20 px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative rounded-xl bg-primary/10 p-2.5 text-primary">
              <FaBell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Alertas</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">
                {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
              </CardDescription>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 rounded-xl border-border bg-background/50 hover:bg-muted active:scale-95 transition-all text-xs font-semibold"
              onClick={handleMarkAllAsRead}
            >
              <FaCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Leer todo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
        <div className="border-b border-border bg-muted/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
            <TabsList className="bg-muted/50 p-1 rounded-xl h-10 border border-border">
              <TabsTrigger
                value="all"
                className="rounded-lg text-xs font-semibold px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Todas
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="rounded-lg text-xs font-semibold px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm relative"
              >
                Pendientes
                {unreadCount > 0 && (
                  <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-64">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-background/50 border-border rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/45"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-4 rounded-full bg-muted/40 p-6 border border-border">
                <FaRegEnvelope className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">Sin notificaciones</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                No hay alertas pendientes
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
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
                        'group/item relative flex items-start gap-3 rounded-xl border p-4 transition-all duration-200 cursor-pointer',
                        'hover:border-primary/30 hover:bg-muted/20',
                        item.read
                          ? 'border-border bg-background/30 text-muted-foreground/90 opacity-60'
                          : 'border-border bg-muted/5 text-foreground'
                      )}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        {getNotificationIcon(item.type)}
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('text-sm font-semibold truncate', item.read ? 'text-muted-foreground' : 'text-foreground')}>
                            {item.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(item.createdAt)}</span>
                        </div>
                        <p className={cn('text-xs truncate', item.read ? 'text-muted-foreground/70' : 'text-foreground/70')}>
                          {item.description}
                        </p>
                      </div>

                      {item.actionUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 self-center rounded-lg border border-border bg-background/50 hover:bg-muted opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = item.actionUrl!;
                          }}
                        >
                          <FaChevronRight className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}

                      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground"
                          onClick={(e) => handleToggleRead(item.id, e)}
                        >
                          {item.read ? <FaRegEnvelope className="h-3 w-3" /> : <FaEnvelopeOpen className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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