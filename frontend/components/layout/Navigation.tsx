/**
 * Navigation Component
 * 
 * Main navigation tabs for:
 * - Home
 * - Games
 * - Collection (requires wallet)
 * - Marketplace
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/games', label: 'Games' },
    { href: '/collection', label: 'Collection' },
    { href: '/marketplace', label: 'Marketplace' },
  ];

  return (
    <nav className="relative border-b border-neon-cyan/30 bg-white/5 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-4 px-2 border-b-2 transition-colors font-semibold font-sans ${
                  isActive
                    ? 'border-neon-cyan text-neon-cyan neon-glow-cyan'
                    : 'border-transparent text-white/80 hover:text-white hover:neon-glow-cyan'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

