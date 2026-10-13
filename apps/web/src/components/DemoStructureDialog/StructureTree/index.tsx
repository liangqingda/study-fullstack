import { IconChevronRight, IconFileCode, IconFolder } from '@tabler/icons-react';

import type { TreeProps } from '../types';

import { fileId, fileKey } from '../utils';

import styles from './index.scss';

/* 递归渲染目录分支：文件夹可折叠，文件点击滚动到审阅区对应位置。 */
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
          <TreeBranches
            directory={child}
            readFiles={readFiles}
            repository={repository}
          />
        </details>
      </li>
    ))}
    {[...directory.files.entries()].map(([name, file]) => (
      <li key={name}>
        <button
          className={`${styles.treeFile} ${readFiles[fileKey(repository, file.path)] ? styles.viewed : ''}`}
          onClick={() =>
            document
              .getElementById(fileId(repository, file.path))
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
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

const StructureTree = ({ directory, repository, readFiles }: TreeProps) => (
  <div className={styles.tree}>
    <TreeBranches
      directory={directory}
      readFiles={readFiles}
      repository={repository}
    />
  </div>
);

export default StructureTree;
