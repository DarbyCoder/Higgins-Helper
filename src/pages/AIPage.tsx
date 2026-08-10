/**
 * @file src/pages/AIPage.tsx
 * @description The Gemini AI nutritionist chat interface.
 * Automatically injects today's logged food data as context with every message.
 */
import { useEffect, useRef, useState } from "react";
import { useDateStore, useFoodLogStore, useUserStore, useAIStore } from "@/stores";

export default function AIPage() {
  const { selectedDate }     = useDateStore();
  const { getDailyTotals }   = useFoodLogStore();
  const { macroTargets, userProfile } = useUserStore();
  const { chatHistory, isLoading, sendMessage, clearChat } = useAIStore();

  const [input, setInput]    = useState("");
  const bottomRef            = useRef<HTMLDivElement>(null);
  const totals               = getDailyTotals(selectedDate);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const QUICK_PROMPTS = [
    "What should I eat for dinner tonight?",
    "Am I getting enough protein today?",
    "Can you suggest a high-protein snack?",
    "How do my macros look today?",
    "What's a good post-workout meal from the dining hall?",
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
    });
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100dvh - 4rem)", /* full height minus bottom nav */
      maxWidth: 480, margin: "0 auto", padding: "0 1rem",
    }}>
      {/* Header */}
      <div style={{ padding: "1rem 0 0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>AI Advisor</h1>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "var(--color-text-3)" }}>
            Powered by Gemini · Knows your food log
          </p>
        </div>
        {chatHistory.length > 0 && (
          <button className="btn-ghost" onClick={clearChat} style={{ fontSize: "0.72rem" }}>
            New chat
          </button>
        )}
      </div>

      {/* Context bar */}
      <div style={{
        padding: "0.5rem 0.75rem",
        background: "var(--color-primary-ghost)",
        border: "1px solid var(--color-primary-dim)",
        borderRadius: "var(--radius-md)",
        marginBottom: "0.75rem",
        fontSize: "0.72rem",
        color: "var(--color-text-2)",
        flexShrink: 0,
      }}>
        📊 Today: <strong style={{ color: "var(--color-text-1)" }}>{totals.calories.toLocaleString()} kcal</strong> eaten
        · <strong>{totals.protein.toFixed(0)}g</strong> protein
        · Goal: <strong>{macroTargets.calories.toLocaleString()} kcal</strong>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem", paddingBottom: "0.5rem" }}>
        {chatHistory.length === 0 ? (
          /* Welcome state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1.5rem", gap: "0.5rem" }}>
            <div style={{ fontSize: "3rem" }}>🤖</div>
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
                {[0,1,2].map((i) => (
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
        display: "flex", gap: "0.5rem",
        padding: "0.75rem 0",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        flexShrink: 0,
        borderTop: "1px solid var(--color-border)",
      }}>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
          placeholder="Ask about your nutrition..."
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <button
          className="btn-primary"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          style={{ flexShrink: 0, padding: "0.65rem 1rem", opacity: (!input.trim() || isLoading) ? 0.5 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
