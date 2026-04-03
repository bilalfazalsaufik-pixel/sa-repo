import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { latLng, tileLayer, marker, divIcon, LatLngBounds, Layer } from 'leaflet';
import { SiteMapItem } from '../../models/site-map.model';

/** Default center when no sites (world view). */
const DEFAULT_CENTER = latLng(20, 0);
const DEFAULT_ZOOM = 2;

/** CSS class for marker by status (real-time). */
function statusMarkerClass(status: string | undefined): string {
  switch (status) {
    case 'Green': return 'marker-status-green';
    case 'Yellow': return 'marker-status-yellow';
    case 'Red': return 'marker-status-red';
    default: return 'marker-status-default';
  }
}

/** Create a divIcon for a status-colored circle marker. */
function createStatusIcon(item: SiteMapItem) {
  const cls = statusMarkerClass(item.status);
  return divIcon({
    className: 'site-marker-wrapper',
    html: `<span class="site-marker-dot ${cls}" title="${escapeHtml(item.name)}" aria-label="${escapeHtml(item.name) + (item.status ? ' - ' + escapeHtml(item.status) : '')}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    tooltipAnchor: [0, -12],
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

@Component({
  selector: 'app-sites-map',
  standalone: true,
  imports: [CommonModule, LeafletModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sites-map.component.html',
  styleUrls: ['./sites-map.component.css'],
})
export class SitesMapComponent {
  @Input() set siteMapItems(value: SiteMapItem[]) {
    this._siteMapItems.set(value ?? []);
  }
  get siteMapItems(): SiteMapItem[] {
    return this._siteMapItems();
  }
  @Output() siteClick = new EventEmitter<number>();

  private _siteMapItems = signal<SiteMapItem[]>([]);

  /** Leaflet options: tile layer + initial center/zoom. Attribution control disabled; we show a minimal OSM credit in template. */
  options = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '', // We show a minimal custom attribution in the template instead of Leaflet's default control
      }),
    ],
    zoom: DEFAULT_ZOOM,
    center: DEFAULT_CENTER,
    attributionControl: false,
  };

  /** Fit bounds to include all sites when we have at least one; null otherwise. */
  fitBounds = computed((): LatLngBounds | null => {
    const items = this._siteMapItems();
    if (items.length === 0) return null;
    const lats = items.map((p) => p.latitude);
    const lngs = items.map((p) => p.longitude);
    const south = Math.min(...lats);
    const north = Math.max(...lats);
    const west = Math.min(...lngs);
    const east = Math.max(...lngs);
    return new LatLngBounds([south, west], [north, east]);
  });

  /** Bounds for map binding (only used when siteMapItems.length > 0; then fitBounds() is non-null). */
  boundsForMap = computed((): LatLngBounds => this.fitBounds() ?? new LatLngBounds([0, 0], [0, 0]));

  /** Marker layers for each site; icon color reflects real-time status (Green / Yellow / Red). */
  layers = computed((): Layer[] => {
    const items = this._siteMapItems();
    return items.map((item) => {
      const m = marker([item.latitude, item.longitude], {
        icon: createStatusIcon(item),
      });
      m.bindTooltip(`${item.name}${item.status ? ` (${item.status})` : ''}`, {
        permanent: false,
        direction: 'top',
      });
      m.on('click', () => this.siteClick.emit(item.siteId));
      return m;
    });
  });
}
