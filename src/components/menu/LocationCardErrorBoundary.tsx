/**
 * @file src/components/menu/LocationCardErrorBoundary.tsx
 * @description React Error Boundary that wraps each LocationCard.
 *
 * Without this, a render error in ONE location's card (e.g. malformed nutrition
 * JSON from The Table at Higgins) crashes the ENTIRE Menu tab — the user sees a
 * blank white screen with no way to recover except refreshing the page.
 *
 * With this boundary, a failing card is replaced with a friendly error message
 * and the rest of the menu loads normally.
 */
import { Component, type ReactNode } from "react";

interface Props {
  locationName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class LocationCardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: { componentStack: string }) {
    console.error(
      `[LocationCard] Render error for "${this.props.locationName}":`,
      err,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="glass"
          style={{
            padding: "1rem",
            borderLeft: "3px solid rgba(239,68,68,0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--color-text-1)" }}>
                {this.props.locationName}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: 2 }}>
                Couldn't display this location — the menu data may be malformed.
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
