import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Button, Modal, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHierarchy2 } from '@tabler/icons-react';

import type { DemoStructureDialogProps } from './types';

import FileReview from './FileReview';
import StructureTree from './StructureTree';
import { MIN_SIDEBAR_WIDTH } from './constants';
import { buildTree, clampSidebarWidth, fileKey, maxSidebarWidth } from './utils';

import styles from './index.scss';

const DemoStructureDialog = ({ structure }: DemoStructureDialogProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [readFiles, setReadFiles] = useState<Record<string, boolean>>({});
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const dragStart = useRef<{ x: number; width: number } | null>(null);
  const onReadChange = (key: string, read: boolean) =>
    setReadFiles((current) => ({ ...current, [key]: read }));

  // 文件树在 structure 稳定时只构建一次；已读勾选、拖动宽度等重渲染不再重建整棵树。
  const frontendTree = useMemo(
    () => buildTree(structure.frontend),
    [structure.frontend],
  );
  const backendTree = useMemo(
    () => (structure.backend ? buildTree(structure.backend) : null),
    [structure.backend],
  );
  const schemaTree = useMemo(
    () => (structure.schema ? buildTree(structure.schema) : null),
    [structure.schema],
  );

  const totalFiles = useMemo(
    () =>
      structure.frontend.length +
      (structure.backend?.length ?? 0) +
      (structure.schema?.length ?? 0),
    [structure],
  );
  const viewedFiles = useMemo(
    () =>
      [
        ...structure.frontend.map((file) => fileKey('frontend', file.path)),
        ...(structure.backend?.map((file) => fileKey('backend', file.path)) ??
          []),
        ...(structure.schema?.map((file) => fileKey('schema', file.path)) ??
          []),
      ].filter((key) => readFiles[key]).length,
    [structure, readFiles],
  );

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 800) {
        setSidebarWidth((width) => clampSidebarWidth(width));
      }
    };

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragStart.current = { x: event.clientX, width: sidebarWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveResize = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current) {
      setSidebarWidth(
        clampSidebarWidth(
          dragStart.current.width + event.clientX - dragStart.current.x,
        ),
      );
    }
  };

  const stopResize = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const widths: Record<string, number> = {
      ArrowLeft: sidebarWidth - 20,
      ArrowRight: sidebarWidth + 20,
      Home: MIN_SIDEBAR_WIDTH,
      End: maxSidebarWidth(),
    };

    if (event.key in widths) {
      event.preventDefault();
      setSidebarWidth(clampSidebarWidth(widths[event.key]));
    }
  };

  return (
    <>
      <Button
        leftSection={<IconHierarchy2 size={16} />}
        onClick={open}
        size="sm"
        variant="default"
      >
        代码结构
      </Button>
      <Modal
        classNames={{
          body: styles.modalBody,
          content: styles.modalContent,
          header: styles.modalHeader,
        }}
        fullScreen
        onClose={close}
        opened={opened}
        title={
          <div className={styles.modalTitle}>
            <strong>本次 Demo 的代码结构</strong>
            <Text c="dimmed" size="sm">
              已读 {viewedFiles} / {totalFiles}
            </Text>
          </div>
        }
      >
        <div
          className={styles.reviewLayout}
          style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
        >
          <nav aria-label="源码文件" className={styles.sidebar}>
            <div className={styles.sidebarInner}>
              <div className={styles.sidebarGroup}>
                <Text fw={700} size="sm">
                  前端 · apps/web
                </Text>
                <StructureTree
                  directory={frontendTree}
                  readFiles={readFiles}
                  repository="frontend"
                />
              </div>
              {structure.backend && backendTree && (
                <div className={styles.sidebarGroup}>
                  <Text fw={700} size="sm">
                    后端 · apps/api
                  </Text>
                  <StructureTree
                    directory={backendTree}
                    readFiles={readFiles}
                    repository="backend"
                  />
                </div>
              )}
              {structure.schema && schemaTree && (
                <div className={styles.sidebarGroup}>
                  <Text fw={700} size="sm">
                    契约 · packages/schema
                  </Text>
                  <StructureTree
                    directory={schemaTree}
                    readFiles={readFiles}
                    repository="schema"
                  />
                </div>
              )}
            </div>
          </nav>
          <div
            aria-label="调整文件树宽度"
            aria-orientation="vertical"
            aria-valuemax={maxSidebarWidth()}
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuenow={sidebarWidth}
            className={styles.resizer}
            onKeyDown={resizeWithKeyboard}
            onPointerCancel={stopResize}
            onPointerDown={startResize}
            onPointerMove={moveResize}
            onPointerUp={stopResize}
            role="separator"
            tabIndex={0}
            title="拖动调整文件树宽度"
          />
          <div className={styles.content}>
            <section className={styles.overview}>
              {structure.connection && (
                <div>
                  <Title order={3} size="h5">
                    前后端如何对应
                  </Title>
                  <Text size="sm">{structure.connection}</Text>
                </div>
              )}
              <div>
                <Title order={3} size="h5">
                  数据库变更
                </Title>
                <Text size="sm">{structure.database}</Text>
              </div>
            </section>
            <section className={styles.fileGroup}>
              <Title order={3} size="h5">
                前端 · apps/web
              </Title>
              {structure.frontend.map((file) => (
                <FileReview
                  file={file}
                  key={file.path}
                  onReadChange={(read) =>
                    onReadChange(fileKey('frontend', file.path), read)
                  }
                  read={readFiles[fileKey('frontend', file.path)] ?? false}
                  repository="frontend"
                />
              ))}
            </section>
            {structure.backend && (
              <section className={styles.fileGroup}>
                <Title order={3} size="h5">
                  后端 · apps/api
                </Title>
                {structure.backend.map((file) => (
                  <FileReview
                    file={file}
                    key={file.path}
                    onReadChange={(read) =>
                      onReadChange(fileKey('backend', file.path), read)
                    }
                    read={readFiles[fileKey('backend', file.path)] ?? false}
                    repository="backend"
                  />
                ))}
              </section>
            )}
            {structure.schema && (
              <section className={styles.fileGroup}>
                <Title order={3} size="h5">
                  契约 · packages/schema
                </Title>
                {structure.schema.map((file) => (
                  <FileReview
                    file={file}
                    key={file.path}
                    onReadChange={(read) =>
                      onReadChange(fileKey('schema', file.path), read)
                    }
                    read={readFiles[fileKey('schema', file.path)] ?? false}
                    repository="schema"
                  />
                ))}
              </section>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DemoStructureDialog;
