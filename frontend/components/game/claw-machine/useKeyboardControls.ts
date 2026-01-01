import { useEffect, useRef } from "react";
import type { KeyboardState } from "./types";

const DEFAULT_KEYS: KeyboardState = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  Space: false,
};

export function useKeyboardControls() {
  const keysRef = useRef<KeyboardState>({ ...DEFAULT_KEYS });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code in keysRef.current) {
        e.preventDefault();
        keysRef.current[e.code as keyof KeyboardState] = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code in keysRef.current) {
        keysRef.current[e.code as keyof KeyboardState] = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return keysRef;
}


