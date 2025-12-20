import { Outlet } from "react-router";
import { useSize } from "~/hooks/use-size";
import { css } from "./style.css";
import { cn } from "~/lib/utils";

export default function Analytics() {
  const size = useSize();
  return (
    <main className={cn("grid p-2 gap-2 flex-1 overflow-auto", css[size])}>
      <Outlet />
    </main>
  );
}

// function handleClickOptionRaw(
//   option: "cashflow" | "net" | "crowd" | "products",
//   interval: "daily" | "weekly" | "monthly" | "yearly",
//   setSearch: SetURLSearchParams
// ) {
//   setSearch((prev) => {
//     const search = new URLSearchParams(prev);
//     search.set("option", option);
//     switch (option) {
//       case "crowd":
//         search.set("interval", "weekly");
//         break;
//       case "products":
//         // if (interval === "yearly") {
//         // 	search.set("interval", "monthly");
//         // }
//         search.set("interval", "daily");
//         break;
//       case "net":
//       case "cashflow":
//         if (interval === "daily") {
//           search.set("interval", "weekly");
//         }
//         break;
//     }
//     return search;
//   });
// }
// const handleTime = (time: number, setSearch: SetURLSearchParams) => {
//   setSearch((prev) => {
//     const search = new URLSearchParams(prev);
//     search.set("time", time.toString());
//     return search;
//   });
// };
