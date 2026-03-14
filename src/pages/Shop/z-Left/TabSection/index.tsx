import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Suspense } from "react";
import { Content } from "./z-Content";

export function TabSection() {
  return (
    <Tabs
      defaultValue="auto"
      className="w-full grow shrink basis-0 items-start flex flex-col overflow-hidden"
    >
      <div className="flex items-center flex-wrap justify-between w-full">
        <TabsList>
          <TabsTrigger type="button" value="auto">
            Otomatis
          </TabsTrigger>
          <TabsTrigger type="button" value="man">
            Manual
          </TabsTrigger>
          <TabsTrigger type="button" value="add">
            Tambahan
          </TabsTrigger>
        </TabsList>
      </div>
      <Suspense>
        <Content />
      </Suspense>
    </Tabs>
  );
}
