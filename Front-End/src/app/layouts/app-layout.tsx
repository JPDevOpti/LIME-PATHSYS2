import type { ReactNode } from 'react';

import { LayoutShell } from '@/shared/components/layout';
import { AppHeader, AppSidebar } from '@/shared/components/navigation';

type AppLayoutProps = {
  children: ReactNode;
};

function AppLayout({ children }: AppLayoutProps) {
  return (
    <LayoutShell header={<AppHeader />} sidebar={<AppSidebar />}>
      {children}
    </LayoutShell>
  );
}

export { AppLayout };
