'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Trip, Location, TSPResult, DailyItinerary, TripStatus, TransportMode, OperationLog, TSPSolveRequest } from '@/lib/types';
import { TSPOptimizer } from '@/lib/tsp';
import { TripNexusDB, getDB } from '@/lib/offline/db';
import { OperationQueue } from '@/lib/offline/operation-queue';
import type { AlgorithmType, OptimizationGoal } from '@/lib/tsp/types';

interface TripState {
  trips: Trip[];
  currentTrip: Trip | null;
  locations: Location[];
  optimizationResults: TSPResult[];
  selectedResult: TSPResult | null;
  dailyItineraries: DailyItinerary[];
  isLoading: boolean;
  error: string | null;
  
  setCurrentTrip: (trip: Trip | null) => void;
  addTrip: (trip: Omit<Trip, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { preferences?: Trip['preferences'] }) => Promise<Trip>;
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  loadTrips: () => Promise<void>;
  
  addLocation: (location: Omit<Location, 'id'>) => void;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  removeLocation: (id: string) => void;
  setLocations: (locations: Location[]) => void;
  reorderLocations: (fromIndex: number, toIndex: number) => void;
  
  optimizeRoute: (
    algorithm: AlgorithmType,
    goal: OptimizationGoal,
    transportMode: TransportMode
  ) => Promise<TSPResult>;
  selectOptimizationResult: (result: TSPResult | null) => void;
  clearOptimizationResults: () => void;
  
  generateDailyItineraries: () => DailyItinerary[];
  
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  trips: [],
  currentTrip: null,
  locations: [],
  optimizationResults: [],
  selectedResult: null,
  dailyItineraries: [],
  isLoading: false,
  error: null,
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentTrip: (trip) => set({ currentTrip: trip }),

      addTrip: async (tripData) => {
        const db = await getDB();
        const opQueue = OperationQueue.getInstance();
        
        const now = new Date();
        const newTrip: Trip = {
          ...tripData,
          id: uuidv4(),
          status: 'draft' as TripStatus,
          createdAt: now,
          updatedAt: now,
        };

        await opQueue.enqueue(
          'trip',
          {
            type: 'create',
            entityType: 'trip',
            entityId: newTrip.id,
            data: newTrip,
            timestamp: now,
            status: 'pending',
          },
          'medium'
        );

        set((state) => ({
          trips: [...state.trips, newTrip],
          currentTrip: newTrip,
        }));

        return newTrip;
      },

      updateTrip: async (id, updates) => {
        const db = await getDB();
        const opQueue = OperationQueue.getInstance();
        
        const now = new Date();
        const updatedTrip = { ...updates, updatedAt: now };

        await opQueue.enqueue(
          'trip',
          {
            type: 'update',
            entityType: 'trip',
            entityId: id,
            data: updatedTrip,
            timestamp: now,
            status: 'pending',
          },
          'medium'
        );

        set((state) => ({
          trips: state.trips.map((t) =>
            t.id === id ? { ...t, ...updatedTrip } : t
          ),
          currentTrip:
            state.currentTrip?.id === id
              ? { ...state.currentTrip, ...updatedTrip }
              : state.currentTrip,
        }));
      },

      deleteTrip: async (id) => {
        const db = await getDB();
        const opQueue = OperationQueue.getInstance();
        
        const now = new Date();

        await opQueue.enqueue(
          'trip',
          {
            type: 'delete',
            entityType: 'trip',
            entityId: id,
            timestamp: now,
            status: 'pending',
          },
          'medium'
        );

        set((state) => ({
          trips: state.trips.filter((t) => t.id !== id),
          currentTrip: state.currentTrip?.id === id ? null : state.currentTrip,
        }));
      },

      loadTrips: async () => {
        set({ isLoading: true, error: null });
        try {
          const db = await getDB();
          const trips = await db.trips.orderBy('updatedAt').reverse().toArray();
          set({ trips });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载行程失败' });
        } finally {
          set({ isLoading: false });
        }
      },

      addLocation: (location) => {
        const newLocation: Location = {
          ...location,
          id: uuidv4(),
        };
        set((state) => ({
          locations: [...state.locations, newLocation],
        }));
      },

      updateLocation: (id, updates) => {
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === id ? { ...loc, ...updates } : loc
          ),
        }));
      },

      removeLocation: (id) => {
        set((state) => ({
          locations: state.locations.filter((loc) => loc.id !== id),
        }));
      },

      setLocations: (locations) => set({ locations }),

      reorderLocations: (fromIndex, toIndex) => {
        set((state) => {
          const newLocations = [...state.locations];
          const [removed] = newLocations.splice(fromIndex, 1);
          newLocations.splice(toIndex, 0, removed);
          return { locations: newLocations };
        });
      },

      optimizeRoute: async (algorithm, goal, transportMode) => {
        set({ isLoading: true, error: null });
        try {
          const { locations } = get();
          if (locations.length < 2) {
            throw new Error('至少需要2个地点才能进行路径优化');
          }

          const request: TSPSolveRequest = {
            locations,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            transportMode,
            algorithm,
            optimizationGoal: goal,
            constraints: {
              dailyHours: { start: '09:00', end: '18:00' },
              maxDailyDistance: 500000,
              avoidTolls: false,
            },
          };

          const optimizer = new TSPOptimizer(request);
          const result = await optimizer.optimize({
            generateAlternatives: true,
            onProgress: (_alg, progress) => {
              console.log('优化进度:', progress);
            },
          });

          const resultWithId: TSPResult = {
            ...result,
            id: uuidv4(),
          };

          set((state) => ({
            optimizationResults: [...state.optimizationResults, resultWithId],
            selectedResult: resultWithId,
          }));

          return resultWithId;
        } catch (error) {
          const message = error instanceof Error ? error.message : '路径优化失败';
          set({ error: message });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      selectOptimizationResult: (result) => set({ selectedResult: result }),

      clearOptimizationResults: () =>
        set({ optimizationResults: [], selectedResult: null }),

      generateDailyItineraries: () => {
        const { selectedResult, currentTrip, locations } = get();
        if (!selectedResult || !currentTrip) return [];

        const request: TSPSolveRequest = {
          locations,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          transportMode: currentTrip.transportMode,
          algorithm: 'nearest_neighbor',
          optimizationGoal: 'balanced',
          constraints: {
            dailyHours: { start: '09:00', end: '18:00' },
            maxDailyDistance: 500000,
            avoidTolls: false,
          },
        };

        const optimizer = new TSPOptimizer(request);
        const path = selectedResult.optimalPath || locations;
        const segments = selectedResult.segments || [];
        const itineraries = optimizer.generateDailyItineraries(path, segments);

        set({ dailyItineraries: itineraries });
        return itineraries;
      },

      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),

      reset: () => set(initialState),
    }),
    {
      name: 'trip-nexus-trip-store',
      partialize: (state) => ({
        trips: state.trips,
        currentTrip: state.currentTrip,
        locations: state.locations,
      }),
    }
  )
);
