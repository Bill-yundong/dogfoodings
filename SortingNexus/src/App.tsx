import React from 'react';
import { useSortingSystem } from './hooks';
import { LoadingScreen, Header, LeftPanel, MainContent, RightPanel } from './components';

const App: React.FC = () => {
  const {
    isInitialized,
    packages,
    nodes,
    metrics,
    errors,
    plcStatus,
    isRunning,
    selectedPackageId,
    selectedPackage,
    setSelectedPackageId,
    start,
    stop,
    reset
  } = useSortingSystem();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header
        isRunning={isRunning}
        onStart={start}
        onStop={stop}
        onReset={reset}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel metrics={metrics} plcStatus={plcStatus} />
        <MainContent
          nodes={nodes}
          packages={packages}
          selectedPackageId={selectedPackageId}
          onPackageClick={setSelectedPackageId}
        />
        <RightPanel selectedPackage={selectedPackage} errors={errors} />
      </div>
    </div>
  );
};

export default App;
