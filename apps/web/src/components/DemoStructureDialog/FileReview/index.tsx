import { useEffect, useId, useState } from 'react';
import { Checkbox, Text } from '@mantine/core';
import { IconChevronRight, IconFileCode } from '@tabler/icons-react';

import type { FileReviewProps } from '../types';

import CodeBlock from '@/components/CodeBlock';

import { fileId } from '../utils';

import styles from './index.scss';

const FileReview = ({
  file,
  repository,
  read,
  onReadChange,
}: FileReviewProps) => {
  const [expanded, setExpanded] = useState(!read);
  const [source, setSource] = useState<string | null | undefined>(null);
  const codeId = useId();

  useEffect(() => {
    if (!expanded || source !== null) {
      return;
    }

    let active = true;

    void import('../utils/source-files')
      .then(({ getSourceFile }) => getSourceFile(repository, file.path))
      .then((code) => {
        if (active) {
          setSource(code);
        }
      })
      .catch(() => {
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
        <button
          aria-controls={codeId}
          aria-expanded={expanded}
          className={styles.fileToggle}
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          <IconChevronRight
            className={`${styles.chevron} ${expanded ? styles.expanded : ''}`}
            size={15}
          />
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
      <Text c="dimmed" className={styles.fileRole} size="sm">
        {file.role}
      </Text>
      {expanded && (
        <div className={styles.codePanel} id={codeId}>
          {source === null && (
            <Text c="dimmed" size="sm">
              加载源码中…
            </Text>
          )}
          {source === undefined && (
            <Text c="red" size="sm">
              源码加载失败或当前构建未包含该文件。
            </Text>
          )}
          {typeof source === 'string' && (
            <CodeBlock
              bare
              code={source}
              label={`${file.path} 源码`}
              path={file.path}
            />
          )}
        </div>
      )}
    </section>
  );
};

export default FileReview;
