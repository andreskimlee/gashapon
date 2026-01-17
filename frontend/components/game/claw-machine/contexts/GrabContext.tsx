"use client";

import type { RapierRigidBody } from "@react-three/rapier";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GameOutcome, GrabContextType } from "../types";

const GrabContext = createContext<GrabContextType | null>(null);

export function useGrabContext() {
  const ctx = useContext(GrabContext);
  if (!ctx) throw new Error("useGrabContext must be used within GrabProvider");
  return ctx;
}

type GrabProviderProps = {
  children: React.ReactNode;
  gameOutcome?: GameOutcome;
};

export function GrabProvider({ children, gameOutcome: propOutcome = null }: GrabProviderProps) {
  const ballRefsMap = useRef<
    Map<string, React.RefObject<RapierRigidBody | null>>
  >(new Map());
  const [grabbedBallId, setGrabbedBallId] = useState<string | null>(null);
  const [gameOutcome, setGameOutcome] = useState<GameOutcome>(propOutcome);

  // Sync state when prop changes
  useEffect(() => {
    console.log("[GrabContext] gameOutcome prop changed to:", propOutcome);
    setGameOutcome(propOutcome);
  }, [propOutcome]);

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
      gameOutcome,
      setGameOutcome,
    }),
    [registerBall, unregisterBall, grabbedBallId, getBallRefs, gameOutcome]
  );

  return <GrabContext.Provider value={value}>{children}</GrabContext.Provider>;
}

