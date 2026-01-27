/**
 * Footer Component
 *
 * Site-wide footer with:
 * - Navigation links (About, Support, Terms)
 * - Social media link (X/Twitter)
 */

export default function Footer() {
  return (
    <footer className="relative py-4 px-4 border-t border-pastel-pink/30 bg-white/50">
      <div className="container mx-auto">
        <div className="flex justify-center items-center gap-4 text-sm text-pastel-text">
          <a href="/about" className="hover:text-pastel-coral transition-colors">About</a>
          <a href="/support" className="hover:text-pastel-coral transition-colors">Support</a>
          <a href="/terms" className="hover:text-pastel-coral transition-colors">Terms</a>
          <a 
            href="https://x.com/Grabbitdotfun" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-pastel-text hover:text-pastel-coral transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
