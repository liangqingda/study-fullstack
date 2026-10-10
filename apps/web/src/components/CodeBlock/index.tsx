import '@mantine/code-highlight/styles.css';

import { CodeHighlight, CodeHighlightAdapterProvider, createHighlightJsAdapter } from '@mantine/code-highlight';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

import styles from './index.scss';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('plaintext', plaintext);

const highlightAdapter = createHighlightJsAdapter(hljs);

/** 支持显式识别的高亮语言。 */
const KNOWN_LANGUAGES = ['typescript', 'scss', 'xml', 'json', 'sql', 'plaintext'] as const;

type KnownLanguage = (typeof KNOWN_LANGUAGES)[number];

/** 根据文件路径的扩展名推断高亮语言。 */
const languageForPath = (path: string): KnownLanguage => {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) {
    return 'typescript';
  }

  if (path.endsWith('.scss')) {
    return 'scss';
  }

  if (path.endsWith('.ejs')) {
    return 'xml';
  }

  if (path.endsWith('.json')) {
    return 'json';
  }

  if (path.endsWith('.sql')) {
    return 'sql';
  }

  return 'plaintext';
};

/** 通过代码内容自动探测高亮语言。 */
const detectLanguage = (code: string): KnownLanguage => {
  const { language } = hljs.highlightAuto(code, [...KNOWN_LANGUAGES]);

  return language && hljs.getLanguage(language) ? (language as KnownLanguage) : 'plaintext';
};

type CodeBlockProps = {
  /** 要高亮的源代码。 */
  code: string;
  /** 源文件路径，用于按扩展名推断语言；未显式指定 language 时生效。 */
  path?: string;
  /** 显式指定高亮语言，优先级高于 path 推断与自动探测。 */
  language?: KnownLanguage;
  /** 是否显示行号。 */
  withLineNumbers?: boolean;
  /** 是否显示复制按钮。 */
  withCopyButton?: boolean;
  /** 是否使用贴合的裸模式（去掉边框/圆角/底色），用于嵌入已有卡片容器。 */
  bare?: boolean;
  /** 代码卡片的可访问标签。 */
  label?: string;
};

const CodeBlock = ({ code, path, language, withLineNumbers = true, withCopyButton = true, bare = false, label }: CodeBlockProps) => {
  const resolved = language ?? (path ? languageForPath(path) : detectLanguage(code));

  return (
    <div aria-label={label} className={`${styles.codeBlock} ${bare ? styles.bare : ''}`} data-bare={bare || undefined} role="group">
      <CodeHighlightAdapterProvider adapter={highlightAdapter}>
        <CodeHighlight
          code={code}
          copiedLabel="已复制"
          copyLabel="复制代码"
          language={resolved}
          withCopyButton={withCopyButton}
          withLineNumbers={withLineNumbers}
        />
      </CodeHighlightAdapterProvider>
    </div>
  );
};

export default CodeBlock;
