/**
 * @file src/pages/AIPage.tsx
 * @description The Gemini AI nutritionist chat interface.
 * Automatically injects today's logged food data as context with every message.
 */
import { useEffect, useRef, useState } from "react";
import { useDateStore, useFoodLogStore, useUserStore, useAIStore } from "@/stores";

export default function AIPage() {
  const { selectedDate } = useDateStore();
  const { getDailyTotals, getDailyEntries } = useFoodLogStore();
  const { macroTargets, userProfile } = useUserStore();
  const { chatHistory, isLoading, sendMessage, clearChat } = useAIStore();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const totals = getDailyTotals(selectedDate);

  const getYesterdayString = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d - 1);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${mm}-${dd}`;
  };

  const formatEntries = (entries: any[]) =>
    entries.map(e => ({ name: e.menuItemName, calories: e.calories, mealSlot: e.mealSlot }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const QUICK_PROMPTS = [
    "What should I eat next?",
    "Am I getting enough protein today?",
    "How do my macros look today?",
  ];

  async function handleSend(message: string = input.trim()) {
    if (!message || isLoading) return;
    setInput("");
    await sendMessage(message, {
      dailyTotals: totals,
      macroTargets,
      userName: userProfile?.name,
      goal: userProfile?.goal,
      dietaryRestrictions: userProfile?.dietaryRestrictions,
      todayLog: formatEntries(getDailyEntries(selectedDate)),
      yesterdayLog: formatEntries(getDailyEntries(getYesterdayString(selectedDate))),
    });
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      flex: 1, minHeight: 0,
      maxWidth: 480, margin: "0 auto", padding: "0 1rem", width: "100%"
    }}>
      {/* Header (Top actions) */}
      <div style={{ padding: "0.5rem 0", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        {chatHistory.length > 0 && (
          <button className="btn-ghost" onClick={clearChat} style={{ fontSize: "0.72rem" }}>
            New chat
          </button>
        )}
      </div>



      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem", paddingBottom: "0.5rem" }}>
        {chatHistory.length === 0 ? (
          /* Welcome state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1.5rem", gap: "0.5rem" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", fontWeight: 800, color: "#fff",
              marginBottom: "0.5rem", boxShadow: "0 4px 12px rgba(196, 30, 58, 0.3)"
            }}>AI</div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, textAlign: "center" }}>
              Hi{userProfile?.name ? `, ${userProfile.name}` : ""}! I'm your AI nutritionist.
            </h2>
            <p style={{ margin: "0.25rem 0 1rem", fontSize: "0.8rem", color: "var(--color-text-2)", textAlign: "center", maxWidth: 300 }}>
              I can see your food log and help with personalized nutrition advice. Try a quick question:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => handleSend(p)} style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--color-primary)",
                  background: "var(--color-primary-ghost)",
                  color: "var(--color-primary-light)",
                  fontSize: "0.72rem", fontWeight: 500,
                  cursor: "pointer", transition: "all 0.16s",
                  textAlign: "left",
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div key={msg.id} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: 26, height: 26, borderRadius: "var(--radius-sm)",
                  background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", marginRight: "0.4rem", flexShrink: 0, alignSelf: "flex-end",
                }}>AI</div>
              )}
              <div style={{
                maxWidth: "78%",
                padding: "0.6rem 0.85rem",
                borderRadius: msg.role === "user"
                  ? "var(--radius-lg) var(--radius-lg) 0 var(--radius-lg)"
                  : "var(--radius-lg) var(--radius-lg) var(--radius-lg) 0",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))"
                  : "var(--color-surface-2)",
                border: msg.role === "user" ? "none" : "1px solid var(--color-border)",
                fontSize: "0.83rem",
                lineHeight: 1.5,
                color: msg.role === "user" ? "#fff" : "var(--color-text-1)",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem" }}>
            <div style={{
              width: 26, height: 26, borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem",
            }}>AI</div>
            <div style={{
              padding: "0.6rem 0.85rem",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 0",
            }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--color-text-3)",
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        display: "flex", gap: "0.5rem", alignItems: "flex-end",
        padding: "0.75rem 0",
        paddingBottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
        flexShrink: 0,
        borderTop: "1px solid var(--color-border)",
      }}>
        <textarea
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask about your nutrition..."
          disabled={isLoading}
          rows={Math.min(4, input.split("\n").length || 1)}
          style={{ flex: 1, resize: "none", padding: "0.65rem 0.85rem", lineHeight: 1.4 }}
        />
        <button
          className="btn-primary"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          style={{ flexShrink: 0, padding: "0.65rem 1rem", opacity: (!input.trim() || isLoading) ? 0.5 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
