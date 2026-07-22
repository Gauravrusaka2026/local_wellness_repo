'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { CivicIcon } from './icons';
import { citizenNavigationItems, isCitizenNavigationItemActive } from './navigation';

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const isAuthenticationPage = pathname.startsWith('/auth/');

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link aria-label="JagrukSetu home" className="brand-lockup" href="/">
            <span aria-hidden="true" className="brand-logo-slot" />
            <span className="brand-copy">
              <strong>JagrukSetu</strong>
              <small>Civic issues, clearly tracked</small>
            </span>
          </Link>
          <nav aria-label="Primary navigation" className="top-navigation">
            {citizenNavigationItems.map((item) => {
              const active = isCitizenNavigationItemActive(pathname, item.href);
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'top-navigation-link is-active' : 'top-navigation-link'}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link className="header-report-link" href="/report">
            <CivicIcon aria-hidden="true" name="camera" />
            Report an issue
          </Link>
        </div>
      </header>
      <div className="app-content" id="main-content" tabIndex={-1}>
        {children}
      </div>
      {isAuthenticationPage ? null : (
        <nav aria-label="Mobile navigation" className="bottom-navigation">
          {citizenNavigationItems
            .filter((item) => item.mobile)
            .map((item) => {
              const active = isCitizenNavigationItemActive(pathname, item.href);
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'bottom-navigation-link is-active' : 'bottom-navigation-link'}
                  href={item.href}
                  key={item.href}
                >
                  <span
                    className={
                      item.href === '/report'
                        ? 'bottom-navigation-icon report'
                        : 'bottom-navigation-icon'
                    }
                  >
                    <CivicIcon aria-hidden="true" name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>
      )}
      <footer className="app-footer">
        <div>
          <strong>JagrukSetu</strong>
          <p>Report, understand and follow civic action with privacy-protected evidence.</p>
        </div>
        <div className="app-footer-links">
          <Link href="/directory">Governing bodies</Link>
          <Link href="/transparency">Public reports</Link>
          <span>Not for emergencies · call 112</span>
        </div>
      </footer>
    </div>
  );
}
