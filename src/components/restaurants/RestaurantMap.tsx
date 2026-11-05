/**
 * @file src/components/restaurants/RestaurantMap.tsx
 * @description Leaflet map of the restaurants around Clark, on OpenStreetMap
 * tiles. One tappable pin per restaurant (grey when closed), a campus marker
 * for Higgins, and area chips that fly the map to each cluster.
 *
 * Pins are CSS divIcons rather than Leaflet's default image markers, whose
 * image paths break under Vite. Styles live in index.css under
 * "Worcester Restaurant Map".
 */
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { Restaurant, RestaurantArea } from "@/types";
import { CLARK_CENTER, RESTAURANT_AREAS, WORCESTER_RESTAURANTS } from "@/data/worcesterRestaurants";

interface Props {
  restaurants: Restaurant[];
  openSlugs: Set<string>;
  onSelect: (restaurant: Restaurant) => void;
  focus: MapFocus;
  /** Room left at the top (chips) and bottom (the list) when fitting an area. */
  insetTop: number;
  insetBottom: number;
}

export type MapFocus = RestaurantArea | "all";
type Focus = MapFocus;

const PIN_OPEN   = L.divIcon({ className: "restaurant-pin",           iconSize: [26, 26], iconAnchor: [13, 26] });
const PIN_CLOSED = L.divIcon({ className: "restaurant-pin is-closed", iconSize: [26, 26], iconAnchor: [13, 26] });
const CAMPUS_PIN = L.divIcon({ className: "campus-pin", html: "Clark", iconSize: [52, 22], iconAnchor: [26, 11] });

/** Bounds around Higgins plus the given restaurants. */
function boundsFor(restaurants: Restaurant[]): L.LatLngBounds {
  return L.latLngBounds([
    [CLARK_CENTER.lat, CLARK_CENTER.lng],
    ...restaurants.map((r) => [r.lat, r.lng] as [number, number]),
  ]);
}

// Built from every restaurant rather than the filtered pins, so searching
// never changes where the chips fly or how far the map can pan.
const FOCUS_BOUNDS: Record<Focus, L.LatLngBounds> = {
  all: boundsFor(WORCESTER_RESTAURANTS),
  ...Object.fromEntries(
    RESTAURANT_AREAS.map((a) => [a.id, boundsFor(WORCESTER_RESTAURANTS.filter((r) => r.area === a.id))])
  ),
} as Record<Focus, L.LatLngBounds>;

export const MAP_CHIPS: { id: Focus; label: string }[] = [
  { id: "all", label: "All" },
  ...RESTAURANT_AREAS.map((a) => ({ id: a.id, label: a.shortLabel })),
];

/** Flies the map to the chosen area. Skips mount, where MapContainer's bounds already apply. */
function FlyToFocus({ focus, fit }: { focus: Focus; fit: L.FitBoundsOptions }) {
  const map = useMap();
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    map.flyToBounds(FOCUS_BOUNDS[focus], { ...fit, duration: 0.6 });
  }, [focus, map]); // eslint-disable-line react-hooks/exhaustive-deps -- refit only when the area changes

  return null;
}

export default function RestaurantMap({ restaurants, openSlugs, onSelect, focus, insetTop, insetBottom }: Props) {
  // Extra room on top for the pin bodies (they sit above their point)
  const fit: L.FitBoundsOptions = { paddingTopLeft: [16, insetTop + 34], paddingBottomRight: [16, insetBottom + 12], maxZoom: 17 };

  return (
      <div className="restaurant-map-frame" style={{ height: "100%" }}>
        <MapContainer
          bounds={FOCUS_BOUNDS.all}
          boundsOptions={fit}
          maxBounds={FOCUS_BOUNDS.all.pad(0.6)}
          minZoom={12}
          maxZoom={18}
          scrollWheelZoom={false}
          zoomControl={false} // the area chips sit there; pinch to zoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <FlyToFocus focus={focus} fit={fit} />

          <Marker
            position={[CLARK_CENTER.lat, CLARK_CENTER.lng]}
            icon={CAMPUS_PIN}
            interactive={false}
            keyboard={false}
            zIndexOffset={-100}
          />

          {restaurants.map((r) => {
            const isOpen = openSlugs.has(r.slug);
            return (
              <Marker
                key={r.slug}
                position={[r.lat, r.lng]}
                icon={isOpen ? PIN_OPEN : PIN_CLOSED}
                title={`${r.name} (${isOpen ? "open" : "closed"})`}
                zIndexOffset={isOpen ? 100 : 0}
                eventHandlers={{ click: () => onSelect(r) }}
              />
            );
          })}
        </MapContainer>
      </div>
  );
}
