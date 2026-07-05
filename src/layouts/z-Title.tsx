import { Link } from "react-router";

export function TitleText({ useName }: { useName: () => string }) {
  const name = useName();
  return (
    <div className="hidden lg:block ml-4 border-l pl-4 border-black/20">
      <Link title={name} to="/" className="text-normal font-medium italic opacity-80">
        {name.slice(0, 16)}
      </Link>
    </div>
  );
}
