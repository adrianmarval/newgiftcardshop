import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground text-lg">Página no encontrada</p>
      <Link href="/" className="text-primary underline underline-offset-4">
        Volver al inicio
      </Link>
    </div>
  );
}
