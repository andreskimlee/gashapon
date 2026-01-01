"use client";

import type { RapierRigidBody } from "@react-three/rapier";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GrabContextType } from "../types";

const GrabContext = createContext<GrabContextType | null>(null);

export function useGrabContext() {
  const ctx = useContext(GrabContext);
  if (!ctx) throw new Error("useGrabContext must be used within GrabProvider");
  return ctx;
}

type GrabProviderProps = {
  children: React.ReactNode;
};

export function GrabProvider({ children }: GrabProviderProps) {
  const ballRefsMap = useRef<
    Map<string, React.RefObject<RapierRigidBody | null>>
  >(new Map());
  const [grabbedBallId, setGrabbedBallId] = useState<string | null>(null);

  const registerBall = useCallback(
    (id: string, ref: React.RefObject<RapierRigidBody | null>) => {
      ballRefsMap.current.set(id, ref);
    },
    []
  );

  const unregisterBall = useCallback((id: string) => {
    ballRefsMap.current.delete(id);
  }, []);

  const getBallRefs = useCallback(() => ballRefsMap.current, []);

  const value = useMemo<GrabContextType>(
    () => ({
      registerBall,
      unregisterBall,
      grabbedBallId,
      setGrabbedBallId,
      getBallRefs,
    }),
    [registerBall, unregisterBall, grabbedBallId, getBallRefs]
  );

  return <GrabContext.Provider value={value}>{children}</GrabContext.Provider>;
}

