/**
 * @file src/components/ui/Switch.tsx
 * @description On/off switch in the app's teal, iOS proportions.
 */
interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}

export default function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      style={{
        width: 50, height: 30, borderRadius: 999, border: "none", padding: 0, flexShrink: 0,
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "var(--color-primary)" : "var(--color-surface-3)",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.25s ease",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: 3,
        width: 24, height: 24, borderRadius: "50%", background: "#fff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        transform: checked ? "translateX(20px)" : "none",
        transition: "transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1)",
      }} />
    </button>
  );
}
