// import { useMemo } from "react";
// import { useSearchParams } from "react-router";
// import { z } from "zod";

// export function useTab() {
//   const [search, setSearch] = useSearchParams();
//   const tab = useMemo(() => {
//     const tab = z.enum(["detail", "image", "performance"]).catch("detail").parse(search.get("tab"));
//     return tab;
//   }, [search]);
//   const setTab = (tab: string) => {
//     setSearch((prev) => {
//       const search = new URLSearchParams(prev);
//       search.set("tab", tab);
//       return search;
//     });
//   };
//   return [tab, setTab] as const;
// }
