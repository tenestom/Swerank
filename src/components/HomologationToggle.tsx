'use client';

import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';

interface HomologationToggleProps {
  className?: string;
  showNote?: boolean;
}

export default function HomologationToggle({ className = '', showNote = false }: HomologationToggleProps) {
  const [onlyHomologated, setOnlyHomologated] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('swerank_homologated_only');
    if (saved !== null) {
      setOnlyHomologated(saved === 'true');
    }

    // Sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'swerank_homologated_only' && e.newValue !== null) {
        setOnlyHomologated(e.newValue === 'true');
      }
    };
    
    // Sync across components in the same tab
    const handleCustomSync = () => {
      const updated = localStorage.getItem('swerank_homologated_only');
      if (updated !== null) {
        setOnlyHomologated(updated === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('swerank_homologation_sync', handleCustomSync);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('swerank_homologation_sync', handleCustomSync);
    };
  }, []);

  const handleToggle = (val: boolean) => {
    setOnlyHomologated(val);
    localStorage.setItem('swerank_homologated_only', val.toString());
    window.dispatchEvent(new Event('swerank_homologation_sync'));
  };

  if (!mounted) {
    return (
      <div className={`h-[74px] sm:h-[58px] bg-card border border-border rounded-xl animate-pulse ${className}`} />
    );
  }

  return (
    <div className={`bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${className}`}>
      <div className="space-y-1">
        <h3 className="font-bold text-sm flex items-center gap-1.5 text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          Resultatfilter
        </h3>
        <p className="text-xs text-muted">
          {showNote 
            ? "Styr tävlingshistorik och personbästa på åkarprofiler (officiell ranking visar endast homologerade)."
            : "Välj om du vill visa inofficiella/klubbtävlingar eller endast homologerade (RL/RC) resultat."}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer select-none">
        <input 
          type="checkbox" 
          checked={onlyHomologated}
          onChange={(e) => handleToggle(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
        <span className="ml-3 text-sm font-semibold text-foreground whitespace-nowrap">
          Endast homologerade tävlingar
        </span>
      </label>
    </div>
  );
}
