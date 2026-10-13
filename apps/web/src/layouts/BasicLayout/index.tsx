import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
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
  const navigate = useNavigate();
  /*
   * 顶层分类即「领域」：headerMenus 每一项是一个领域（当前仅 tech，
   * 未来扩展 English 等新领域后该项列表随之增加）。
   */
  const realms = headerMenus;
  const [activeRealmKey, setActiveRealmKey] = useState<string | undefined>(
    () => realms[0]?.key,
  );
  const selectedRoute = useMemo(
    () => demoRoutes.find((route) => route.path === location.pathname),
    [location.pathname],
  );
  const selectedTopLevelKey =
    selectedRoute?.topLevelKey ?? activeRealmKey ?? realms[0]?.key;
  // 当前领域内的 header 段（领域内顶层 section，随领域切换而整体替换）。
  const realmHeaderMenus = realms.filter(
    (item) => item.key === activeRealmKey,
  );
  const sidebarMenus = activeRealmKey
    ? (sidebarMenusByTopLevel[activeRealmKey] ?? [])
    : [];

  const handleRealmChange = (key: string) => {
    setActiveRealmKey(key);
    const target = realms.find((item) => item.key === key);

    if (target?.path) {
      navigate(target.path);
    }
  };

  return (
    <AppShell
      className={styles.demoApp}
      header={{ height: 56 }}
      navbar={{ breakpoint: 'sm', width: 252 }}
      padding={0}
      withBorder={false}
    >
      <AppShell.Header className={styles.demoHeader}>
        <Header
          activeRealmKey={activeRealmKey}
          menus={realmHeaderMenus}
          onRealmChange={handleRealmChange}
          realms={realms}
          selectedTopLevelKey={selectedTopLevelKey}
        />
      </AppShell.Header>

      <AppShell.Navbar className={styles.demoSidebar}>
        <Sidebar
          menus={sidebarMenus}
          routes={demoRoutes}
          sectionKey={activeRealmKey}
          selectedRoute={selectedRoute}
        />
      </AppShell.Navbar>

      <AppShell.Main className={styles.demoMain}>{children}</AppShell.Main>
    </AppShell>
  );
};

export default BasicLayout;
