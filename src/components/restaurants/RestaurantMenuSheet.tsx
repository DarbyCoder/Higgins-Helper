/**
 * @file src/components/restaurants/RestaurantMenuSheet.tsx
 * @description Bottom sheet for one Worcester restaurant. The menu renders in
 * the same LocationCard the Higgins menu uses, with a short info line above
 * it (cuisine, distance, directions) and a nutrition note below.
 *
 * Sits at zIndex 190, just under NutritionModal (200), so tapping an item
 * opens the nutrition sheet on top of this one. Drag it down to close.
 */
import type { MenuItem, Restaurant } from "@/types";
import Sheet from "@/components/ui/Sheet";
import { ArrowUpRightIcon } from "@/components/icons";
import LocationCard from "@/components/menu/LocationCard";
import { LocationCardErrorBoundary } from "@/components/menu/LocationCardErrorBoundary";
import { distanceFromClark, formatDistance, mealNameForNow, restaurantToLocation } from "@/utils/restaurants";

interface Props {
  restaurant: Restaurant | null;
  date: string;
  onClose: () => void;
  onSelectItem: (item: MenuItem, locationName: string, mealName?: string) => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10" → "Oct 2026" */
function formatVerified(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return `${MONTH_NAMES[month - 1] ?? ""} ${year}`.trim();
}

const linkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  flexShrink: 0,
  color: "var(--color-primary-light)",
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;

export default function RestaurantMenuSheet({ restaurant, date, onClose, onSelectItem }: Props) {
  if (!restaurant) return null;

  const location   = restaurantToLocation(restaurant, date);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;

  return (
    <Sheet key={restaurant.slug} onClose={onClose} ariaLabel={`${restaurant.name} menu`} zIndex={190}>
          {/* Info line */}
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.75rem",
            marginBottom: "0.65rem", fontSize: "0.75rem", color: "var(--color-text-3)",
          }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ color: "var(--color-text-2)", fontWeight: 600 }}>{restaurant.cuisine}</span>
              {" · "}{formatDistance(distanceFromClark(restaurant))}
            </span>
            <a href={directions} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Directions <ArrowUpRightIcon size={12} strokeWidth={2.4} />
            </a>
          </div>

          {/* The menu itself — keyed so card state and any caught error reset per restaurant */}
          <LocationCardErrorBoundary key={restaurant.slug} locationName={restaurant.name}>
            <LocationCard
              location={location}
              onSelectItem={(item, locationName) => onSelectItem(item, locationName, mealNameForNow())}
            />
          </LocationCardErrorBoundary>

          {/* Address + where the numbers come from */}
          <p style={{ margin: "0.85rem 0 0", fontSize: "0.7rem", lineHeight: 1.5, color: "var(--color-text-3)" }}>
            {restaurant.address}
            {restaurant.menuUrl && (
              <>
                {" · "}
                <a href={restaurant.menuUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Full menu <ArrowUpRightIcon size={12} strokeWidth={2.4} />
                </a>
              </>
            )}
            <br />
            {restaurant.nutritionSource === "official"
              ? `Nutrition from ${restaurant.name}'s published info.`
              : "Calories (~) are our estimates for a typical portion; actual values vary."}
            {` Hours checked ${formatVerified(restaurant.lastVerified)}.`}
          </p>
    </Sheet>
  );
}
