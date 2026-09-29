import { Badge, Center, Stack, Text, Title } from '@mantine/core';

import type { ReactNode } from 'react';

type ResultViewProps = {
  action?: ReactNode;
  status: string;
  subTitle: string;
  title: string;
};

const ResultView = ({ action, status, subTitle, title }: ResultViewProps) => (
  <Center mih="calc(100vh - 56px)" p="xl">
    <Stack align="center" gap="sm" maw={640} ta="center">
      <Badge radius="xl" size="lg" variant="light">
        {status}
      </Badge>
      <Title order={1} size="h2">
        {title}
      </Title>
      <Text c="dimmed" lh={1.7}>
        {subTitle}
      </Text>
      {action}
    </Stack>
  </Center>
);

export default ResultView;
