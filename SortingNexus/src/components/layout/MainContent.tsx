import React from 'react';
import { ConveyorNode, Package } from '../../types';
import { TopologyViewer } from '../visualization/TopologyViewer';
import { FeatureShowcase } from '../visualization/FeatureShowcase';

interface MainContentProps {
  nodes: ConveyorNode[];
  packages: Package[];
  selectedPackageId: string | null;
  onPackageClick: (packageId: string | null) => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  nodes,
  packages,
  selectedPackageId,
  onPackageClick
}) => {
  return (
    <main className="flex-1 p-6">
      <TopologyViewer
        nodes={nodes}
        packages={packages}
        selectedPackageId={selectedPackageId}
        onPackageClick={onPackageClick}
      />
      <FeatureShowcase />
    </main>
  );
};

export default MainContent;
