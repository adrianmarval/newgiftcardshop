import Link from "next/link";
import { IoStar } from "react-icons/io5";

interface Props {
  username?: string;
  transactions?: number;
  rating?: number;
  className?: string;
}

export const UserRateAvatar = ({
  username = "user123",
  transactions = 1250,
  rating = 4,
  className,
}: Props) => {
  return (
    <Link href={`/`}>
      <div className="hover:scale-105">
        <div className="my-auto ml-1 leading-tight ">
          <p className="mr-2 text-xs">Vendedor</p>
          <p className="mr-2 text-xs font-semibold">{username.toUpperCase()}</p>
        </div>

        <div className="flex items-center">
          <IoStar size={12} style={{ color: "gold" }} />
          <IoStar size={12} style={{ color: "gold" }} />
          <IoStar size={12} style={{ color: "gold" }} />
          <IoStar size={12} style={{ color: "gold" }} />
          <IoStar size={12} style={{ color: "gold" }} />
          <p className="text-xs font-semibold">{`(${transactions}) reviews`}</p>
        </div>
      </div>
    </Link>
  );
};
