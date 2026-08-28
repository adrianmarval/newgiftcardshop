'use client';

import { useEffect, useRef, useState } from 'react';
import type { TgOpenTarget } from './page';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface RelatedApp {
  platform: string;
  id?: string;
  url?: string;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
  interface Navigator {
    getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  }
}

type Mode = 'miniapp' | 'install';
type InstallState = 'waiting' | 'ready' | 'installing' | 'installed' | 'alreadyInstalled' | 'ios' | 'unavailable';

export interface TgOpenContentProps {
  target: TgOpenTarget;
  intentInstall: boolean;
}

const I18N: Record<
  TgOpenTarget,
  {
    miniappTitle: string;
    miniappSubtitle: string;
    miniappButton: string;
    installTitle: string;
    installSubtitle: string;
    installButton: string;
    preparing: string;
    installing: string;
    installed: string;
    alreadyTitle: string;
    alreadyMsg: string;
    iosTitle: string;
    iosSteps: string;
    fallback: string;
    openApp: string;
    openWeb: string;
    unavailableHint: string;
  }
> = {
  '/sell/dashboard': {
    miniappTitle: 'Install the app',
    miniappSubtitle: 'Installation continues in your browser',
    miniappButton: '🌐 Continue in browser',
    installTitle: 'Install the app',
    installSubtitle: 'Add it to your home screen for the best experience',
    installButton: '📲 Install',
    preparing: 'Preparing installation…',
    installing: 'Installing… please wait.',
    installed: 'Installed! Open it from your home screen.',
    alreadyTitle: 'The app is already installed',
    alreadyMsg: 'Open it from your home screen.',
    iosTitle: 'Install the app',
    iosSteps: 'In Safari: tap the Share button and then "Add to Home Screen".',
    fallback: "Didn't open? Tap here",
    openApp: 'Open the app',
    openWeb: 'Continue in the browser version',
    unavailableHint:
      'If you already installed it, open it from your home screen. Otherwise install it from the browser menu (⋮) → "Install app" / "Add to Home screen".',
  },
  '/store/dashboard': {
    miniappTitle: 'Instalar la app',
    miniappSubtitle: 'La instalación continúa en tu navegador',
    miniappButton: '🌐 Continuar en navegador',
    installTitle: 'Instalar la app',
    installSubtitle: 'Agrégala a tu pantalla de inicio para la mejor experiencia',
    installButton: '📲 Instalar',
    preparing: 'Preparando instalación…',
    installing: 'Instalando… por favor espera.',
    installed: '¡Instalada! Ábrela desde tu pantalla de inicio.',
    alreadyTitle: 'Ya tienes la app instalada',
    alreadyMsg: 'Ábrela desde tu pantalla de inicio.',
    iosTitle: 'Instalar la app',
    iosSteps: 'En Safari: toca el botón Compartir y luego «Añadir a pantalla de inicio».',
    fallback: '¿No se abrió? Toca aquí',
    openApp: 'Abrir la app',
    openWeb: 'Continuar en la versión web',
    unavailableHint:
      'Si ya la instalaste, ábrela desde tu pantalla de inicio. Si no, instálala desde el menú del navegador (⋮) → «Instalar app» / «Añadir a pantalla de inicio».',
  },
};

export function TgOpenContent({ target, intentInstall }: TgOpenContentProps) {
  const t = I18N[target];
  const [mode, setMode] = useState<Mode | null>(null);
  const [installState, setInstallState] = useState<InstallState>('waiting');
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // El evento beforeinstallprompt lo captura el script beforeInteractive
    // del root layout (dispara UNA vez, antes de que este componente exista —
    // un listener local llegaría tarde en visitas repetidas). Aquí solo
    // adoptamos el stash global y escuchamos el anuncio 'pwa-installable'.
    const adopt = () => {
      const ev = window.__pwaInstallPrompt;
      if (ev) {
        deferredPrompt.current = ev;
        setInstallState('ready');
      }
    };
    const onAppInstalled = () => {
      // La ventana NO se cierra ni redirige a la versión web — el usuario
      // queda en la pantalla de éxito ("ábrela desde tu pantalla de inicio").
      // No existe API para lanzar la PWA instalada desde una página web.
      setInstallState('installed');
    };
    window.addEventListener('pwa-installable', adopt);
    window.addEventListener('pwa-installed', onAppInstalled);

    // Detección de modo diferida (los setState síncronos en el body del
    // effect causan renders en cascada y están bloqueados por lint).
    const detect = setTimeout(() => {
      // Las Mini Apps reciben los init params en el hash (#tgWebAppData=...).
      if (window.location.hash.includes('tgWebAppData')) {
        setMode('miniapp');
        return;
      }
      // Browser directo sin intent=install: comportamiento de link normal.
      if (!intentInstall) {
        window.location.replace(target);
        return;
      }
      setMode('install');
      adopt(); // el evento pudo llegar antes de que montara este componente
      // Detección de ya-instalada (Chrome Android): sin beforeinstallprompt
      // el usuario se quedaría esperando 8s en "Preparando…". Requiere la
      // entrada self-referencial `related_applications` en el manifest.
      navigator
        .getInstalledRelatedApps?.()
        .then((apps) => {
          if (apps.some((a) => a.platform === 'webapp')) {
            setInstallState((prev) => (prev === 'waiting' ? 'alreadyInstalled' : prev));
          }
        })
        .catch(() => {});
      const ua = navigator.userAgent;
      const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) setInstallState('ios');
    }, 0);

    // Si beforeinstallprompt no llega (ya instalada, browser sin soporte,
    // diálogo dismisseado recientemente — Chrome lo suprime por un tiempo),
    // caer al fallback para no dejar al usuario colgado.
    const timeout = setTimeout(() => {
      setInstallState((prev) => (prev === 'waiting' ? 'unavailable' : prev));
    }, 8000);

    return () => {
      window.removeEventListener('pwa-installable', adopt);
      window.removeEventListener('pwa-installed', onAppInstalled);
      clearTimeout(detect);
      clearTimeout(timeout);
    };
  }, [target, intentInstall]);

  // Tap 1 — dentro de Telegram: abrir esta página en browser externo con
  // intent=install. try_browser: 'chrome' → Telegram Android abre
  // com.android.chrome directo; en iOS openLink abre el browser por defecto.
  const openExternal = () => {
    const url = window.location.origin + `/tg-open?to=${target}&intent=install`;
    const twa = window.Telegram?.WebApp;
    if (twa?.openLink) {
      twa.openLink(url, { try_browser: 'chrome' });
      setTimeout(() => twa.close(), 300);
    } else {
      window.location.assign(url);
    }
  };

  // Tap 2 — en Chrome: disparar el diálogo nativo de instalación.
  const install = async () => {
    const ev = deferredPrompt.current;
    if (!ev) return;
    deferredPrompt.current = null;
    // La instalación WebAPK tarda unos segundos tras aceptar el diálogo —
    // mostrar feedback mientras tanto (appinstalled la cierra).
    setInstallState('installing');
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome !== 'accepted') setInstallState('unavailable');
    // 'accepted' → el listener appinstalled muestra la pantalla de éxito
  };

  if (mode === 'miniapp') {
    return (
      <>
        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-semibold">{t.miniappTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.miniappSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={openExternal}
          className="bg-primary text-primary-foreground rounded-xl px-8 py-4 text-lg font-semibold shadow-lg transition-transform active:scale-95"
        >
          {t.miniappButton}
        </button>
        <a href={target} target="_blank" rel="noreferrer" className="text-muted-foreground text-sm underline">
          {t.fallback}
        </a>
      </>
    );
  }

  if (mode === 'install') {
    const title = installState === 'ios' ? t.iosTitle : installState === 'alreadyInstalled' ? t.alreadyTitle : t.installTitle;
    return (
      <>
        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm">
            {installState === 'waiting' && t.preparing}
            {installState === 'ready' && t.installSubtitle}
            {installState === 'installing' && t.installing}
            {installState === 'installed' && t.installed}
            {installState === 'alreadyInstalled' && t.alreadyMsg}
            {installState === 'ios' && t.iosSteps}
            {installState === 'unavailable' && t.unavailableHint}
          </p>
        </div>
        {(installState === 'waiting' || installState === 'installing') && (
          <div
            className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            role="status"
            aria-label={installState === 'installing' ? t.installing : t.preparing}
          />
        )}
        {installState === 'ready' && (
          <button
            type="button"
            onClick={install}
            className="bg-primary text-primary-foreground rounded-xl px-8 py-4 text-lg font-semibold shadow-lg transition-transform active:scale-95"
          >
            {t.installButton}
          </button>
        )}
        {/* {(installState === 'installed' || installState === 'alreadyInstalled') && (
          <a href={target} className="text-muted-foreground text-sm underline">
            {t.openWeb}
          </a>
        )} */}
        {installState === 'unavailable' && (
          <a
            href={target}
            className="bg-primary text-primary-foreground rounded-xl px-8 py-4 text-lg font-semibold shadow-lg transition-transform active:scale-95"
          >
            {t.openApp}
          </a>
        )}
      </>
    );
  }

  return <div className="bg-muted/40 h-32 animate-pulse rounded-xl px-8" aria-hidden />;
}
