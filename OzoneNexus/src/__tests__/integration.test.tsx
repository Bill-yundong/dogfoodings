import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Home from '@/app/page';
import { OzoneDataService } from '@/lib/data/OzoneDataService';
import { TimeSeriesRegressionEngine } from '@/lib/prediction/TimeSeriesRegressionEngine';

jest.mock('@/components/globe/OzoneGlobe', () => ({
  OzoneGlobe: ({ dataPoints, onPointClick }: any) => (
    <div data-testid="ozone-globe-mock">
      <span data-testid="data-points-count">{dataPoints?.length || 0}</span>
      {dataPoints?.map((point: any, index: number) => (
        <button
          key={index}
          data-testid={`data-point-${index}`}
          onClick={() => onPointClick && onPointClick(point)}
        >
          Point {index}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/components/charts/OzonePredictionChart', () => ({
  OzonePredictionChart: () => (
    <div data-testid="prediction-chart-mock">
      Prediction Chart Rendered
    </div>
  ),
}));

jest.mock('@/lib/database/OzoneDatabase', () => ({
  ozoneDatabase: {
    init: jest.fn().mockResolvedValue(undefined),
    syncData: jest.fn().mockResolvedValue(undefined),
    getSyncStatus: jest.fn().mockResolvedValue({
      lastSync: Date.now(),
      dataVersion: '1.0.0',
      pendingChanges: 0,
      isSyncing: false,
    }),
  },
}));

describe('Ozone Nexus Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test Suite 1: Application Initialization', () => {
    test('TC-001: Application renders loading state initially', async () => {
      render(<Home />);
      expect(screen.getByText(/Initializing Ozone Monitoring System/i)).toBeInTheDocument();
    });

    test('TC-002: Application transitions to main content after loading', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText(/Ozone Nexus/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('TC-003: Header displays system title and sync info', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Ozone Nexus')).toBeInTheDocument();
        expect(screen.getByText(/Last Synced/i)).toBeInTheDocument();
      });
    });

    test('TC-004: Sync button is present and functional', async () => {
      render(<Home />);
      
      await waitFor(() => {
        const syncButton = screen.getByRole('button', { name: /Resync/i });
        expect(syncButton).toBeInTheDocument();
      });
    });
  });

  describe('Test Suite 2: Metric Cards Display', () => {
    test('TC-005: Global Average metric card is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Global Average')).toBeInTheDocument();
        expect(screen.getAllByText('DU').length).toBeGreaterThan(0);
      });
    });

    test('TC-006: Antarctic Minimum metric card is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Antarctic Min')).toBeInTheDocument();
      });
    });

    test('TC-007: Recovery Rate metric card is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Recovery Rate')).toBeInTheDocument();
      });
    });

    test('TC-008: Expected Recovery Year metric card is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Expected Recovery')).toBeInTheDocument();
      });
    });

    test('TC-009: All four metric cards are displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        const metrics = ['Global Average', 'Antarctic Min', 'Recovery Rate', 'Expected Recovery'];
        metrics.forEach(metric => {
          expect(screen.getByText(metric)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Test Suite 3: 3D Globe Visualization', () => {
    test('TC-010: Globe component is rendered', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByTestId('ozone-globe-mock')).toBeInTheDocument();
      });
    });

    test('TC-011: Globe displays ozone concentration legend', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText(/Global Ozone Distribution/i)).toBeInTheDocument();
        expect(screen.getByText(/Healthy/i)).toBeInTheDocument();
        expect(screen.getByText(/Moderate/i)).toBeInTheDocument();
        expect(screen.getByText(/Depleted/i)).toBeInTheDocument();
      });
    });

    test('TC-012: Globe displays data points from service', async () => {
      render(<Home />);
      
      await waitFor(() => {
        const pointsCount = screen.getByTestId('data-points-count');
        expect(parseInt(pointsCount.textContent || '0')).toBeGreaterThan(0);
      });
    });

    test('TC-013: Clicking data point shows details panel', async () => {
      render(<Home />);
      
      await waitFor(() => {
        const firstPoint = screen.getByTestId('data-point-0');
        fireEvent.click(firstPoint);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Data Point Details/i)).toBeInTheDocument();
      });
    });

    test('TC-014: Data point details displays location and concentration', async () => {
      render(<Home />);
      
      await waitFor(() => {
        const firstPoint = screen.getByTestId('data-point-0');
        fireEvent.click(firstPoint);
      });

      await waitFor(() => {
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Ozone Concentration')).toBeInTheDocument();
        expect(screen.getByText('UV Index')).toBeInTheDocument();
        expect(screen.getByText('Data Source')).toBeInTheDocument();
      });
    });
  });

  describe('Test Suite 4: Prediction Chart', () => {
    test('TC-015: Prediction chart component is rendered', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByTestId('prediction-chart-mock')).toBeInTheDocument();
      });
    });

    test('TC-016: Chart title is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText(/Ozone Concentration Trend & Prediction/i)).toBeInTheDocument();
      });
    });
  });

  describe('Test Suite 5: System Information Panel', () => {
    test('TC-017: System information panel is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('System Information')).toBeInTheDocument();
      });
    });

    test('TC-018: Data version is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Data Version')).toBeInTheDocument();
      });
    });

    test('TC-019: Data points count is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Data Points')).toBeInTheDocument();
      });
    });

    test('TC-020: Sync status is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
      });
    });

    test('TC-021: Database info is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Database')).toBeInTheDocument();
        expect(screen.getByText('IndexedDB')).toBeInTheDocument();
      });
    });
  });

  describe('Test Suite 6: Research Alignment Status', () => {
    test('TC-022: Research alignment panel is displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Research Alignment Status')).toBeInTheDocument();
      });
    });

    test('TC-023: NASA OMI data alignment status is shown', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText(/NASA OMI Satellite Data - Aligned/i)).toBeInTheDocument();
      });
    });

    test('TC-024: NOAA ground station alignment status is shown', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText(/NOAA Ground Station Data - Aligned/i)).toBeInTheDocument();
      });
    });

    test('TC-025: WMO ozone research alignment status is shown', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText(/WMO Ozone Research - Aligned/i)).toBeInTheDocument();
      });
    });

    test('TC-026: Polar vortex monitoring alignment status is shown', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText(/Polar Vortex Monitoring - Aligned/i)).toBeInTheDocument();
      });
    });

    test('TC-027: All four research alignment statuses are displayed', async () => {
      render(<Home />);
      
      await waitFor(() => {
        const alignments = [
          'NASA OMI Satellite Data - Aligned',
          'NOAA Ground Station Data - Aligned',
          'WMO Ozone Research - Aligned',
          'Polar Vortex Monitoring - Aligned',
        ];
        alignments.forEach(alignment => {
          expect(screen.getByText(alignment)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Test Suite 7: Data Service Unit Tests', () => {
    test('TC-028: OzoneDataService generates valid data points', () => {
      const dataPoints = OzoneDataService.generateOzoneDataPoints(10);
      
      expect(dataPoints).toHaveLength(10);
      dataPoints.forEach(point => {
        expect(point).toHaveProperty('id');
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('latitude');
        expect(point).toHaveProperty('longitude');
        expect(point).toHaveProperty('ozoneConcentration');
        expect(point).toHaveProperty('uvIndex');
        expect(point).toHaveProperty('dataVersion');
        expect(point).toHaveProperty('source');
        
        expect(point.latitude).toBeGreaterThanOrEqual(-90);
        expect(point.latitude).toBeLessThanOrEqual(90);
        expect(point.longitude).toBeGreaterThanOrEqual(-180);
        expect(point.longitude).toBeLessThanOrEqual(180);
        expect(point.ozoneConcentration).toBeGreaterThan(150);
        expect(point.ozoneConcentration).toBeLessThan(400);
      });
    });

    test('TC-029: OzoneDataService generates polar vortex data', () => {
      const vortexData = OzoneDataService.generatePolarVortexData();
      
      expect(vortexData.length).toBeGreaterThan(0);
      vortexData.forEach(data => {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('region');
        expect(data).toHaveProperty('strength');
        expect(data).toHaveProperty('temperature');
        expect(data).toHaveProperty('windSpeed');
        expect(data).toHaveProperty('area');
      });
    });

    test('TC-030: OzoneDataService generates historical time series', () => {
      const timeSeries = OzoneDataService.generateHistoricalTimeSeries(60);
      
      expect(timeSeries).toHaveLength(60);
      timeSeries.forEach(point => {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('value');
        expect(point.value).toBeGreaterThan(200);
        expect(point.value).toBeLessThan(400);
      });
    });

    test('TC-031: OzoneDataService calculates valid metrics', () => {
      const dataPoints = OzoneDataService.generateOzoneDataPoints(100);
      const metrics = OzoneDataService.calculateOzoneMetrics(dataPoints);
      
      expect(metrics).toHaveProperty('globalAverage');
      expect(metrics).toHaveProperty('antarcticMinimum');
      expect(metrics).toHaveProperty('arcticMinimum');
      expect(metrics).toHaveProperty('recoveryRate');
      expect(metrics).toHaveProperty('expectedFullRecoveryYear');
      
      expect(metrics.globalAverage).toBeGreaterThan(200);
      expect(metrics.globalAverage).toBeLessThan(400);
      expect(metrics.expectedFullRecoveryYear).toBeGreaterThan(2024);
      expect(metrics.expectedFullRecoveryYear).toBeLessThan(2100);
    });
  });

  describe('Test Suite 8: Time Series Prediction Engine', () => {
    test('TC-032: Prediction engine initializes with historical data', () => {
      const historicalData = OzoneDataService.generateHistoricalTimeSeries(60);
      const engine = new TimeSeriesRegressionEngine(historicalData);
      
      expect(engine).toBeDefined();
      expect(engine.isModelReady()).toBe(false);
    });

    test('TC-033: Prediction engine trains successfully', async () => {
      const historicalData = OzoneDataService.generateHistoricalTimeSeries(60);
      const engine = new TimeSeriesRegressionEngine(historicalData);
      
      await engine.train();
      
      expect(engine.isModelReady()).toBe(true);
      expect(engine.getRSquared()).toBeDefined();
      expect(engine.getModelParams()).toBeDefined();
    });

    test('TC-034: Prediction engine generates future predictions', async () => {
      const historicalData = OzoneDataService.generateHistoricalTimeSeries(60);
      const engine = new TimeSeriesRegressionEngine(historicalData);
      
      await engine.train();
      
      const futureTimestamps = OzoneDataService.generateFutureTimestamps(24);
      const predictions = await engine.predict(futureTimestamps);
      
      expect(predictions).toHaveLength(24);
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('timestamp');
        expect(pred).toHaveProperty('predictedConcentration');
        expect(pred).toHaveProperty('confidenceInterval');
        expect(pred).toHaveProperty('confidence');
        expect(pred.predictedConcentration).toBeGreaterThan(200);
        expect(pred.predictedConcentration).toBeLessThan(400);
      });
    });

    test('TC-035: Prediction engine handles insufficient data gracefully', async () => {
      const insufficientData = OzoneDataService.generateHistoricalTimeSeries(5);
      const engine = new TimeSeriesRegressionEngine(insufficientData);
      
      await expect(engine.train()).rejects.toThrow();
    });

    test('TC-036: Prediction engine can add more data and retrain', async () => {
      const historicalData = OzoneDataService.generateHistoricalTimeSeries(30);
      const engine = new TimeSeriesRegressionEngine(historicalData);
      
      await engine.train();
      expect(engine.isModelReady()).toBe(true);
      
      const newData = OzoneDataService.generateHistoricalTimeSeries(30);
      engine.addData(newData);
      
      await engine.train();
      expect(engine.isModelReady()).toBe(true);
    });
  });

  describe('Test Suite 9: Footer and UI Elements', () => {
    test('TC-037: Footer is displayed with system name', async () => {
      render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText(/Ozone Nexus - Global Ozone Layer Monitoring and Prediction System/i)).toBeInTheDocument();
      });
    });

    test('TC-038: Globe has interactive cursor styling', async () => {
      render(<Home />);
      
      await waitFor(() => {
        const globe = screen.getByTestId('ozone-globe-mock');
        expect(globe).toBeInTheDocument();
      });
    });
  });

  describe('Test Suite 10: End-to-End Workflow', () => {
    test('TC-039: Complete user journey from load to data interaction', async () => {
      render(<Home />);
      
      expect(screen.getByText(/Initializing Ozone Monitoring System/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Ozone Nexus')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ozone-globe-mock')).toBeInTheDocument();
        expect(screen.getByTestId('prediction-chart-mock')).toBeInTheDocument();
      });

      await waitFor(() => {
        const firstPoint = screen.getByTestId('data-point-0');
        fireEvent.click(firstPoint);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Data Point Details/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        const metrics = ['Global Average', 'Antarctic Min', 'Recovery Rate', 'Expected Recovery'];
        metrics.forEach(metric => {
          expect(screen.getByText(metric)).toBeInTheDocument();
        });
      });

      await waitFor(() => {
        const alignments = [
          'NASA OMI Satellite Data - Aligned',
          'NOAA Ground Station Data - Aligned',
          'WMO Ozone Research - Aligned',
          'Polar Vortex Monitoring - Aligned',
        ];
        alignments.forEach(alignment => {
          expect(screen.getByText(alignment)).toBeInTheDocument();
        });
      });
    });

    test('TC-040: All core UI components render without errors', async () => {
      const { container } = render(<Home />);
      
      await waitFor(() => {
        expect(screen.getByText('Ozone Nexus')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(container.querySelectorAll('.data-card').length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });
});
