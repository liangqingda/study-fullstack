import '@mantine/core/styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';

import App from '@/App.tsx';
import '@/styles/global.scss';

const theme = createTheme({
  defaultRadius: 'md',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Code", monospace',
  primaryColor: 'teal',
  headings: {
    fontFamily:
      '"Space Grotesk", Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.15' },
      h2: { fontSize: '1.5rem', lineHeight: '1.2' },
      h3: { fontSize: '1.15rem', lineHeight: '1.3' },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="light" theme={theme}>
      <App />
    </MantineProvider>
  </StrictMode>,
);
