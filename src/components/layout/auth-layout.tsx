import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  bgColor: string;
  gradientFrom: string;
  gradientVia: string;
  blobBg: string;
  accentText: string;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, bgColor, gradientFrom, gradientVia, blobBg, accentText, title, subtitle }: AuthLayoutProps) {
  return (
    <main className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden ${bgColor} px-4 py-8 sm:p-6`}>
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] ${gradientFrom} ${gradientVia} ${bgColor}`} />
      <div className={`absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full ${blobBg} blur-3xl`} />
      <div className={`absolute top-0 right-0 h-64 w-64 rounded-full ${blobBg} blur-3xl`} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 text-center sm:mb-12">
          <h2 className="text-2xl font-light tracking-tight text-white sm:text-3xl">
            <span className={`font-semibold ${accentText}`}>{process.env.NEXT_PUBLIC_APP_NAME || 'GiftCardShop'}</span> {title}
          </h2>
          <p className="mt-1 text-xs text-slate-400 sm:mt-2 sm:text-sm">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
