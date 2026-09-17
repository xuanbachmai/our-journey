export type AreaId = 'farm' | 'town' | 'forest' | 'ranch' | 'lane' | 'home' | 'store' | 'tailor' | 'petshop' | 'restaurant' | 'qdhome' | 'xbhome';

export interface AreaInfo {
  id: AreaId;
  name: string;
  outdoor: boolean;
  /** Outdoor parent for interiors (used by the map). */
  parent?: AreaId;
}

export const AREAS: Record<AreaId, AreaInfo> = {
  farm: { id: 'farm', name: 'Our Farm', outdoor: true },
  town: { id: 'town', name: 'Maple Town', outdoor: true },
  forest: { id: 'forest', name: 'Whisper Forest', outdoor: true },
  ranch: { id: 'ranch', name: 'Sunny Ranch', outdoor: true },
  lane: { id: 'lane', name: 'Family Lane', outdoor: true },
  qdhome: { id: 'qdhome', name: 'Nha ba Hanh', outdoor: false, parent: 'lane' },
  xbhome: { id: 'xbhome', name: 'Nha ba Thai', outdoor: false, parent: 'lane' },
  home: { id: 'home', name: 'Our Home', outdoor: false, parent: 'farm' },
  restaurant: { id: 'restaurant', name: 'Our Restaurant', outdoor: false, parent: 'farm' },
  store: { id: 'store', name: 'General Store', outdoor: false, parent: 'town' },
  tailor: { id: 'tailor', name: "Rosa's Tailor", outdoor: false, parent: 'town' },
  petshop: { id: 'petshop', name: 'Pet & Barn Shop', outdoor: false, parent: 'town' },
};

export const OUTDOOR_AREAS: AreaId[] = ['farm', 'town', 'forest', 'ranch', 'lane'];

export interface PlayerPlace {
  area: AreaId;
  x: number;
  y: number;
}
