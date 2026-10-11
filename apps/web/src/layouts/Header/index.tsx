import { useNavigate } from 'react-router';
import {
  ActionIcon,
  Group,
  SegmentedControl,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconBrandGithub,
  IconMoon,
  IconSun,
  IconTerminal2,
} from '@tabler/icons-react';

import type { DemoMenuItem } from '@/generated/routes';

import styles from './index.scss';

type HeaderProps = {
  menus: DemoMenuItem[];
  selectedTopLevelKey?: string;
};

const Header = ({ menus, selectedTopLevelKey }: HeaderProps) => {
  const navigate = useNavigate();
  const { setColorScheme } = useMantineColorScheme();
  const isDark = useComputedColorScheme('light') === 'dark';
  const activeMenuKey = selectedTopLevelKey ?? menus[0]?.key;
  const menuData = menus.map((item) => ({
    label: item.label,
    value: item.key,
  }));

  const handleMenuChange = (value: string) => {
    const nextMenu = menus.find((item) => item.key === value);

    if (nextMenu?.path) {
      navigate(nextMenu.path);
    }
  };

  return (
    <Group className={styles.demoHeaderInner} gap="lg" h="100%" wrap="nowrap">
      <Group className={styles.demoHeaderBrand} gap="sm" wrap="nowrap">
        <span aria-hidden="true" className={styles.brandMark}>
          <IconTerminal2 size={19} stroke={2.1} />
        </span>
        <div className={styles.brandText}>
          <Title className={styles.demoTitle} order={1}>
            Study Lab
          </Title>
          <Text className={styles.brandTagline} component="span">
            fullstack demos
          </Text>
        </div>
      </Group>

      {activeMenuKey && menuData.length > 0 ? (
        <nav aria-label="Demo sections" className={styles.demoHeaderMenu}>
          <SegmentedControl
            className={styles.demoHeaderSegments}
            color="teal"
            data={menuData}
            onChange={handleMenuChange}
            radius="md"
            size="sm"
            value={activeMenuKey}
          />
        </nav>
      ) : null}
      <ActionIcon
        aria-label="查看源码仓库"
        className={styles.githubLink}
        component="a"
        href="https://github.com/liangqingda/study-fullstack"
        size="lg"
        target="_blank"
        title="查看源码仓库"
        variant="subtle"
      >
        <IconBrandGithub size={20} />
      </ActionIcon>
      <ActionIcon
        aria-label={isDark ? '切换到亮色主题' : '切换到暗色主题'}
        className={styles.themeToggle}
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
        size="lg"
        title={isDark ? '切换到亮色主题' : '切换到暗色主题'}
        variant="subtle"
      >
        {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
      </ActionIcon>
    </Group>
  );
};

export default Header;
