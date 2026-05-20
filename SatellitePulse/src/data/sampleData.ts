import type { Satellite, GroundStation } from '../core/types'
import { SATELLITE_COLORS, STATION_COLORS } from '../core/constants'

export const SAMPLE_SATELLITES: Satellite[] = [
  {
    id: 'iss',
    name: 'ISS (ZARYA)',
    tle: {
      name: 'ISS (ZARYA)',
      line1: '1 25544U 98067A   25139.50000000  .00020000  00000-0  34149-3 0  9993',
      line2: '2 25544  51.6400 200.0000 0006703  90.0000 270.0000 15.50000000 123456'
    },
    color: SATELLITE_COLORS[0],
    active: true
  },
  {
    id: 'starlink-1007',
    name: 'STARLINK-1007',
    tle: {
      name: 'STARLINK-1007',
      line1: '1 44713U 19074A   25139.50000000  .00001000  00000-0  10000-3 0  9999',
      line2: '2 44713  53.0000 100.0000 0001000  90.0000 270.0000 15.05000000 12345'
    },
    color: SATELLITE_COLORS[1],
    active: true
  },
  {
    id: 'starlink-1008',
    name: 'STARLINK-1008',
    tle: {
      name: 'STARLINK-1008',
      line1: '1 44714U 19074B   25139.50000000  .00001000  00000-0  10000-3 0  9998',
      line2: '2 44714  53.0000 120.0000 0001000  90.0000 270.0000 15.05000000 12346'
    },
    color: SATELLITE_COLORS[2],
    active: true
  },
  {
    id: 'landsat-9',
    name: 'LANDSAT 9',
    tle: {
      name: 'LANDSAT 9',
      line1: '1 49260U 21088A   25139.50000000  .00000100  00000-0  50000-4 0  9999',
      line2: '2 49260  98.2000 280.0000 0001000  90.0000 270.0000 14.50000000 12345'
    },
    color: SATELLITE_COLORS[3],
    active: true
  },
  {
    id: 'sentinel-2a',
    name: 'SENTINEL-2A',
    tle: {
      name: 'SENTINEL-2A',
      line1: '1 40697U 15028A   25139.50000000  .00000010  00000-0  10000-4 0  9999',
      line2: '2 40697  98.5600 180.0000 0001000  90.0000 270.0000 14.30000000 12345'
    },
    color: SATELLITE_COLORS[4],
    active: true
  },
  {
    id: 'gps-iif-1',
    name: 'GPS IIF-1',
    tle: {
      name: 'GPS IIF-1',
      line1: '1 37753U 11024A   25139.50000000  .00000010  00000-0  10000-4 0  9999',
      line2: '2 37753  55.0000 100.0000 0050000 250.0000 110.0000  2.00567890 12345'
    },
    color: SATELLITE_COLORS[5],
    active: true
  },
  {
    id: 'noaa-19',
    name: 'NOAA 19',
    tle: {
      name: 'NOAA 19',
      line1: '1 33591U 09005A   25139.50000000  .00000100  00000-0  10000-3 0  9999',
      line2: '2 33591  99.1000  50.0000 0015000  90.0000 270.0000 14.10000000 12345'
    },
    color: SATELLITE_COLORS[6],
    active: true
  },
  {
    id: 'meteor-m2',
    name: 'METEOR-M 2',
    tle: {
      name: 'METEOR-M 2',
      line1: '1 42025U 14037A   25139.50000000  .00000100  00000-0  10000-3 0  9999',
      line2: '2 42025  98.7000 150.0000 0001000  90.0000 270.0000 14.20000000 12345'
    },
    color: SATELLITE_COLORS[7],
    active: true
  }
]

export const SAMPLE_GROUND_STATIONS: GroundStation[] = [
  {
    id: 'beijing',
    name: '北京测控站',
    latitude: 39.9042,
    longitude: 116.4074,
    elevation: 43,
    minElevationAngle: 10,
    color: STATION_COLORS[0]
  },
  {
    id: 'sanya',
    name: '三亚测控站',
    latitude: 18.2528,
    longitude: 109.5119,
    elevation: 10,
    minElevationAngle: 10,
    color: STATION_COLORS[1]
  },
  {
    id: 'kashi',
    name: '喀什测控站',
    latitude: 39.4704,
    longitude: 75.9898,
    elevation: 1289,
    minElevationAngle: 10,
    color: STATION_COLORS[2]
  },
  {
    id: 'sweden',
    name: '基律纳站 (瑞典)',
    latitude: 67.8558,
    longitude: 20.2253,
    elevation: 310,
    minElevationAngle: 10,
    color: STATION_COLORS[3]
  },
  {
    id: 'chile',
    name: '圣地亚哥站 (智利)',
    latitude: -33.4489,
    longitude: -70.6693,
    elevation: 520,
    minElevationAngle: 10,
    color: STATION_COLORS[4]
  }
]
