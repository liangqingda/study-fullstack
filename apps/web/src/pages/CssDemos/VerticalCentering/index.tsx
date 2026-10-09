import { useState } from 'react';
import {
  Badge,
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
import {
  IconAlignBoxCenterMiddle,
  IconArrowsMoveVertical,
  IconBoxModel,
  IconCode,
  IconLayoutAlignMiddle,
  IconLayoutGrid,
  IconStack2,
  IconTable,
  IconTextSize,
  IconTransform,
} from '@tabler/icons-react';

import type { ReactNode } from 'react';

import type { DemoStructure } from '@/components/DemoStructureDialog';
import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import styles from './index.scss';

const structure: DemoStructure = {
  frontend: [
    { path: 'apps/web/src/pages/CssDemos/VerticalCentering/index.tsx', role: '定义六种居中方式、切换内容高度并展示对比说明。' },
    { path: 'apps/web/src/pages/CssDemos/VerticalCentering/index.scss', role: '实现各预览区域的实际 CSS 居中规则及页面样式。' },
  ],
  database: '无。此 Demo 只在浏览器内切换预览，不涉及后端接口或数据库。',
};

const knowledge = `## 先记住结论

普通内容区优先用 **flex** 或 **grid**；它们能处理未知尺寸和响应式变化。特殊场景才用 \`position\`、\`table-cell\`、\`line-height\`。

## 六种方案速查

| 方案 | 核心代码 | 适用场景 | 局限 |
| --- | --- | --- | --- |
| Flexbox | \`display:flex\` + \`align-items\` + \`justify-content\` | 元素尺寸未知、数量可变 | 改 \`flex-direction\` 后两轴职责会交换 |
| Grid | \`place-items: center\` | 单个核心内容块 | 多网格项时居中的是各自单元格 |
| Absolute + transform | \`top/left:50%\` + \`translate(-50%,-50%)\` | 浮层、徽标 | 脱离文档流，父容器不靠它撑高 |
| Position + margin auto | 定高 + \`inset-block:0\` + \`margin auto\` | 高度已知的固定块 | 需要可计算高度，内容超限会溢出 |
| Table-cell | \`display:table-cell\` + \`vertical-align\` | 旧式兼容 | 改变父容器布局模型 |
| Line-height | 行高等于容器高度 | 单行文本 | 多行 / 未知高度不适用 |

## 双轴与单轴别搞混

- flex 里 \`align-items\` 对齐**交叉轴**，\`justify-content\` 对齐**主轴**，两者都要设才双轴居中。
- \`text-align\` 管的是行内方向水平对齐，不等于垂直居中。

## 三种方案的“为什么”

1. **flex / grid**：由布局引擎在未知尺寸下算出剩余空间，天然自适应。
2. **absolute + transform**：\`50%\` 把左上角移到父容器中心，\`translate(-50%,-50%)\` 再按自身宽高回移一半，所以不依赖固定高度。
3. **line-height**：单行文本的行盒高度由 \`line-height\` 决定，行高等于容器高度时文字视觉居中；换行后每行仍占整行高，会溢出。

## 选择顺序

普通内容区 → \`flex\` / \`grid\`；覆盖层 / 悬浮块 → \`position\` + \`transform\`；单行文本 → \`line-height\`（轻但只适用单行）。切到“增高 / 换行”再看一遍预览，能更快看出哪种方案不能自适应内容。
`;

type CenteringMethod = {
  accent: string;
  code: string;
  icon: ReactNode;
  note: string;
  mechanism: string;
  observation: string;
  limitation: string;
  previewClassName: string;
  previewHint: string;
  title: string;
  usage: string;
  variant?: 'single-line' | 'table';
};

const centeringMethods: CenteringMethod[] = [
  {
    accent: 'blue',
    code: `.parent {
  display: flex;
  align-items: center;
  justify-content: center;
}`,
    icon: <IconStack2 size={20} stroke={1.8} />,
    note: '子元素尺寸未知、数量可变时优先考虑，横向和纵向对齐都稳定。',
    mechanism: 'display: flex 建立弹性布局；align-items 对齐交叉轴（这里是纵向），justify-content 对齐主轴（这里是横向）。两者结合才是双轴居中。',
    observation: '切到增高内容：白色内容块变高，但中心仍落在横向参考线上；无需提前知道子元素高度。',
    limitation: '若容器改成 flex-direction: column，两个轴的职责会交换；只设 align-items 也不会同时水平居中。',
    previewClassName: styles.previewFlex,
    previewHint: '弹性容器',
    title: 'Flexbox',
    usage: '通用布局',
  },
  {
    accent: 'teal',
    code: `.parent {
  display: grid;
  place-items: center;
}`,
    icon: <IconLayoutGrid size={20} stroke={1.8} />,
    note: '只有一个核心内容块时最简洁，place-items 同时处理两个轴。',
    mechanism: 'display: grid 建立网格；place-items: center 是 align-items 和 justify-items 的简写，让网格项在单元格内沿两个轴居中。',
    observation: '增高后，网格项仍在容器中间。这里只有一个网格项，因此整个单元格就是可用区域。',
    limitation: '有多个网格项时，它们可能占不同网格单元；place-items 居中的是各自单元里的项，不等于把整组项合成一个块居中。',
    previewClassName: styles.previewGrid,
    previewHint: '网格居中',
    title: 'Grid place-items',
    usage: '单块内容',
  },
  {
    accent: 'grape',
    code: `.parent {
  position: relative;
}

.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}`,
    icon: <IconTransform size={20} stroke={1.8} />,
    note: '适合弹层、徽标、浮动元素，不依赖子元素固定高度。',
    mechanism: 'top/left: 50% 把子元素左上角移到父容器中心；translate(-50%, -50%) 再按子元素自己的宽高向回移动一半。',
    observation: '增高后自身的 50% 距离随尺寸变化，因此内容块仍以中心点对齐参考线。',
    limitation: 'absolute 让元素脱离正常文档流，父容器不会靠它撑开高度；普通段落布局通常用 flex/grid 更合适。',
    previewClassName: styles.previewAbsolute,
    previewHint: '脱离文档流',
    title: 'Absolute + transform',
    usage: '浮层定位',
  },
  {
    accent: 'orange',
    code: `.parent {
  position: relative;
}

.child {
  position: absolute;
  inset-block: 0;
  height: 88px;
  margin-block: auto;
}`,
    icon: <IconBoxModel size={20} stroke={1.8} />,
    note: '子元素高度已知时可用，常见于固定尺寸的面板或图标块。',
    mechanism: '绝对定位后同时设置 top/bottom 为 0，并给子元素一个明确高度；上下 auto margin 平分剩余空间。',
    observation: '切到增高内容：盒子的高度仍固定为 88px，内部文字可能显得拥挤；这说明它不能像 flex/grid 那样无条件适应内容。',
    limitation: '需要可计算的高度和足够空间；内容超过固定尺寸时先调整高度或改用适应内容的布局，不要把溢出当成居中成功。',
    previewClassName: styles.previewMarginAuto,
    previewHint: '已知高度',
    title: 'Position + margin auto',
    usage: '固定尺寸',
  },
  {
    accent: 'cyan',
    code: `.parent {
  display: table-cell;
  vertical-align: middle;
  text-align: center;
}`,
    icon: <IconTable size={20} stroke={1.8} />,
    note: '老项目里很常见，处理文本块和兼容性场景时仍然可靠。',
    mechanism: 'display: table-cell 让父容器按表格单元格布局；vertical-align: middle 在单元格内部垂直对齐，text-align: center 另管水平文本对齐。',
    observation: '增高内容后，单元格会继续把内容块放在竖直中部；左右对齐来自另一条 text-align 规则。',
    limitation: '它改变了父元素的布局模型；新布局通常先用 flex/grid，但维护已有 table-cell 结构时了解它很有用。',
    previewClassName: styles.previewTable,
    previewHint: '表格单元格',
    title: 'Table-cell',
    usage: '旧式兼容',
    variant: 'table',
  },
  {
    accent: 'pink',
    code: `.parent {
  height: 178px;
  line-height: 178px;
  text-align: center;
}`,
    icon: <IconTextSize size={20} stroke={1.8} />,
    note: '只适合单行文本，内容换行后就应该换成 flex 或 grid。',
    mechanism: '单行文本的行盒高度由 line-height 决定；当行高等于容器高度时，文字在这一行内看起来竖直居中。text-align 另负责水平居中。',
    observation: '紧凑内容只有一行；切到增高内容后文字换行，每一行仍占 178px，后续行会超出容器，无法整体居中。',
    limitation: '这不是通用的元素居中：不适用于多行文本、未知高度的内容块或需要容器随内容增长的场景。',
    previewClassName: styles.previewLineHeight,
    previewHint: '单行文本',
    title: 'Line-height',
    usage: '单行文字',
    variant: 'single-line',
  },
];

const principles = [
  {
    icon: <IconLayoutAlignMiddle size={18} stroke={1.8} />,
    text: '现代页面优先用 flex 或 grid；它们能处理未知尺寸和响应式变化。',
  },
  {
    icon: <IconArrowsMoveVertical size={18} stroke={1.8} />,
    text: '只做垂直居中时保留原本的横向布局，避免无意识地改变 inline 方向。',
  },
  {
    icon: <IconAlignBoxCenterMiddle size={18} stroke={1.8} />,
    text: '绝对定位适合覆盖层；普通文档流里的内容更适合交给布局容器。',
  },
];

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
          <Group align="flex-start" gap="sm" justify="space-between">
            <Badge
              className={styles.demoKicker}
              color="blue"
              radius="xl"
              variant="light"
            >
              CSS vertical centering
            </Badge>
            <DemoStructureDialog structure={structure} />
            <DemoKnowledgeDialog content={knowledge} demoName="CSS 垂直居中方案" />
          </Group>
          <Title className={styles.demoTitle} order={1}>
            CSS 垂直居中方案
          </Title>
          <Text c="dimmed" className={styles.demoSubtitle} lh={1.7} size="lg">
            下面把常用方案放在同一个高度容器里对比：看预览判断对齐效果，
            看代码决定实际页面该用哪一种。
          </Text>
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
                  {item.icon}
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
                      {method.icon}
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
