import { useCallback, useState } from "react";

const useClientRect = () => {
  const [rect, setRect] = useState(null);
  const ref = useCallback((node: any) => {
    if (node !== null) {
      setRect(node.getBoundingClientRect());
    }
  }, []);
  return [rect as DOMRect | null, ref];
};

export default useClientRect;
