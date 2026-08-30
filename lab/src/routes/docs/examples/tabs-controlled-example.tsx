import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@color-kit/control-kit';

export function TabsControlledExample() {
  const [tab, setTab] = useState('canvas');

  return (
    <div className="flex min-h-[280px] items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Settings">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          <TabsContent value="canvas">Canvas settings</TabsContent>
          <TabsContent value="export">Export settings</TabsContent>
        </Tabs>
        <p className="text-muted-foreground mt-3 text-xs">Active tab: {tab}</p>
      </div>
    </div>
  );
}
