import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { AppShell } from './_components/app-shell';

export const metadata: Metadata = {
  description:
    'JagrukSetu helps citizens report, discover and follow civic issues through Local Wellness.',
  title: {
    default: 'JagrukSetu',
    template: '%s · JagrukSetu',
  },
};

type RootLayoutProperties = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProperties) {
  return (
    <html lang="en-GB">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
