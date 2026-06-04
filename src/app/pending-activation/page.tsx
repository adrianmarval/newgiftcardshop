import { Metadata } from 'next';
import { getSession } from '@/lib/authorization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogoutButton } from '@/components/auth/logout-button';
import { Send, Clock, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: `Cuenta Pendiente | ${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}`,
  description: 'Tu cuenta está en proceso de activación por un administrador.',
};

export default async function PendingActivationPage() {
  const session = await getSession();

  if (session.user.isActive || session.user.role === 'ADMIN') {
    const dashboard =
      session.user.role === 'ADMIN' ? '/admin/dashboard' : session.user.role === 'SELLER' ? '/sell/dashboard' : '/store/dashboard';
    redirect(dashboard);
  }

  const isSpanish = session.user.role === 'BUYER';
  const portal = session.user.role === 'SELLER' ? 'sell' : 'buy';

  const t = {
    title: isSpanish ? 'Acceso en Espera' : 'Access Pending',
    greeting: isSpanish ? `¡Hola, ${session.user.name}!` : `Hello, ${session.user.name}!`,
    message: isSpanish
      ? 'Tu cuenta fue creada correctamente, pero un administrador debe validar tu acceso antes de que puedas operar.'
      : 'Your account was created successfully, but an administrator must validate your access before you can operate.',
    cardTitle: isSpanish ? 'Acelerá tu activación' : 'Speed up activation',
    cardDesc: isSpanish
      ? 'Contactanos por Telegram indicando tu email de registro para una aprobación inmediata:'
      : 'Contact us via Telegram indicating your registration email for immediate approval:',
    telegram: `Telegram @${process.env.ADMIN_TELEGRAM_USERNAME || 'SOLMza1'}`,
    footer: isSpanish
      ? `${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} © ${new Date().getFullYear()} • Sistema de Seguridad`
      : `${process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'} © ${new Date().getFullYear()} • Security System`,
  };

  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div className="bg-primary/5 absolute top-0 left-1/2 -z-10 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />

      <div className="w-full max-w-md space-y-8">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="bg-primary/10 absolute -inset-4 animate-ping rounded-full opacity-20" />
              <div className="bg-primary/20 absolute -inset-8 animate-pulse rounded-full opacity-10" />
              <Clock className="text-primary relative h-20 w-20" />
              <ShieldAlert className="text-destructive absolute -right-2 -bottom-2 h-8 w-8" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic sm:text-6xl">{t.title}</h1>
            <p className="text-muted-foreground text-lg leading-tight">
              <span className="text-foreground font-bold">{t.greeting}</span> <br />
              {t.message}
            </p>
          </div>
        </div>

        <Card className="border-primary/20 bg-muted/30 shadow-xl backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-primary text-xs font-bold tracking-[0.2em] uppercase">{t.cardTitle}</CardTitle>
            <CardDescription className="text-foreground text-sm italic">{t.cardDesc}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button
              asChild
              className="h-12 w-full text-lg font-black tracking-tighter uppercase italic shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
              variant="default"
            >
              <Link href="https://t.me/SOLMza1" target="_blank" rel="noopener noreferrer">
                <Send className="mr-2 h-5 w-5" />
                {t.telegram}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-1">
          <div className="flex flex-col gap-1 sm:flex-row">
            <LogoutButton portal={portal} variant="destructive" className="h-12 w-full" />
          </div>
          <p className="text-muted-foreground/40 text-[10px] font-bold tracking-[0.3em] uppercase">{t.footer}</p>
        </div>
      </div>
    </div>
  );
}
