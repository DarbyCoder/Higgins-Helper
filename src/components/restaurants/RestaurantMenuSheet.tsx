/**
 * @file src/components/restaurants/RestaurantMenuSheet.tsx
 * @description Bottom sheet for one Worcester restaurant. The menu renders in
 * the same LocationCard the Higgins menu uses, with a short info line above
 * it (cuisine, distance, directions) and a nutrition note below.
 *
 * Sits at zIndex 190, just under NutritionModal (200), so tapping an item
 * opens the nutrition sheet on top of this one.
 */
import { useEffect, useRef } from "react";
import type { MenuItem, Restaurant } from "@/types";
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
  color: "var(--color-primary-light)",
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;

export default function RestaurantMenuSheet({ restaurant, date, onClose, onSelectItem }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the sheet when it opens so Escape and Tab start there
  useEffect(() => {
    if (restaurant) dialogRef.current?.focus();
  }, [restaurant]);

  // Escape while focus is back on the page (e.g. after the nutrition sheet
  // closes). Only reacts when this sheet is the topmost open dialog.
  useEffect(() => {
    if (!restaurant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] === dialogRef.current) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restaurant, onClose]);

  if (!restaurant) return null;

  const location   = restaurantToLocation(restaurant, date);
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;

  return (
    /* Backdrop — same pattern as NutritionModal */
    <div
      role="button"
      tabIndex={0}
      aria-label="Close restaurant menu"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: 190,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${restaurant.name} menu`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") onClose();
        }}
        className="animate-slide-up"
        style={{
          width: "100%", maxWidth: 480, margin: "0 auto",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          border: "1px solid var(--color-border)",
          borderBottom: "none",
          maxHeight: "90dvh",
          display: "flex", flexDirection: "column",
          outline: "none",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "0.75rem" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--color-surface-3)" }} />
        </div>

        <div style={{ overflowY: "auto", padding: "0.6rem 1rem 1.25rem", flex: 1 }}>
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
              Directions ↗
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
                  Full menu ↗
                </a>
              </>
            )}
            <br />
            {restaurant.nutritionSource === "official"
              ? `Nutrition from ${restaurant.name}'s published info.`
              : "Calories (~) are our estimates for a typical portion; actual values vary."}
            {` Hours checked ${formatVerified(restaurant.lastVerified)}.`}
          </p>
        </div>
      </div>
    </div>
  );
}
