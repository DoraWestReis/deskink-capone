import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';

export default function PipelineScrollArea({ children, onDragEnd }) {
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(100);
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  const rafId = useRef(null);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollWidth <= clientWidth) return;
    const trackWidth = track.clientWidth;
    const ratio = clientWidth / scrollWidth;
    const tw = Math.max(ratio * trackWidth, 50);
    const maxThumbLeft = trackWidth - tw;
    const scrollRatio = scrollLeft / (scrollWidth - clientWidth);
    setThumbWidth(tw);
    setThumbLeft(scrollRatio * maxThumbLeft);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(updateThumb);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    
    // Multiple delayed checks to catch late renders
    const t1 = setTimeout(updateThumb, 200);
    const t2 = setTimeout(updateThumb, 500);
    const t3 = setTimeout(updateThumb, 1000);

    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [updateThumb]);

  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartX.current = e.clientX ?? e.touches?.[0]?.clientX;
    dragStartScroll.current = scrollRef.current.scrollLeft;
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
  };

  const handleMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault?.();
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const deltaX = clientX - dragStartX.current;
    const ratio = el.scrollWidth / track.clientWidth;
    el.scrollLeft = dragStartScroll.current + deltaX * ratio;
  };

  const handleUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleUp);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleUp);
  };

  const handleTrackClick = (e) => {
    if (e.target !== trackRef.current) return;
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    el.scrollTo({
      left: (clickX / track.clientWidth) * (el.scrollWidth - el.clientWidth),
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <style>{`
        .pipeline-scroll-hide::-webkit-scrollbar { display: none !important; }
        .pipeline-scroll-hide { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          ref={scrollRef}
          className="pipeline-scroll-hide flex-1 min-h-0"
          style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="inline-flex h-full gap-3 p-4 sm:px-4" style={{ minWidth: 'max-content' }}>
            {children}
          </div>
        </div>
      </DragDropContext>

      {/* Scrollbar - fixed above bottom nav */}
      <div
        className="fixed left-0 right-0 border-t border-[#E7DED2] bg-[#F6F1EC] px-4 py-1.5"
        style={{ bottom: '92px', zIndex: 47 }}
      >
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative h-2.5 bg-[#E8E5E0] rounded-full cursor-pointer"
        >
          <div
            onMouseDown={handleThumbMouseDown}
            onTouchStart={handleThumbMouseDown}
            className="absolute top-0.5 h-1.5 bg-[#A09A90] rounded-full cursor-grab hover:bg-[#888] active:cursor-grabbing"
            style={{
              left: `${thumbLeft}px`,
              width: `${thumbWidth}px`,
              transition: isDraggingRef.current ? 'none' : 'left 0.05s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  );
}