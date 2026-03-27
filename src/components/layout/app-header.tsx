import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

export const AppHeader = () => {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-10"
        />
        <h1 className="text-3xl font-medium">Documents</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="#"
            rel="noopener noreferrer"
            className="dark:text-foreground text-3xl"
          >
            GitHub
          </Link>
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <ThemeToggle />
          </Button>
        </div>
      </div>
    </header>
  );
};
