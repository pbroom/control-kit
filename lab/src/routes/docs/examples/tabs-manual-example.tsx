import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@color-kit/control-kit';

export function TabsManualExample() {
  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <Tabs
        activationMode="manual"
        className="w-full max-w-sm"
        defaultValue="local"
      >
        <TabsList aria-label="Storage location">
          <TabsTrigger value="local">Local</TabsTrigger>
          <TabsTrigger value="cloud">Cloud</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>
        <TabsContent value="local">Saved on this device.</TabsContent>
        <TabsContent value="cloud">
          Synced across signed-in devices.
        </TabsContent>
        <TabsContent value="archive">Stored for long-term access.</TabsContent>
      </Tabs>
    </div>
  );
}
