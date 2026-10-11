import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { AppShell } from '@mantine/core';

import type { ReactNode } from 'react';

import {
  demoRoutes,
  headerMenus,
  sidebarMenusByTopLevel,
} from '@/generated/routes';
import Header from '@/layouts/Header';
import Sidebar from '@/layouts/Sidebar';

import styles from './index.scss';

type BasicLayoutProps = {
  children: ReactNode;
};

const BasicLayout = ({ children }: BasicLayoutProps) => {
  const location = useLocation();
  const selectedRoute = useMemo(
    () => demoRoutes.find((route) => route.path === location.pathname),
    [location.pathname],
  );
  const selectedTopLevelKey = selectedRoute?.topLevelKey ?? headerMenus[0]?.key;
  const sidebarMenus = selectedTopLevelKey
    ? (sidebarMenusByTopLevel[selectedTopLevelKey] ?? [])
    : [];

  return (
    <AppShell
      className={styles.demoApp}
      header={{ height: 56 }}
      navbar={{ breakpoint: 'sm', width: 252 }}
      padding={0}
      withBorder={false}
    >
      <AppShell.Header className={styles.demoHeader}>
        <Header menus={headerMenus} selectedTopLevelKey={selectedTopLevelKey} />
      </AppShell.Header>

      <AppShell.Navbar className={styles.demoSidebar}>
        <Sidebar
          menus={sidebarMenus}
          routes={demoRoutes}
          sectionKey={selectedTopLevelKey}
          selectedRoute={selectedRoute}
        />
      </AppShell.Navbar>

      <AppShell.Main className={styles.demoMain}>{children}</AppShell.Main>
    </AppShell>
  );
};

export default BasicLayout;
