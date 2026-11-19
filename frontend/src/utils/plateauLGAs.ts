// ============================================================================
// PLATEAU STATE 17 LOCAL GOVERNMENT AREAS METADATA & BOUNDARY POSITIONS
// Genuine geographical zones, codes, and coordinates for Plateau State, Nigeria
// ============================================================================

export interface PlateauLGAInfo {
  id?: number;
  name: string;
  code: string;
  zone: 'Plateau North' | 'Plateau Central' | 'Plateau South';
  headquarters: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  gridPosition: {
    row: number;
    col: number;
  };
}

export const PLATEAU_LGAS: PlateauLGAInfo[] = [
  // Plateau North
  {
    name: 'Jos North',
    code: 'JSN',
    zone: 'Plateau North',
    headquarters: 'Jos',
    coordinates: { lat: 9.9285, lng: 8.8921 },
    gridPosition: { row: 1, col: 2 },
  },
  {
    name: 'Jos South',
    code: 'JSS',
    zone: 'Plateau North',
    headquarters: 'Bukuru',
    coordinates: { lat: 9.7999, lng: 8.8631 },
    gridPosition: { row: 2, col: 2 },
  },
  {
    name: 'Jos East',
    code: 'JSE',
    zone: 'Plateau North',
    headquarters: 'Angware',
    coordinates: { lat: 9.9142, lng: 9.1028 },
    gridPosition: { row: 1, col: 3 },
  },
  {
    name: 'Bassa',
    code: 'BAS',
    zone: 'Plateau North',
    headquarters: 'Bassa',
    coordinates: { lat: 9.9333, lng: 8.7333 },
    gridPosition: { row: 1, col: 1 },
  },
  {
    name: 'Barkin Ladi',
    code: 'BKL',
    zone: 'Plateau North',
    headquarters: 'Barkin Ladi',
    coordinates: { lat: 9.5333, lng: 8.8833 },
    gridPosition: { row: 2, col: 3 },
  },
  {
    name: 'Riyom',
    code: 'RYM',
    zone: 'Plateau North',
    headquarters: 'Riyom',
    coordinates: { lat: 9.6333, lng: 8.75 },
    gridPosition: { row: 2, col: 1 },
  },

  // Plateau Central
  {
    name: 'Mangu',
    code: 'MNG',
    zone: 'Plateau Central',
    headquarters: 'Mangu',
    coordinates: { lat: 9.5167, lng: 9.1 },
    gridPosition: { row: 3, col: 2 },
  },
  {
    name: 'Bokkos',
    code: 'BOK',
    zone: 'Plateau Central',
    headquarters: 'Bokkos',
    coordinates: { lat: 9.3, lng: 8.9833 },
    gridPosition: { row: 3, col: 1 },
  },
  {
    name: 'Pankshin',
    code: 'PKN',
    zone: 'Plateau Central',
    headquarters: 'Pankshin',
    coordinates: { lat: 9.3333, lng: 9.45 },
    gridPosition: { row: 3, col: 3 },
  },
  {
    name: 'Kanke',
    code: 'KNK',
    zone: 'Plateau Central',
    headquarters: 'Kwal',
    coordinates: { lat: 9.4167, lng: 9.6167 },
    gridPosition: { row: 3, col: 4 },
  },
  {
    name: 'Kanam',
    code: 'KNM',
    zone: 'Plateau Central',
    headquarters: 'Dengi',
    coordinates: { lat: 9.85, lng: 9.95 },
    gridPosition: { row: 2, col: 4 },
  },

  // Plateau South
  {
    name: 'Langtang North',
    code: 'LTN',
    zone: 'Plateau South',
    headquarters: 'Langtang',
    coordinates: { lat: 9.1333, lng: 9.7833 },
    gridPosition: { row: 4, col: 3 },
  },
  {
    name: 'Langtang South',
    code: 'LTS',
    zone: 'Plateau South',
    headquarters: 'Mabudi',
    coordinates: { lat: 8.6333, lng: 9.8333 },
    gridPosition: { row: 5, col: 3 },
  },
  {
    name: 'Wase',
    code: 'WAS',
    zone: 'Plateau South',
    headquarters: 'Wase',
    coordinates: { lat: 9.0987, lng: 9.9612 },
    gridPosition: { row: 4, col: 4 },
  },
  {
    name: 'Shendam',
    code: 'SHD',
    zone: 'Plateau South',
    headquarters: 'Shendam',
    coordinates: { lat: 8.8833, lng: 9.5 },
    gridPosition: { row: 4, col: 2 },
  },
  {
    name: 'Mikang',
    code: 'MKG',
    zone: 'Plateau South',
    headquarters: 'Tunkus',
    coordinates: { lat: 8.9167, lng: 9.3333 },
    gridPosition: { row: 4, col: 1 },
  },
  {
    name: 'Qua\'an Pan',
    code: 'QNP',
    zone: 'Plateau South',
    headquarters: 'Ba\'ap',
    coordinates: { lat: 8.6667, lng: 9.1667 },
    gridPosition: { row: 5, col: 1 },
  },
];

