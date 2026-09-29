import { Suspense, lazy, useEffect, useId, useRef, useState } from 'react';
import { Button, Checkbox, Modal, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronRight, IconFileCode, IconFolder, IconHierarchy2 } from '@tabler/icons-react';

import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';

import styles from './index.scss';

const CodeViewer = lazy(() => import('./CodeViewer'));

export type StructureFile = {
  path: string;
  role: string;
};

export type DemoStructure = {
  frontend: StructureFile[];
  backend?: StructureFile[];
  schema?: StructureFile[];
  connection?: string;
  database: string;
};

type DemoStructureDialogProps = {
  structure: DemoStructure;
};

type Directory = {
  name: string;
  directories: Map<string, Directory>;
  files: Map<string, StructureFile>;
};

const buildTree = (files: StructureFile[]): Directory => {
  const root: Directory = { name: '', directories: new Map(), files: new Map() };

  for (const { path, role } of files) {
    const segments = path.split('/');
    const name = segments[segments.length - 1];
    let directory = root;

    for (const segment of segments.slice(0, -1)) {
      let child = directory.directories.get(segment);

      if (!child) {
        child = { name: segment, directories: new Map(), files: new Map() };
        directory.directories.set(segment, child);
      }

      directory = child;
    }

    if (name) {
      directory.files.set(name, { path, role });
    }
  }

  return root;
};

type TreeProps = {
  directory: Directory;
  repository: 'frontend' | 'backend' | 'schema';
  readFiles: Record<string, boolean>;
};

const fileKey = (repository: TreeProps['repository'], path: string) => `${repository}:${path}`;
const fileId = (repository: TreeProps['repository'], path: string) => `demo-source-${encodeURIComponent(fileKey(repository, path))}`;
const minSidebarWidth = 240;
const maxSidebarWidth = () => Math.max(minSidebarWidth, Math.min(720, window.innerWidth - 320));
const clampSidebarWidth = (width: number) => Math.min(maxSidebarWidth(), Math.max(minSidebarWidth, width));

const FileReview = ({ file, repository, read, onReadChange }: {
  file: StructureFile;
  repository: TreeProps['repository'];
  read: boolean;
  onReadChange: (read: boolean) => void;
}) => {
  const [expanded, setExpanded] = useState(!read);
  const [source, setSource] = useState<string | null | undefined>(null);
  const codeId = useId();

  useEffect(() => {
    if (!expanded || source !== null) {
      return;
    }

    let active = true;

    void import('./utils/source-files').then(({ getSourceFile }) => getSourceFile(repository, file.path)).then((code) => {
      if (active) {
        setSource(code);
      }
    }).catch(() => {
      if (active) {
        setSource(undefined);
      }
    });

    return () => {
      active = false;
    };
  }, [expanded, file.path, repository, source]);

  return (
    <section className={styles.fileReview} id={fileId(repository, file.path)}>
      <div className={styles.fileHeading}>
        <button aria-controls={codeId} aria-expanded={expanded} className={styles.fileToggle} onClick={() => setExpanded(!expanded)} type="button">
          <IconChevronRight className={`${styles.chevron} ${expanded ? styles.expanded : ''}`} size={15} />
          <IconFileCode size={16} />
          <code>{file.path}</code>
        </button>
        <Checkbox
          aria-label={`${file.path} 已读`}
          checked={read}
          label="已读"
          onChange={(event) => {
            const { checked } = event.currentTarget;

            onReadChange(checked);
            setExpanded(!checked);
          }}
          size="xs"
        />
      </div>
      <Text c="dimmed" className={styles.fileRole} size="sm">{file.role}</Text>
      {expanded && (
        <div className={styles.codePanel} id={codeId}>
          {source === null && <Text c="dimmed" size="sm">加载源码中…</Text>}
          {source === undefined && <Text c="red" size="sm">源码加载失败或当前构建未包含该文件。</Text>}
          {typeof source === 'string' && (
            <Suspense fallback={<Text c="dimmed" size="sm">加载代码视图中…</Text>}>
              <CodeViewer code={source} path={file.path} />
            </Suspense>
          )}
        </div>
      )}
    </section>
  );
};

const TreeBranches = ({ directory, repository, readFiles }: TreeProps) => (
  <ul className={styles.branches}>
    {[...directory.directories.values()].map((child) => (
      <li key={child.name}>
        <details className={styles.directory} open>
          <summary className={styles.folder}>
            <IconChevronRight className={styles.chevron} size={15} />
            <IconFolder size={17} />
            <span>{child.name}</span>
          </summary>
          <TreeBranches directory={child} readFiles={readFiles} repository={repository} />
        </details>
      </li>
    ))}
    {[...directory.files.entries()].map(([name, file]) => (
      <li key={name}>
        <button
          className={`${styles.treeFile} ${readFiles[fileKey(repository, file.path)] ? styles.viewed : ''}`}
          onClick={() => document.getElementById(fileId(repository, file.path))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          title={file.path}
          type="button"
        >
          <IconFileCode size={15} />
          <span>{name}</span>
        </button>
      </li>
    ))}
  </ul>
);

const StructureTree = ({ files, repository, readFiles }: Omit<TreeProps, 'directory'> & { files: StructureFile[] }) => (
  <div className={styles.tree}>
    <TreeBranches directory={buildTree(files)} readFiles={readFiles} repository={repository} />
  </div>
);

const DemoStructureDialog = ({ structure }: DemoStructureDialogProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [readFiles, setReadFiles] = useState<Record<string, boolean>>({});
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const dragStart = useRef<{ x: number; width: number } | null>(null);
  const onReadChange = (key: string, read: boolean) => setReadFiles((current) => ({ ...current, [key]: read }));
  const totalFiles = structure.frontend.length + (structure.backend?.length ?? 0) + (structure.schema?.length ?? 0);
  const viewedFiles = [...structure.frontend.map((file) => fileKey('frontend', file.path)),
    ...(structure.backend?.map((file) => fileKey('backend', file.path)) ?? []),
    ...(structure.schema?.map((file) => fileKey('schema', file.path)) ?? [])].filter((key) => readFiles[key]).length;

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
      setSidebarWidth(clampSidebarWidth(dragStart.current.width + event.clientX - dragStart.current.x));
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
      Home: minSidebarWidth,
      End: maxSidebarWidth(),
    };

    if (event.key in widths) {
      event.preventDefault();
      setSidebarWidth(clampSidebarWidth(widths[event.key]));
    }
  };

  return (
    <>
      <Button leftSection={<IconHierarchy2 size={16} />} onClick={open} size="sm" variant="default">
        代码结构
      </Button>
      <Modal
        classNames={{ body: styles.modalBody, content: styles.modalContent, header: styles.modalHeader }}
        fullScreen
        onClose={close}
        opened={opened}
        title={<div className={styles.modalTitle}><strong>本次 Demo 的代码结构</strong><Text c="dimmed" size="sm">已读 {viewedFiles} / {totalFiles}</Text></div>}
      >
        <div className={styles.reviewLayout} style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}>
          <nav aria-label="源码文件" className={styles.sidebar}>
            <div className={styles.sidebarInner}>
              <div className={styles.sidebarGroup}>
                <Text fw={700} size="sm">前端 · study-react</Text>
                <StructureTree files={structure.frontend} readFiles={readFiles} repository="frontend" />
              </div>
              {structure.backend && (
                <div className={styles.sidebarGroup}>
                  <Text fw={700} size="sm">后端 · study-nodejs</Text>
                  <StructureTree files={structure.backend} readFiles={readFiles} repository="backend" />
                </div>
              )}
              {structure.schema && (
                <div className={styles.sidebarGroup}>
                  <Text fw={700} size="sm">契约 · study-nodejs-schema</Text>
                  <StructureTree files={structure.schema} readFiles={readFiles} repository="schema" />
                </div>
              )}
            </div>
          </nav>
          <div
            aria-label="调整文件树宽度"
            aria-orientation="vertical"
            aria-valuemax={maxSidebarWidth()}
            aria-valuemin={minSidebarWidth}
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
                  <Title order={3} size="h5">前后端如何对应</Title>
                  <Text size="sm">{structure.connection}</Text>
                </div>
              )}
              <div>
                <Title order={3} size="h5">数据库变更</Title>
                <Text size="sm">{structure.database}</Text>
              </div>
            </section>
            <section className={styles.fileGroup}>
              <Title order={3} size="h5">前端 · study-react</Title>
              {structure.frontend.map((file) => (
                <FileReview
                  file={file}
                  key={file.path}
                  onReadChange={(read) => onReadChange(fileKey('frontend', file.path), read)}
                  read={readFiles[fileKey('frontend', file.path)] ?? false}
                  repository="frontend"
                />
              ))}
            </section>
            {structure.backend && (
              <section className={styles.fileGroup}>
                <Title order={3} size="h5">后端 · study-nodejs</Title>
                {structure.backend.map((file) => (
                  <FileReview
                    file={file}
                    key={file.path}
                    onReadChange={(read) => onReadChange(fileKey('backend', file.path), read)}
                    read={readFiles[fileKey('backend', file.path)] ?? false}
                    repository="backend"
                  />
                ))}
              </section>
            )}
            {structure.schema && (
              <section className={styles.fileGroup}>
                <Title order={3} size="h5">契约 · study-nodejs-schema</Title>
                {structure.schema.map((file) => (
                  <FileReview
                    file={file}
                    key={file.path}
                    onReadChange={(read) => onReadChange(fileKey('schema', file.path), read)}
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
