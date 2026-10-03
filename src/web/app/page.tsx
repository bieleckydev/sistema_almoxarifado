'use client';

import React from 'react';
import { Package, Layers, ShieldCheck, Smartphone, Globe, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/core/store/useAppStore';
import { formatDate, formatCurrency } from '@/core/utils/formatters';

export default function HomePage() {
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  const currentDate = formatDate(new Date().toISOString());
  const sampleBalance = formatCurrency(12450.75);

  return (
    <main className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sistema de Almoxarifado
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Arquitetura Multiplataforma: Core Agnóstico & Apresentação Especializada
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fase 1: Web First
          </span>
        </div>
      </header>

      {/* Architecture Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Card */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Core Agnóstico (src/core)</h2>
              <p className="text-xs text-slate-500">100% isolado de APIs do DOM e navegadores</p>
            </div>
          </div>
          <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <strong>api/:</strong> Axios desacoplado com injeção de Storage Adapter
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <strong>domain/:</strong> Modelos e Schemas Zod para validação
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <strong>hooks/:</strong> Custom Hooks universais (TanStack Query)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <strong>services/:</strong> Regras de negócio e chamadas de API
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <strong>store/:</strong> Estado global agnóstico via Zustand
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <strong>storage/:</strong> Contrato/Interface <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">IStorageAdapter</code>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <strong>utils/:</strong> Formatadores puros com date-fns e Intl
            </li>
          </ul>
        </div>

        {/* Presentation Card */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Apresentação Web (src/web)</h2>
              <p className="text-xs text-slate-500">Next.js App Router, Tailwind CSS e Adapters</p>
            </div>
          </div>
          <ul className="text-sm space-y-2 text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <strong>app/:</strong> Next.js App Router (Layouts e Páginas)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <strong>components/:</strong> Componentes visuais com Tailwind CSS
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <strong>adapters/:</strong> Implementação concreta do Storage (LocalStorage)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <strong>hooks/:</strong> Hooks exclusivos de navegador (ex.: useMediaQuery)
            </li>
          </ul>

          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-400">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>Pronto para Fase 2: Mobile com Expo / React Native reutilizando o Core</span>
          </div>
        </div>
      </section>

      {/* Live Test of Agnostic State & Utilities */}
      <section className="p-6 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Ambiente Inicial Configurado
          </h3>
          <p className="text-sm text-slate-500">
            Data atual ({currentDate}) • Amostra de saldo: {sampleBalance} • Estado do Store: {isSidebarOpen ? 'Sidebar Aberta' : 'Sidebar Recolhida'}
          </p>
        </div>
        <button
          onClick={toggleSidebar}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          Alternar Estado do Store
        </button>
      </section>
    </main>
  );
}
