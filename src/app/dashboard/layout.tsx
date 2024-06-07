import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';

interface Props {
  children: React.ReactNode;
}

const DashboardLaout = ({ children }: Props) => {
  return (
    <div>
      <Navbar />
      <div className="flex overflow-hidden bg-white pt-16">
        <Sidebar />
        <div className="relative h-full w-full overflow-y-auto bg-gray-50 px-4 pt-6 lg:ml-64">
          <main>{children}</main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default DashboardLaout;
