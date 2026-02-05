/**
 * Layout Wrapper Component
 *
 * Conditionally renders Header/Footer based on the current route.
 * White-label routes (like /store-fun) have their own layouts.
 */

"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Header from "./Header";

// Routes that use their own layout (no default Header/Footer)
const WHITELABEL_ROUTES = ["/store-fun"];

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Check if current route is a whitelabel route
  const isWhitelabel = WHITELABEL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isWhitelabel) {
    // Whitelabel routes render their own layout via nested layout.tsx
    return <div className="flex flex-col min-h-screen">{children}</div>;
  }

  // Default layout with Header and Footer
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="relative flex-1">{children}</main>
      <Footer />
    </div>
  );
}
