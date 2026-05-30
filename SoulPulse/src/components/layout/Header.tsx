import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAppStore } from "@/store/appStore";
import {
  Shield,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onCreateEntry?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onCreateEntry }) => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { lock, entries } = useAppStore();

  const navItems = [
    { href: "/", label: "日记", icon: FileText },
    { href: "/dashboard", label: "仪表盘", icon: BarChart3 },
    { href: "/settings", label: "设置", icon: Settings },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              SoulPulse
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <form onSubmit={handleSearch} className="relative mr-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索日记..."
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 w-64"
              />
            </form>

            {navItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {onCreateEntry && (
              <button
                onClick={onCreateEntry}
                className="ml-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-primary-500/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                写日记
              </button>
            )}

            <button
              onClick={lock}
              className="ml-2 p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              title="锁定应用"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-xl"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <form onSubmit={handleSearch} className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索日记..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
              />
            </form>

            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium",
                      isActive
                        ? "bg-primary-50 text-primary-600"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {onCreateEntry && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onCreateEntry();
                }}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium"
              >
                <Plus className="w-5 h-5" />
                写日记
              </button>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                lock();
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-medium"
            >
              <LogOut className="w-5 h-5" />
              锁定应用
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
