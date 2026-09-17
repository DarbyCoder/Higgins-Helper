/**
 * @file src/components/dashboard/RecommendedMeal.tsx
 * @description "Recommended for {meal}" dashboard section.
 *
 * Deterministically picks up to 3 items from Higgins's currently-open meal
 * period that fit the user's remaining macros (see utils/mealRecommendation),
 * each with a one-tap "+" quick log. An optional Gemini one-liner is layered on
 * top and silently omitted if unavailable.
 *
 * Only shown when the dashboard is viewing (effective) today, since
 * recommendations depend on what's open right now.
 */
import { useEffect, useMemo, useState } from "react";
import type { LoggedFoodEntry, MacroTargets, MacroTotals, MenuItem } from "@/types";
import {
  useAuthStore,
  useDateStore,
  useFoodLogStore,
  useMenuStore,
  useRecommendationStore,
  useUIStore,
  useUserStore,
} from "@/stores";
import { recommendMeals, type RecommendationReason } from "@/utils/mealRecommendation";
import { findNextMealPeriod, mapMealPeriodNameToSlot } from "@/utils/time";
import type { BlurbRequestBody } from "@/stores/useRecommendationStore";

interface Props {
  totals: MacroTotals;
  targets: MacroTargets;
  entries: LoggedFoodEntry[];
}

const REASON_LABELS: Record<RecommendationReason, string> = {
  protein: "Protein boost",
  fit:     "Fits your budget",
  light:   "Light option",
  fiber:   "High fiber",
};

const EMPTY_RESTRICTIONS: string[] = [];

export default function RecommendedMeal({ totals, targets, entries }: Props) {
  const selectedDate = useDateStore((s) => s.selectedDate);
  const today        = useDateStore((s) => s.getEffectiveToday());
  const menu         = useMenuStore((s) => s.menuCache[today]);
  const isLoading    = useMenuStore((s) => s.isLoading);
  const fetchMenu    = useMenuStore((s) => s.fetchMenu);
  const restrictions = useUserStore((s) => s.userProfile?.dietaryRestrictions ?? EMPTY_RESTRICTIONS);
  const wantsAI      = useUserStore((s) => s.userProfile?.wantsAIAdvisor ?? true);
  const uid          = useAuthStore((s) => s.user?.uid ?? "anon");
  const addFoodEntry = useFoodLogStore((s) => s.addFoodEntry);
  const showToast    = useUIStore((s) => s.showToast);
  const blurbs       = useRecommendationStore((s) => s.blurbs);
  const loadBlurb    = useRecommendationStore((s) => s.loadBlurb);

  const isToday = selectedDate === today;

  // Re-evaluate the open meal period every minute
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isToday && !menu) fetchMenu(today);
  }, [isToday, menu, today, fetchMenu]);

  const result = useMemo(
    () => recommendMeals(menu, totals, targets, entries, restrictions, now),
    [menu, totals, targets, entries, restrictions, now]
  );
  const { location, activeMeal, items, filteredOut } = result;

  // ── Optional AI blurb ──
  const blurbRequest = useMemo<BlurbRequestBody | null>(() => {
    if (!activeMeal || items.length === 0) return null;
    // Round remaining macros so small logging changes reuse the cached blurb
    return {
      date: today,
      mealPeriod: activeMeal.name,
      items: items.map(({ item }) => ({
        name:       item.name,
        calories:   Math.round(item.calories || 0),
        protein:    Math.round(item.protein || 0),
        totalCarbs: Math.round(item.totalCarbs || 0),
        totalFat:   Math.round(item.totalFat || 0),
        sodium:     Math.round(item.sodium || 0),
        fiber:      Math.round(item.fiber || 0),
      })),
      remaining: {
        calories: Math.round((targets.calories - totals.calories) / 50) * 50,
        protein:  Math.max(0, Math.round((targets.protein - totals.protein) / 5) * 5),
        sodium:   Math.max(0, Math.round((targets.sodium - totals.sodium) / 100) * 100),
        fiber:    Math.max(0, Math.round(targets.fiber - totals.fiber)),
      },
    };
  }, [activeMeal, items, today, targets, totals]);

  const blurbKey = blurbRequest ? `${today}|${uid}|${JSON.stringify(blurbRequest)}` : null;
  const blurb    = blurbKey ? blurbs[blurbKey] : undefined;

  useEffect(() => {
    if (wantsAI && blurbKey && blurbRequest) loadBlurb(blurbKey, blurbRequest);
  }, [wantsAI, blurbKey, blurbRequest, loadBlurb]);

  // ── Quick log feedback ──
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  useEffect(() => {
    if (!justAddedId) return;
    const id = setTimeout(() => setJustAddedId(null), 1500);
    return () => clearTimeout(id);
  }, [justAddedId]);

  function quickLog(item: MenuItem) {
    if (!activeMeal || !location) return;
    const slot = mapMealPeriodNameToSlot(activeMeal.name);
    addFoodEntry(today, slot, item, location.name);
    setJustAddedId(item.id);
    showToast(`Added ${item.name} to ${slot}`, "success");
  }

  if (!isToday) return null;

  const mealLabel = activeMeal ? activeMeal.name : "Your Next Meal";

  let body: React.ReactNode;
  if (!menu) {
    body = <EmptyNote>{isLoading ? "Loading today's menu…" : "Menu unavailable right now."}</EmptyNote>;
  } else if (!location) {
    // Higgins isn't in today's data — nothing sensible to recommend
    return null;
  } else if (!activeMeal) {
    const next = findNextMealPeriod(location.meals, now);
    body = (
      <EmptyNote>
        Higgins is closed right now.
        {next ? ` ${next.name} opens at ${next.startTime}.` : " Check back tomorrow."}
      </EmptyNote>
    );
  } else if (items.length === 0) {
    body = (
      <EmptyNote>
        {filteredOut
          ? "Nothing on the current menu matches your dietary preferences."
          : "No recommendations for this meal."}
      </EmptyNote>
    );
  } else {
    body = (
      <>
        {blurb && (
          <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.45 }}>
            ✨ {blurb}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {items.map(({ item, stationName, reason }) => (
            <RecommendedRow
              key={item.id}
              item={item}
              stationName={stationName}
              reason={REASON_LABELS[reason]}
              justAdded={justAddedId === item.id}
              onAdd={() => quickLog(item)}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="section-title" style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <span>Recommended for {mealLabel}</span>
        {activeMeal && (
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>
            Higgins · until {activeMeal.endTime}
          </span>
        )}
      </div>
      <div className="glass-2" style={{ padding: "0.75rem" }}>
        {body}
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-3)" }}>
      {children}
    </p>
  );
}

interface RowProps {
  item: MenuItem;
  stationName: string;
  reason: string;
  justAdded: boolean;
  onAdd: () => void;
}

function RecommendedRow({ item, stationName, reason, justAdded, onAdd }: RowProps) {
  // Guard: numeric fields may be null/NaN from unusual nutrition JSON blobs
  const calories = Number.isFinite(item.calories) ? item.calories : 0;
  const protein  = Number.isFinite(item.protein)  ? item.protein  : 0;
  const carbs    = Number.isFinite(item.totalCarbs) ? item.totalCarbs : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.55rem 0.6rem 0.55rem 0.75rem",
      background: "var(--color-surface-2)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-md)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: 3, minWidth: 0 }}>
          <span style={{
            flexShrink: 0, fontSize: "0.58rem", fontWeight: 700, color: "#34d399",
            background: "rgba(16,185,129,0.1)", padding: "0.1rem 0.35rem", borderRadius: "999px",
          }}>
            {reason}
          </span>
          <span style={{ fontSize: "0.65rem", color: "var(--color-text-3)", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {stationName}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-primary-light)", lineHeight: 1.1 }}>
          {calories} <span style={{ fontSize: "0.6rem", fontWeight: 500, color: "var(--color-text-3)" }}>cal</span>
        </div>
        <div style={{ fontSize: "0.65rem", color: "var(--color-text-3)", marginTop: 2 }}>
          P:{protein.toFixed(0)}g C:{carbs.toFixed(0)}g
        </div>
      </div>

      <button
        onClick={onAdd}
        aria-label={`Log ${item.name}`}
        style={{
          flexShrink: 0, width: 32, height: 32,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-full)",
          border: "none", cursor: "pointer",
          background: justAdded
            ? "rgba(16,185,129,0.2)"
            : "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
          color: justAdded ? "#34d399" : "#fff",
          fontSize: "1.1rem", fontWeight: 700, lineHeight: 1,
          transition: "background 0.2s",
        }}
      >
        {justAdded ? "✓" : "+"}
      </button>
    </div>
  );
}
