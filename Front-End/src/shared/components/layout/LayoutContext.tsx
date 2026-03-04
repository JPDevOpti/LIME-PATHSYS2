'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type LayoutContextValue = {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  toggleSidebarCollapse: () => void;
  isSidebarHovered: boolean;
  setSidebarHovered: (value: boolean) => void;
};

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

type LayoutProviderProps = {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
  defaultDesktopSidebarCollapsed?: boolean;
};

function LayoutProvider({
  children,
  defaultSidebarOpen = false,
  defaultDesktopSidebarCollapsed = false,
}: LayoutProviderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(defaultSidebarOpen);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(defaultDesktopSidebarCollapsed);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);
  const collapseSidebar = useCallback(() => setIsSidebarCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsSidebarCollapsed(false), []);
  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);
  const setSidebarHovered = useCallback((value: boolean) => {
    setIsSidebarHovered(value);
  }, []);

  const value = useMemo<LayoutContextValue>(
    () => ({
      isSidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      isSidebarCollapsed,
      collapseSidebar,
      expandSidebar,
      toggleSidebarCollapse,
      isSidebarHovered,
      setSidebarHovered,
    }),
    [
      isSidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      isSidebarCollapsed,
      collapseSidebar,
      expandSidebar,
      toggleSidebarCollapse,
      isSidebarHovered,
      setSidebarHovered,
    ],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

function useLayoutContext() {
  const context = useContext(LayoutContext);

  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }

  return context;
}

export { LayoutProvider, useLayoutContext };
