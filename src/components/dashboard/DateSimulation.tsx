/**
 * @file src/components/dashboard/DateSimulation.tsx
 * @description A compact toggle on the dashboard that lets users pretend the app
 * thinks it's a different date. When enabled, a date input appears and the app
 * uses that date as "today" for menus, log lookups, and date highlighting.
 *
 * This is useful for:
 *   - Previewing future menus before the day arrives
 *   - Reviewing historical data as if you were in that day
 *   - Testing / demo purposes
 */
import { useDateStore } from "@/stores";

export default function DateSimulation() {
  const { simulatedToday, setSimulatedToday, clearSimulatedToday } = useDateStore();
  const isActive = simulatedToday !== null;

  // Real system today for the date input's default/max
  const realToday = new Date().toISOString().slice(0, 10);

  return (
    <div style={{
      padding: "0.6rem 0.85rem",
      borderRadius: "var(--radius-md)",
      background: isActive ? "rgba(196,30,58,0.1)" : "var(--color-surface-2)",
      border: `1px solid ${isActive ? "rgba(196,30,58,0.3)" : "var(--color-border)"}`,
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      transition: "all 0.2s",
    }}>
      {/* Calendar icon */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke={isActive ? "var(--color-primary-light)" : "var(--color-text-3)"}
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0 }}>
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: isActive ? "var(--color-primary-light)" : "var(--color-text-2)" }}>
          {isActive ? "🗓 Date Simulation Active" : "Simulate a Date"}
        </div>
        {!isActive && (
          <div style={{ fontSize: "0.62rem", color: "var(--color-text-3)", marginTop: 1 }}>
            Test menus & logs for any date
          </div>
        )}

        {/* Date input — shown when simulation is active */}
        {isActive && (
          <input
            type="date"
            value={simulatedToday}
            onChange={(e) => {
              if (e.target.value) setSimulatedToday(e.target.value);
            }}
            style={{
              marginTop: "0.3rem",
              background: "transparent",
              border: "none",
              color: "var(--color-text-1)",
              fontFamily: "inherit",
              fontSize: "0.82rem",
              fontWeight: 700,
              outline: "none",
              cursor: "pointer",
              padding: 0,
              // colorScheme so the browser calendar matches our dark/light theme
              colorScheme: "dark",
            }}
          />
        )}
      </div>

      {/* Toggle switch */}
      <button
        role="switch"
        aria-checked={isActive}
        onClick={() => isActive ? clearSimulatedToday() : setSimulatedToday(realToday)}
        style={{
          flexShrink: 0,
          width: 40,
          height: 22,
          borderRadius: 999,
          border: "none",
          background: isActive
            ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))"
            : "var(--color-surface-3)",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s",
          padding: 0,
          boxShadow: isActive ? "0 0 12px rgba(196,30,58,0.4)" : "none",
        }}
        aria-label="Toggle date simulation"
      >
        <span style={{
          position: "absolute",
          top: 3, left: isActive ? 21 : 3,
          width: 16, height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}
