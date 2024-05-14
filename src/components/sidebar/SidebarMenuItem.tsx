import Link from "next/link";

interface Props {
  label: string;
  icon: JSX.Element;
  path: string;
}

export const SidebarMenuItem = ({ label, icon, path }: Props) => {
  return (
    <li>
      <Link
        href={path}
        className="group flex items-center rounded-lg p-2 text-base font-normal text-gray-900 hover:bg-gray-100"
      >
        {icon}
        <span className="ml-3">{label}</span>
      </Link>
    </li>
  );
};
