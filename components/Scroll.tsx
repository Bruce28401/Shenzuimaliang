import React, { useEffect, useState, useRef } from 'react';

interface ScrollProps {
  isOpen: boolean;
  imageUrl: string | null;
  onAnimationComplete?: () => void;
}

export const Scroll: React.FC<ScrollProps> = ({ isOpen, imageUrl, onAnimationComplete }) => {
  const [paperWidth, setPaperWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const paperRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number, w: number, o: number } | null>(null);

  // Helper to get max width based on screen size
  const getMaxWidth = () => Math.min(window.innerWidth * 0.8, 1600);

  // Handle Auto-Open / Close triggers from parent
  useEffect(() => {
    // Determine target width based on isOpen state
    if (isOpen) {
      setIsAnimating(true);
      setPaperWidth(getMaxWidth());
      setOffset(0); // Reset offset on auto-open to center it

      const completeTimer = setTimeout(() => {
        if(onAnimationComplete) onAnimationComplete();
      }, 6500); // Match duration + buffer

      return () => clearTimeout(completeTimer);
    } else {
      setIsAnimating(true);
      setPaperWidth(0);
      setOffset(0);

      // Trigger completion callback after closing animation finishes
      const completeTimer = setTimeout(() => {
        if(onAnimationComplete) onAnimationComplete();
      }, 6500); // Match duration + buffer

      return () => clearTimeout(completeTimer);
    }
  }, [isOpen, onAnimationComplete]);

  // Handle Drag Events
  const handleMouseDown = (side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Disable CSS animation immediately to allow manual control
    setIsAnimating(false);

    // Sync state with current DOM geometry if animation was interrupted
    let currentWidth = paperWidth;
    if (paperRef.current) {
        // We trust the browser's computed width if we were mid-animation
        const style = window.getComputedStyle(paperRef.current);
        currentWidth = parseFloat(style.width);
        setPaperWidth(currentWidth);
    }

    setIsDragging(side);
    dragStartRef.current = {
        x: e.clientX,
        w: currentWidth,
        o: offset
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !dragStartRef.current) return;
        
        const deltaX = e.clientX - dragStartRef.current.x;
        const startW = dragStartRef.current.w;
        const startO = dragStartRef.current.o;
        const maxW = getMaxWidth();

        let newW = startW;
        let newO = startO;

        if (isDragging === 'right') {
            // Dragging right handle
            // Moving right (+delta) increases width
            newW = Math.max(0, Math.min(maxW, startW + deltaX));
            
            // To keep left side stationary while width changes symmetrically in flex center,
            // we must shift center to the right by half the width increase.
            const effectiveChange = newW - startW;
            newO = startO + effectiveChange / 2;

        } else {
            // Dragging left handle
            // Moving left (-delta) increases width
            newW = Math.max(0, Math.min(maxW, startW - deltaX));
            
            // To keep right side stationary while width changes,
            // we must shift center to the left by half the width increase.
            const effectiveChange = newW - startW;
            newO = startO - effectiveChange / 2;
        }

        setPaperWidth(newW);
        setOffset(newO);
    };

    const handleMouseUp = () => {
        setIsDragging(null);
        dragStartRef.current = null;
    };

    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);

  // Recalculate max width on resize (optional but good for UX)
  useEffect(() => {
      const handleResize = () => {
          if (isOpen && !isDragging) {
              setPaperWidth(getMaxWidth());
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, isDragging]);


  return (
    <div className="relative flex items-center justify-center h-full w-full overflow-hidden py-10">
      
      {/* Scroll Wrapper with Transform for Offset */}
      <div 
        className="relative flex items-stretch h-[60vh] md:h-[70vh] shadow-2xl drop-shadow-2xl filter will-change-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        
        {/* Left Roller */}
        <div 
            className="z-20 relative flex flex-col items-center cursor-ew-resize group"
            onMouseDown={(e) => handleMouseDown('left', e)}
        >
          {/* Knob Top */}
          <div className="w-6 h-10 bg-amber-900 rounded-t-sm border-b border-amber-950 shadow-inner group-hover:brightness-110"></div>
          {/* Cylinder - Matched to paper color #fdf4e3 with shading */}
          <div className="w-8 md:w-10 flex-grow bg-gradient-to-r from-[#dccab0] via-[#fdf4e3] to-[#dccab0] shadow-[5px_0_15px_rgba(0,0,0,0.3)] rounded-l-sm border-r border-[#c0b090] group-hover:brightness-105"></div>
          {/* Knob Bottom */}
          <div className="w-6 h-10 bg-amber-900 rounded-b-sm border-t border-amber-950 shadow-inner group-hover:brightness-110"></div>
        </div>

        {/* The Painting / Paper Area */}
        <div 
          ref={paperRef}
          className={`
            relative overflow-hidden bg-[#fdf4e3] 
            flex items-center justify-center
            my-10
            ${isAnimating ? 'transition-all duration-[6000ms] ease-in-out' : ''}
          `}
          style={{ 
            width: `${paperWidth}px`,
            opacity: 1
          }}
        >
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none z-10" 
               style={{backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`}}></div>
          
          {/* Actual Content Wrapper - Fixed width to prevent squashing during animation */}
          {/* We position this centered. As the parent narrows, this is clipped. */}
          <div 
            className="relative z-10 h-full flex items-center justify-center shrink-0"
            style={{ width: 'min(80vw, 1600px)' }}
          >
             {imageUrl && (
               <div className="relative w-[95%] h-[86%] shadow-none bg-transparent flex items-center justify-center overflow-hidden">
                 <img 
                   src={imageUrl} 
                   alt="Ancient Painting" 
                   className="w-full h-full object-contain mix-blend-multiply opacity-85 select-none"
                   style={{ filter: 'sepia(0.3) contrast(1.1)', pointerEvents: 'none' }}
                 />
                 {/* Vignette for aged look */}
                 <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(62,39,35,0.2)_100%)] pointer-events-none"></div>
               </div>
             )}
          </div>
        </div>

        {/* Right Roller */}
        <div 
            className="z-20 relative flex flex-col items-center cursor-ew-resize group"
            onMouseDown={(e) => handleMouseDown('right', e)}
        >
          {/* Knob Top */}
          <div className="w-6 h-10 bg-amber-900 rounded-t-sm border-b border-amber-950 shadow-inner group-hover:brightness-110"></div>
          {/* Cylinder - Matched to paper color #fdf4e3 with shading */}
          <div className="w-8 md:w-10 flex-grow bg-gradient-to-l from-[#dccab0] via-[#fdf4e3] to-[#dccab0] shadow-[-5px_0_15px_rgba(0,0,0,0.3)] rounded-r-sm border-l border-[#c0b090] group-hover:brightness-105"></div>
          {/* Knob Bottom */}
          <div className="w-6 h-10 bg-amber-900 rounded-b-sm border-t border-amber-950 shadow-inner group-hover:brightness-110"></div>
        </div>

      </div>
      
      {/* Reflection/Shadow on the table */}
      <div 
        className="absolute bottom-[5vh] w-full h-4 bg-black/30 blur-xl rounded-[100%] transition-transform duration-75"
        style={{ transform: `translateX(${offset}px) scaleX(${Math.max(0.2, paperWidth / 1000)})` }}
      ></div>
    </div>
  );
};