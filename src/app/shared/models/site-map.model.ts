/** Site with coordinates for map display; status from dashboard overview (optional). */
export interface SiteMapItem {
  siteId: number;
  name: string;
  latitude: number;
  longitude: number;
  /** Green | Yellow | Red from dashboard site overview */
  status?: string;
}
