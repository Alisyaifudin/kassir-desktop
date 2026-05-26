import { TabsContent } from "~/components/ui/tabs";

export function TabBtn({ children, value }: { children: React.ReactNode; value: string }) {
  return (
    <TabsContent
      value={value}
      className="flex overflow-hidden w-full flex-col px-1 gap-2 grow shrink basis-0"
    >
      {children}
    </TabsContent>
  );
}