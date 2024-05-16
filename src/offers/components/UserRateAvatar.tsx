import Link from "next/link";
import { IoStar } from "react-icons/io5";

interface Props {
  username?: string;
  transactions?: number;
  rating?: number;
}

export const UserRateAvatar = ({
  username = "user123",
  transactions = 1250,
  rating = 4,
}: Props) => {
  return (
    <Link href={`/`}>
      <div className="flex items-center hover:scale-105">
        <div className="my-auto ml-1 text-xs leading-tight ">
          <p className="font-semibold">{username.toUpperCase()}</p>
          <div className="flex text-xs leading-3">
            <IoStar size={12} style={{ color: "gold" }} />
            <IoStar size={12} style={{ color: "gold" }} />
            <IoStar size={12} style={{ color: "gold" }} />
            <IoStar size={12} style={{ color: "gold" }} />
            <IoStar size={12} style={{ color: "gold" }} />
          </div>
          <p>{transactions}</p>
        </div>
      </div>
    </Link>
  );
};
