import React from "react";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  onCreateEntry?: () => void;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, onCreateEntry, className }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <Header onCreateEntry={onCreateEntry} />
      <main className={cn("max-w-7xl mx-auto px-4 sm:px-6 py-8", className)}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
