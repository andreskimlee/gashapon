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
    <nav className="relative bg-white/70 backdrop-blur-sm border-b border-pastel-pink/30">
      <div className="container mx-auto px-4">
        <div className="flex space-x-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`py-3 px-3 border-b-2 transition-colors font-medium font-sans text-sm ${
                  isActive
                    ? 'border-pastel-coral text-pastel-coral'
                    : 'border-transparent text-pastel-text hover:text-pastel-coral hover:border-pastel-coralLight'
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

