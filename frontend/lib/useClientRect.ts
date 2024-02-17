import { useState, useLayoutEffect, useCallback, RefObject } from "react";

function useClientRect(ref: RefObject<HTMLElement>): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const handleResize = useCallback(() => {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect());
    }
  }, [ref]);

  useLayoutEffect(() => {
    if (!ref.current) return;

    handleResize();

    // Use ResizeObserver to listen for changes in the size of the ref's current element
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, handleResize]);

  return rect;
}

export default useClientRect;
