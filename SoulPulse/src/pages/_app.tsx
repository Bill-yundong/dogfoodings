import React, { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useAppStore } from "@/store/appStore";
import { LockScreen } from "@/components/security/LockScreen";
import { SetupPassword } from "@/components/security/SetupPassword";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import "@/styles/globals.css";

type AppView = "loading" | "lock" | "setup" | "app";

export default function App({ Component, pageProps }: AppProps) {
  const { isUnlocked, hasPassword, init } = useAppStore();
  const [view, setView] = useState<AppView>("loading");
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        await init();
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    initApp();
  }, [init]);

  useEffect(() => {
    if (isUnlocked) {
      setView("app");
    } else if (showSetup) {
      setView("setup");
    } else {
      setView("lock");
    }
  }, [isUnlocked, showSetup]);

  const handleSetupComplete = () => {
    setShowSetup(false);
  };

  const handleSetupCancel = () => {
    setShowSetup(false);
  };

  const renderContent = () => {
    switch (view) {
      case "loading":
        return (
          <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center">
            <LoadingSpinner size="lg" text="正在加载..." />
          </div>
        );

      case "lock":
        return <LockScreen onSetup={() => setShowSetup(true)} />;

      case "setup":
        return (
          <SetupPassword
            onComplete={handleSetupComplete}
            onCancel={handleSetupCancel}
          />
        );

      case "app":
      default:
        return <Component {...pageProps} />;
    }
  };

  return (
    <>
      <Head>
        <title>SoulPulse - 情绪追踪与心理健康平台</title>
        <meta
          name="description"
          content="基于语言学分析与生理指标的情绪追踪应用，提供全加密的私人情绪数据库。"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {renderContent()}
    </>
  );
}
