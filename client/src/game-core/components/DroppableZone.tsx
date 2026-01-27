import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "../utils/cn";

interface DroppableZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  acceptCards?: boolean;
}

export function DroppableZone({
  id,
  children,
  className,
  acceptCards = true,
}: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { acceptCards },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors duration-200",
        isOver && acceptCards && "bg-blue-100/50",
        className,
      )}
    >
      {children}
    </div>
  );
}
