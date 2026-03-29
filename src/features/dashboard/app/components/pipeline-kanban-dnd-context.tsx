"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Quando true, o card em arraste não aplica transform (usa {@link DragOverlay} no board). */
const KanbanDragOverlayContext = createContext(false);

export function KanbanDragOverlayProvider({ children }: { children: ReactNode }) {
  return <KanbanDragOverlayContext.Provider value={true}>{children}</KanbanDragOverlayContext.Provider>;
}

export function useKanbanDragOverlayMode(): boolean {
  return useContext(KanbanDragOverlayContext);
}
