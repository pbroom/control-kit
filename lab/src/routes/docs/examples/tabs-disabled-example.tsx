import { Tabs, TabsContent, TabsList, TabsTrigger } from 'control-kit';

export function TabsDisabledExample() {
  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <Tabs className="w-full max-w-sm" defaultValue="overview">
        <TabsList aria-label="Project">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger disabled value="billing">
            Billing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Project summary and status.</TabsContent>
        <TabsContent value="activity">Recent project changes.</TabsContent>
        <TabsContent value="billing">Billing is unavailable.</TabsContent>
      </Tabs>
    </div>
  );
}
