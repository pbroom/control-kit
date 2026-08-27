import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@color-kit/control-kit';

export function TabsExample() {
  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <Tabs className="w-full max-w-sm" defaultValue="canvas">
        <TabsList aria-label="Settings">
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        <TabsContent value="canvas">
          Configure the canvas grid, guides, and snapping behavior.
        </TabsContent>
        <TabsContent value="export">
          Choose the output format, scale, and color profile.
        </TabsContent>
      </Tabs>
    </div>
  );
}
