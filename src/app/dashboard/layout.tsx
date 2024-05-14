import { Footer, Navbar, Sidebar } from "@/components";

interface Props {
  children: React.ReactNode;
}

const DashboardLaout = ({ children }: Props) => {
  return (
    <div>
      <Navbar />
      <div className="flex overflow-hidden bg-white pt-16">
        <Sidebar />
        <div
          className="fixed inset-0 z-10 hidden bg-gray-900 opacity-50"
          id="sidebarBackdrop"
        ></div>
        <div
          id="main-content"
          className="relative h-full w-full overflow-y-auto bg-gray-50 lg:ml-64"
        >
          <main>{children}</main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default DashboardLaout;
