'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Plus, Settings,
  LogOut, Menu, X, Building2, Users, FileCode2,
  AlertTriangle, BarChart3, ChevronRight
} from 'lucide-react';
import type { Company } from '@/types';
import clsx from 'clsx';

interface AppLayoutProps {
  children: React.ReactNode;
  company:  Company;
}

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/contracts',   label: 'Contratos',   icon: FileText },
  { href: '/providers',   label: 'Prestadores', icon: Users },
  { href: '/templates',   label: 'Templates',   icon: FileCode2 },
  { href: '/compliance',  label: 'Compliance',  icon: AlertTriangle },
  { href: '/reports',     label: 'Relatórios',  icon: BarChart3 },
  { href: '/contracts/new', label: 'Novo Contrato', icon: Plus, highlight: true },
];

const settingsItems = [
  { href: '/settings/company', label: 'Empresa', icon: Building2 },
  { href: '/settings/profile', label: 'Perfil',  icon: Settings  },
];

export function AppLayout({ children, company }: AppLayoutProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
            <Image src="/logo-icon.png" alt="ContractCore Elite" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">ContractCore Elite</div>
            <div className="text-white/40 text-2xs leading-none mt-0.5">by Zanarole</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/contracts/new' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                item.highlight
                  ? 'bg-gold-500 hover:bg-gold-400 text-white shadow-sm mt-2'
                  : active
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-4 pb-1">
          <div className="text-2xs font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">
            Configurações
          </div>
          {settingsItems.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
                )}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-white/50 hover:text-white hover:bg-white/8 rounded-xl text-sm transition-all">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-60 flex-col bg-gradient-brand fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 bg-gradient-brand flex flex-col animate-slide-right">
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <div className="lg:pl-60 flex-1 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-slate-600">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/logo-icon.png" alt="ContractCore Elite" width={20} height={20} className="object-contain" />
            <span className="font-bold text-brand-900 text-sm">ContractCore Elite</span>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
