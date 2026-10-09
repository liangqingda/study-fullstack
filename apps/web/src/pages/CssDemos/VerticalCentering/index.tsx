import { useState } from 'react';
import {
  Card,
  Code,
  Container,
  Group,
  Kbd,
  List,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlignBoxCenterMiddle, IconCode, IconLayoutAlignMiddle } from '@tabler/icons-react';

import type { CenteringMethod } from './types';

import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import { centeringMethods, knowledge, principles, structure } from './constants';

import styles from './index.scss';

const renderPreviewTarget = (method: CenteringMethod, tall: boolean) => {
  if (method.variant === 'single-line') {
    return <strong className={styles.singleLineText}>{tall ? <>第一行<br />第二行</> : method.previewHint}</strong>;
  }

  return (
    <div className={`${styles.previewTarget} ${tall ? styles.previewTargetTall : ''}`}>
      <strong>{method.previewHint}</strong>
      <span>{tall ? '多行内容：高度增加后再观察中心位置' : '内容高度未知'}</span>
    </div>
  );
};

const renderPreview = (method: CenteringMethod, tall: boolean) => {
  if (method.variant === 'table') {
    return (
      <div className={`${styles.previewFrame} ${method.previewClassName}`}>
        <div className={styles.previewTableCell}>
          {renderPreviewTarget(method, tall)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.previewFrame} ${method.previewClassName}`}>
      {renderPreviewTarget(method, tall)}
    </div>
  );
};

const VerticalCenteringDemo = () => {
  const [tall, setTall] = useState(false);

  return (
  <main className={styles.centeringDemo}>
    <Container className={styles.centeringShell} size="xl">
      <Stack gap="xl">
        <header className={styles.demoHeader}>
          <div>
            <Title className={styles.demoTitle} order={1}>
              CSS 垂直居中方案
            </Title>
            <Text c="dimmed" className={styles.demoSubtitle} lh={1.7} size="lg">
              下面把常用方案放在同一个高度容器里对比：看预览判断对齐效果，
              看代码决定实际页面该用哪一种。
            </Text>
          </div>
          <Group gap="sm" justify="flex-end">
            <DemoStructureDialog structure={structure} />
            <DemoKnowledgeDialog content={knowledge} demoName="CSS 垂直居中方案" />
          </Group>
        </header>

        <section className={styles.summaryBand}>
          <div className={styles.summaryLead}>
            <ThemeIcon color="indigo" radius="md" size={42} variant="light">
              <IconCode size={22} stroke={1.8} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" fw={700} size="xs" tt="uppercase">
                quick choice
              </Text>
              <Text className={styles.summaryTitle} fw={800}>
                不确定时先用 <Kbd>display: grid</Kbd> 或{' '}
                <Kbd>display: flex</Kbd>
              </Text>
            </div>
          </div>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            {principles.map((item) => (
              <div className={styles.principleItem} key={item.text}>
                <ThemeIcon color="gray" radius="md" size={32} variant="light">
                  <item.icon size={18} stroke={1.8} />
                </ThemeIcon>
                <Text c="dimmed" lh={1.55} size="sm">
                  {item.text}
                </Text>
              </div>
            ))}
          </SimpleGrid>
          <div className={styles.previewControl}>
            <Text fw={700} size="sm">预览内容尺寸</Text>
            <SegmentedControl aria-label="预览内容尺寸" data={[{ label: '紧凑', value: 'compact' }, { label: '增高 / 换行', value: 'tall' }]} onChange={(value) => setTall(value === 'tall')} value={tall ? 'tall' : 'compact'} />
          </div>
        </section>

        <SimpleGrid
          className={styles.methodGrid}
          cols={{ base: 1, md: 2, xl: 3 }}
          spacing="lg"
          verticalSpacing="lg"
        >
          {centeringMethods.map((method) => (
            <Card
              className={styles.methodCard}
              key={method.title}
              padding="lg"
              radius="md"
              shadow="sm"
              withBorder
            >
              <Stack gap="md">
                <Group gap="sm" justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                      color={method.accent}
                      radius="md"
                      size={38}
                      variant="light"
                    >
                      <method.icon size={20} stroke={1.8} />
                    </ThemeIcon>
                    <div className={styles.methodHeading}>
                      <Title order={2} size="h4">
                        {method.title}
                      </Title>
                      <Text c="dimmed" fw={700} size="xs" tt="uppercase">
                        {method.usage}
                      </Text>
                    </div>
                  </Group>
                </Group>

                {renderPreview(method, tall)}

                <Text c="dimmed" lh={1.65} size="sm">
                  {method.note}
                </Text>

                <div className={styles.methodLesson}>
                  <h3>为什么能居中</h3><Text size="sm">{method.mechanism}</Text>
                  <h3>切换尺寸看什么</h3><Text size="sm">{method.observation}</Text>
                  <h3>什么时候不适合</h3><Text size="sm">{method.limitation}</Text>
                </div>

                <Code block className={styles.codeBlock}>
                  {method.code}
                </Code>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>

        <section className={styles.notesBand}>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon color="blue" radius="md" size={36} variant="light">
              <IconAlignBoxCenterMiddle size={20} stroke={1.8} />
            </ThemeIcon>
            <Title order={2} size="h3">
              选择顺序
            </Title>
          </Group>

          <List
            center
            className={styles.notesList}
            icon={
              <ThemeIcon color="blue" radius="xl" size={20} variant="light">
                <IconLayoutAlignMiddle size={13} stroke={2} />
              </ThemeIcon>
            }
            spacing="sm"
          >
            <List.Item>
              普通内容区：优先 <Kbd>flex</Kbd> 或 <Kbd>grid</Kbd>。
            </List.Item>
            <List.Item>
              覆盖层和悬浮块：用 <Kbd>position</Kbd> 搭配{' '}
              <Kbd>transform</Kbd>。
            </List.Item>
            <List.Item>
              单行文本：<Kbd>line-height</Kbd> 可以很轻，但不要拿它处理多行。
            </List.Item>
          </List>
        </section>
      </Stack>
    </Container>
  </main>
  );
};

export default VerticalCenteringDemo;
