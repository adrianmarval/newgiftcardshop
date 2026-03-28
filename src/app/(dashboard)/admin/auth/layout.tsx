import { ReactNode } from "react";

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-linear-to-br from-violet-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white">Solmaira Admin</h2>
          <p className="text-violet-300/70 mt-1">Administration Portal</p>
        </div>
        {children}
      </div>
    </main>
  );
}
