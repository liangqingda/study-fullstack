import { Button, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBook2 } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from './index.scss';

type DemoKnowledgeDialogProps = {
  /** 知识点讲解内容，使用 Markdown 编写。 */
  content: string;
  /** 弹窗标题中展示的 Demo 名称。 */
  demoName: string;
};

const DemoKnowledgeDialog = ({ content, demoName }: DemoKnowledgeDialogProps) => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button leftSection={<IconBook2 size={16} />} onClick={open} size="sm" variant="default">
        知识点讲解
      </Button>
      <Modal
        classNames={{ body: styles.modalBody, content: styles.modalContent, header: styles.modalHeader }}
        fullScreen
        onClose={close}
        opened={opened}
        title={
          <div className={styles.modalTitle}>
            <strong>{demoName} · 知识点讲解</strong>
            <Text c="dimmed" size="sm">Markdown</Text>
          </div>
        }
      >
        <article className={styles.markdown}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </Modal>
    </>
  );
};

export default DemoKnowledgeDialog;
