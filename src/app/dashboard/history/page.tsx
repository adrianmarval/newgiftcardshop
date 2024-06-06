export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'History Page',
  description: 'Pagina de Historial',
};

export default async function HistoryPage() {
  console.log('Componente HistoryPage renderizado');
  return <div className="animate__animated animate__fadeIn flex items-center justify-center px-4 pt-6 text-6xl">History Page</div>;
}
