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
  AlertTriangle, BarChart3, ClipboardList,
} from 'lucide-react';
import { AssistantChat } from '@/components/layout/AssistantChat';
import type { Company } from '@/types';
import clsx from 'clsx';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children:          React.ReactNode;
  company:           Company;
  /** Desabilita o assistente global. Use `true` em páginas que renderizam
   *  seu próprio <AssistantChat /> contextualizado (ex: Novo Contrato).
   *  Garante que não existam dois botões flutuantes simultâneos. */
  disableAssistant?: boolean;
}

// ─── Estrutura do menu em grupos ──────────────────────────────────────────────

interface NavItem {
  href:       string;
  label:      string;
  icon:       React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  secondary?: boolean;
}

interface NavGroup {
  title?:   string;   // undefined = sem cabeçalho de grupo
  items:    NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Contratos de Prestadores',
    items: [
      { href: '/contracts',    label: 'Contratos',    icon: FileText  },
      { href: '/providers',    label: 'Prestadores',  icon: Users     },
      { href: '/templates',    label: 'Templates',    icon: FileCode2 },
      { href: '/compliance',   label: 'Compliance',   icon: AlertTriangle },
      { href: '/reports',      label: 'Relatórios',   icon: BarChart3 },
      { href: '/contracts/new',label: 'Novo Contrato',icon: Plus,        highlight: true },
    ],
  },
  {
    title: 'Termos de Pacientes',
    items: [
      { href: '/patient-terms', label: 'Termos de Pacientes', icon: ClipboardList },
      { href: '/patients',      label: 'Pacientes',           icon: Users },
      { href: '/patient-terms/new', label: 'Novo Termo',      icon: ClipboardList, highlight: true, secondary: true },
    ],
  },
];

const settingsItems: NavItem[] = [
  { href: '/settings/company', label: 'Empresa', icon: Building2 },
  { href: '/settings/profile', label: 'Perfil',  icon: Settings  },
];

// ─── Lógica de rota ativa ─────────────────────────────────────────────────────

function isActive(href: string, pathname: string, highlight?: boolean): boolean {
  if (highlight) return false; // botões de ação nunca ficam ativos
  if (href === '/dashboard') return pathname === '/dashboard';
  // /patients não deve ativar /patient-terms (prefixo compartilhado)
  if (href === '/patients') {
    return pathname === '/patients' || /^\/patients\//.test(pathname);
  }
  return pathname === href || pathname.startsWith(href + '/');
}

// ─── Mapeamento de rota → label legível para o Assistente ────────────────────

function resolvePageContext(pathname: string): string {
  if (pathname === '/dashboard')                               return 'Dashboard';
  if (pathname === '/contracts/new')                           return 'Novo Contrato';
  if (pathname === '/contracts' || pathname === '/contracts/') return 'Lista de Contratos';
  if (/^\/contracts\/[^/]+\/versions/.test(pathname))         return 'Histórico de Versões';
  if (/^\/contracts\/[^/]+/.test(pathname))                   return 'Detalhe do Contrato';
  if (pathname === '/providers')                               return 'Prestadores';
  if (/^\/providers\//.test(pathname))                        return 'Detalhe do Prestador';
  // Termos de Pacientes — verificar antes de /patients para evitar match parcial
  if (pathname === '/patient-terms/new')                       return 'Novo Termo de Paciente';
  if (pathname === '/patient-terms' || pathname === '/patient-terms/') return 'Lista de Termos de Pacientes';
  if (/^\/patient-terms\/[^/]+/.test(pathname))               return 'Detalhe do Termo de Paciente';
  // Pacientes
  if (pathname === '/patients' || pathname === '/patients/')   return 'Lista de Pacientes';
  if (/^\/patients\/[^/]+/.test(pathname))                    return 'Detalhe do Paciente';
  if (pathname === '/templates')                               return 'Templates';
  if (pathname === '/compliance')                              return 'Compliance';
  if (pathname === '/reports')                                 return 'Relatórios';
  if (pathname === '/settings/company')                        return 'Configurações da Empresa';
  if (pathname === '/settings/profile')                        return 'Perfil do Usuário';
  return 'ContractCore Elite';
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AppLayout({ children, company, disableAssistant }: AppLayoutProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const pageContext = resolvePageContext(pathname);

  // ── Sidebar ──
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

      {/* Nav por grupos */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'pt-3' : ''}>
            {group.title && (
              <div className="text-2xs font-semibold text-white/30 uppercase tracking-widest px-3 mb-1.5">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.href, pathname, item.highlight);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      item.highlight && !item.secondary
                        ? 'bg-gold-500 hover:bg-gold-400 text-white shadow-sm mt-2'
                        : item.highlight && item.secondary
                        ? 'bg-emerald-700 hover:bg-emerald-600 text-white/95 shadow-sm mt-1'
                        : active
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Configurações */}
        <div className="pt-3 border-t border-white/10 mt-2">
          <div className="text-2xs font-semibold text-white/30 uppercase tracking-widest px-3 mb-1.5">
            Configurações
          </div>
          <div className="space-y-0.5">
            {settingsItems.map(item => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-white/50 hover:text-white hover:bg-white/8 rounded-xl text-sm transition-all"
        >
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-64 bg-gradient-brand flex flex-col animate-slide-right">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <div className="lg:pl-60 flex-1 flex flex-col min-h-screen">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-600"
            aria-label="Abrir menu"
          >
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

      {/* Assistente flutuante global */}
      {!disableAssistant && (
        <AssistantChat pageContext={pageContext} />
      )}
    </div>
  );
}
