import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { AppShell, NavLink, ScrollArea } from '@mantine/core';
import { IconChevronRight, IconPointFilled } from '@tabler/icons-react';

import type { DemoMenuItem, DemoRoute } from '@/generated/routes';

import styles from './index.scss';

type SidebarProps = {
  menus: DemoMenuItem[];
  routes: DemoRoute[];
  sectionKey?: string;
  selectedRoute?: DemoRoute;
};

type SidebarMenuItemProps = {
  item: DemoMenuItem;
  onNavigate: (item: DemoMenuItem) => void;
  selectedMenuKey?: string;
};

const SidebarMenuItem = ({
  item,
  onNavigate,
  selectedMenuKey,
}: SidebarMenuItemProps) => {
  const isSelected = item.key === selectedMenuKey;
  const hasChildren = Boolean(item.children?.length);

  if (hasChildren) {
    return (
      <NavLink
        childrenOffset="md"
        className={styles.demoSidebarLink}
        color="teal"
        defaultOpened
        label={item.label}
        leftSection={<IconChevronRight size={16} stroke={1.9} />}
        noWrap
        variant="subtle"
      >
        {item.children?.map((child) => (
          <SidebarMenuItem
            item={child}
            key={child.key}
            onNavigate={onNavigate}
            selectedMenuKey={selectedMenuKey}
          />
        ))}
      </NavLink>
    );
  }

  return (
    <NavLink
      active={isSelected}
      className={styles.demoSidebarLink}
      color="teal"
      component="button"
      label={item.label}
      leftSection={<IconPointFilled size={13} />}
      noWrap
      onClick={() => onNavigate(item)}
      type="button"
      variant="light"
    />
  );
};

const Sidebar = ({
  menus,
  routes,
  sectionKey,
  selectedRoute,
}: SidebarProps) => {
  const navigate = useNavigate();
  const routePathSet = useMemo(
    () => new Set(routes.map((route) => route.path)),
    [routes],
  );

  const handleNavigate = (item: DemoMenuItem) => {
    if (item.path && routePathSet.has(item.path)) {
      navigate(item.path);
    }
  };

  const menuContent = menus.map((item) => (
    <SidebarMenuItem
      item={item}
      key={item.key}
      onNavigate={handleNavigate}
      selectedMenuKey={selectedRoute?.menuKey}
    />
  ));

  return (
    <>
      <AppShell.Section
        aria-label="Demo pages"
        className={styles.demoSidebarDesktop}
        component="nav"
        grow
        key={sectionKey}
      >
        <ScrollArea h="100%" scrollbars="y" type="auto">
          <div className={styles.demoSidebarList}>{menuContent}</div>
        </ScrollArea>
      </AppShell.Section>

      <nav
        aria-label="Demo pages"
        className={styles.demoSidebarMobile}
        key={`${sectionKey}-mobile`}
      >
        {menuContent}
      </nav>
    </>
  );
};

export default Sidebar;
