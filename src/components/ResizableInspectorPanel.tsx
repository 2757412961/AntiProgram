import React, { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, useEffect, useRef, useState } from 'react';

const MIN_WIDTH = 300;
const MAX_WIDTH = 640;
const MIN_REMAINING_CONTENT_WIDTH = 360;
const DEFAULT_WIDTH = 360;
const KEYBOARD_STEP = 16;

interface ResizableInspectorPanelProps {
  children: ReactNode;
  className?: string;
  storageKey?: string;
}

type ResizeStyle = CSSProperties & { '--inspector-width': string };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function readStoredWidth(storageKey: string) {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;

  const storedValue = window.localStorage.getItem(storageKey);
  if (storedValue === null) return DEFAULT_WIDTH;

  const storedWidth = Number(storedValue);
  return Number.isFinite(storedWidth)
    ? clamp(storedWidth, MIN_WIDTH, MAX_WIDTH)
    : DEFAULT_WIDTH;
}

export const ResizableInspectorPanel: React.FC<ResizableInspectorPanelProps> = ({
  children,
  className = '',
  storageKey = 'card-inspector-width',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ pointerX: 0, width: DEFAULT_WIDTH });
  const [width, setWidth] = useState(() => readStoredWidth(storageKey));
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(Math.round(width)));
  }, [storageKey, width]);

  useEffect(() => {
    if (!isResizing) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizing]);

  const getMaximumWidth = () => {
    const parentWidth = panelRef.current?.parentElement?.getBoundingClientRect().width;
    if (!parentWidth) return MAX_WIDTH;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parentWidth - MIN_REMAINING_CONTENT_WIDTH));
  };

  const updateWidth = (nextWidth: number) => {
    setWidth(clamp(nextWidth, MIN_WIDTH, getMaximumWidth()));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      width: panelRef.current?.getBoundingClientRect().width ?? width,
    };
    setIsResizing(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    updateWidth(dragStartRef.current.width + dragStartRef.current.pointerX - event.clientX);
  };

  const stopResizing = (event: PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextWidth: number | undefined;
    if (event.key === 'ArrowLeft') nextWidth = width + KEYBOARD_STEP;
    if (event.key === 'ArrowRight') nextWidth = width - KEYBOARD_STEP;
    if (event.key === 'Home') nextWidth = MIN_WIDTH;
    if (event.key === 'End') nextWidth = getMaximumWidth();
    if (nextWidth === undefined) return;

    event.preventDefault();
    updateWidth(nextWidth);
  };

  const style: ResizeStyle = { '--inspector-width': `${width}px` };

  return (
    <div
      ref={panelRef}
      className={`resizable-inspector-shell${isResizing ? ' is-resizing' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <div
        className="inspector-resize-handle"
        role="separator"
        aria-label="调整右侧信息栏宽度"
        aria-orientation="vertical"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={Math.round(getMaximumWidth())}
        aria-valuenow={Math.round(width)}
        tabIndex={0}
        title="拖动调整宽度，双击恢复默认宽度"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopResizing}
        onPointerCancel={stopResizing}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => updateWidth(DEFAULT_WIDTH)}
      />
      {children}
    </div>
  );
};
