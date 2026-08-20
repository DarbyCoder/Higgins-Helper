import { useRef, useState, useCallback } from "react";

export function useSwipeToDelete(onDelete: () => void, threshold = 80) {
  const [swipeX, setSwipeX] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  function haptic(ms = 40) {
    try { navigator.vibrate?.(ms); } catch { /* not supported */ }
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    isDragging.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.touches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 4) isDragging.current = true;

    if (dx < 0) {
      setSwipeX(Math.max(dx, -threshold - 30));
    } else {
      setSwipeX(0);
    }
  }, [threshold]);

  const triggerDelete = useCallback(() => {
    haptic(60);
    setDeleting(true);
    setSwipeX(-999);
    setTimeout(() => onDelete(), 280);
  }, [onDelete]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const finalX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const finalDx = finalX - touchStartX.current;
    touchStartX.current = null;

    if (finalDx < -threshold) {
      triggerDelete();
    } else {
      setSwipeX(0);
    }
    isDragging.current = false;
  }, [threshold, triggerDelete]);

  return {
    swipeX,
    deleting,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    triggerDelete,
  };
}
