import '@mantine/code-highlight/styles.css';
import 'highlight.js/styles/github.css';

import { CodeHighlight, CodeHighlightAdapterProvider, createHighlightJsAdapter } from '@mantine/code-highlight';
import hljs from 'highlight.js/lib/core';
import plaintext from 'highlight.js/lib/languages/plaintext';
import scss from 'highlight.js/lib/languages/scss';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('plaintext', plaintext);

const highlightAdapter = createHighlightJsAdapter(hljs);

const languageFor = (path: string): string => {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) {
    return 'typescript';
  }

  if (path.endsWith('.scss')) {
    return 'scss';
  }

  if (path.endsWith('.ejs')) {
    return 'xml';
  }

  return 'plaintext';
};

const CodeViewer = ({ code, path }: { code: string; path: string }) => (
  <CodeHighlightAdapterProvider adapter={highlightAdapter}>
    <CodeHighlight code={code} copiedLabel="已复制" copyLabel="复制代码" language={languageFor(path)} withLineNumbers />
  </CodeHighlightAdapterProvider>
);

export default CodeViewer;
