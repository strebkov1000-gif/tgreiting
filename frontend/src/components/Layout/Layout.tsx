import { ReactNode } from 'react';
import Header from './Header';
import IcyNavigation from './IcyNavigation';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a1929] via-[#0d2137] to-[#0a1929]">
      {/* Arctic background pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
      </div>

      <Header />
      <main className="relative flex-1 pb-24 overflow-y-auto smooth-scroll">
        {children}
      </main>
      <IcyNavigation />
    </div>
  );
}
