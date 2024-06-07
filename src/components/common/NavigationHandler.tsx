'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { setCookie } from 'cookies-next';

export const NavigationHandler = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const currentUrl = `${pathname}?${searchParams.toString()}`;
    // Guardar en una cookie en lugar de LocalStorage
    setCookie('previousUrl', currentUrl);
  }, [pathname, searchParams]);

  return <></>; // Este componente no renderiza nada
};
