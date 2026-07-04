import { useState, useEffect } from "react";

// 寬螢幕（平板橫向/電腦）判斷，用來切換多欄排版
export function useIsWide(breakpoint = 900) {
  const [isWide, setIsWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= breakpoint);
  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isWide;
}
