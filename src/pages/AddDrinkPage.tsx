import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDateStore, useWaterStore } from "@/stores";

const DRINKS = [
  { id: "water", name: "Water", emoji: "💧", ratio: 1.0 },
  { id: "milk", name: "Milk", emoji: "🥛", ratio: 1.0 },
  { id: "soda", name: "Soda", emoji: "🥤", ratio: 1.0 },
  { id: "coffee", name: "Coffee", emoji: "☕", ratio: 1.0 },
  { id: "tea", name: "Tea", emoji: "🍵", ratio: 1.0 },
  { id: "juice", name: "Juice", emoji: "🧃", ratio: 1.0 },
];

export default function AddDrinkPage() {
  const navigate = useNavigate();
  const { selectedDate } = useDateStore();
  const { addWater } = useWaterStore();

  const [amountStr, setAmountStr] = useState("1");
  const [unit, setUnit] = useState<"cups" | "oz" | "ml">("cups");

  function handleAdd(_drinkId: string) {
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    let cups = val;
    if (unit === "oz") cups = val / 8;
    else if (unit === "ml") cups = val / 240;

    // We simply add to the hydration tracker
    const roundedCups = Math.round(cups * 10000) / 10000;
    addWater(selectedDate, roundedCups);
    navigate(-1);
  }

  return (
    <div className="page" style={{ paddingBottom: "4rem" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "1.25rem" }}>
        <button className="btn-ghost" onClick={() => navigate(-1)} style={{ padding: "0.5rem" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, marginLeft: "0.25rem" }}>
          Log a Drink
        </h2>
      </div>

      <div className="glass-2" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "0.5rem", fontWeight: 600, color: "var(--color-text-2)", fontSize: "0.9rem" }}>
          Amount
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="number"
            className="input"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            style={{ flex: 1 }}
            placeholder="e.g. 1"
          />
          <select
            className="input"
            value={unit}
            onChange={(e) => setUnit(e.target.value as any)}
            style={{ width: "100px" }}
          >
            <option value="cups">Cups</option>
            <option value="oz">fl oz</option>
            <option value="ml">ml</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {DRINKS.map((drink) => (
          <button
            key={drink.id}
            onClick={() => handleAdd(drink.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "0.5rem", padding: "1.5rem 1rem",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: "2rem" }}>{drink.emoji}</span>
            <span style={{ fontWeight: 600, color: "var(--color-text-1)" }}>{drink.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
