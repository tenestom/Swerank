'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Waves, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Read theme from local storage or prefers-color-scheme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (preferDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const navLinks = [
    { name: 'Hem', path: '/' },
    { name: 'Rankinglistor', path: '/rankings' }
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center text-primary dark:text-primary font-extrabold text-base sm:text-lg tracking-tight">
              <span>Svensk inofficiell rankinglista</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const active = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`text-sm font-semibold transition-colors duration-200 ${
                    active 
                      ? 'text-primary dark:text-primary border-b-2 border-primary pb-1' 
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-muted-bg text-foreground hover:bg-border transition-all duration-200"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-muted-bg text-foreground hover:bg-border transition-all duration-200"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-muted hover:text-foreground"
              aria-label="Toggle Menu"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {menuOpen && (
        <div className="md:hidden border-b border-border bg-card">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const active = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    active 
                      ? 'bg-muted-bg text-primary' 
                      : 'text-muted hover:bg-muted-bg hover:text-foreground'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
