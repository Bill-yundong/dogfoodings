'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  HeartPulse,
  FileText,
  Stethoscope,
  Watch,
  Settings,
  PawPrint,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { usePetLinkStore } from '@/lib/store';
import Image from 'next/image';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-primary-50 text-primary-600 font-medium'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, selectedPet, isOnline } = usePetLinkStore();

  const navItems = [
    { href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: '仪表盘' },
    { href: '/pet/001', icon: <Activity className="w-5 h-5" />, label: '实时监控' },
    { href: '/pet/001/analysis', icon: <HeartPulse className="w-5 h-5" />, label: '行为分析' },
    { href: '/pet/001/archive', icon: <FileText className="w-5 h-5" />, label: '健康档案' },
    { href: '/telemedicine', icon: <Stethoscope className="w-5 h-5" />, label: '远程医疗' },
    { href: '/devices', icon: <Watch className="w-5 h-5" />, label: '设备管理' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-100 h-screen flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <PawPrint className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-poppins font-bold text-lg text-slate-800">PetLink</h1>
            <p className="text-xs text-slate-500">智能健康监控</p>
          </div>
        </div>
      </div>

      {selectedPet && (
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src={selectedPet.avatar}
                alt={selectedPet.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary-200"
              />
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${isOnline ? 'bg-green-500' : 'bg-slate-400'} rounded-full border-2 border-white flex items-center justify-center`}>
                {isOnline ? (
                  <Wifi className="w-2 h-2 text-white" />
                ) : (
                  <WifiOff className="w-2 h-2 text-white" />
                )}
              </div>
            </div>
            <div>
              <p className="font-medium text-slate-800">{selectedPet.name}</p>
              <p className="text-xs text-slate-500">{selectedPet.breed}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <Settings className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
