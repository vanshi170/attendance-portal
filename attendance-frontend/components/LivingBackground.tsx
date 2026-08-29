'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function LivingBackground() {
  const prefersReducedMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);

  // Mouse positions for the sharp cursor glow
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring positions for the slow following blobs
  const springConfig = { damping: 40, stiffness: 50, mass: 2 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    setIsMounted(true);
    
    // Set initial positions to center of screen
    mouseX.set(window.innerWidth / 2);
    mouseY.set(window.innerHeight / 2);
    
    const handlePointerMove = (e: PointerEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [mouseX, mouseY]);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-white">
      {/* Base Canvas Color */}
      <div className="absolute inset-0 bg-canvas/30" />
      
      {/* 
        Blob 1: Rose Mist - Top Left, slow wander 
        Follows cursor with slight offset
      */}
      <motion.div
        className={cn(
          "absolute w-[600px] h-[600px] rounded-full blur-[80px] mix-blend-multiply opacity-30 bg-rose-mist",
          !prefersReducedMotion && "animate-blob"
        )}
        style={prefersReducedMotion ? {
          top: '0%',
          left: '0%',
        } : {
          x: smoothX,
          y: smoothY,
          translateX: '-70%',
          translateY: '-70%',
        }}
      />
      
      {/* 
        Blob 2: Thistle - Bottom Right
        Follows cursor with opposite offset
      */}
      <motion.div
        className={cn(
          "absolute w-[500px] h-[500px] rounded-full blur-[70px] mix-blend-multiply opacity-35 bg-thistle",
          !prefersReducedMotion && "animate-blob animation-delay-2000"
        )}
        style={prefersReducedMotion ? {
          bottom: '10%',
          right: '10%',
        } : {
          x: smoothX,
          y: smoothY,
          translateX: '-30%',
          translateY: '-30%',
        }}
      />

      {/* 
        Blob 3: Hot Pink - Center Right
        Slightly smaller, adds warmth to the mix
      */}
      <motion.div
        className={cn(
          "absolute w-[400px] h-[400px] rounded-full blur-[90px] mix-blend-multiply opacity-25 bg-hot-pink",
          !prefersReducedMotion && "animate-blob animation-delay-4000"
        )}
        style={prefersReducedMotion ? {
          top: '40%',
          right: '20%',
        } : {
          x: smoothX,
          y: smoothY,
          translateX: '-40%',
          translateY: '-50%',
        }}
      />

      {/* Responsive tight cursor glow (Hot Pink) */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full blur-[60px] opacity-15 bg-hot-pink mix-blend-screen"
          style={{
            x: mouseX,
            y: mouseY,
            translateX: '-50%',
            translateY: '-50%',
          }}
        />
      )}
    </div>
  );
}
