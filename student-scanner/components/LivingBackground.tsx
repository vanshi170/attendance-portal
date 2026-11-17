'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

export default function LivingBackground() {
  const prefersReducedMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);

  // Mouse positions for the soft ambient follow
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for following movements
  const springConfig = { damping: 40, stiffness: 50, mass: 2 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      mouseX.set(window.innerWidth / 2);
      mouseY.set(window.innerHeight / 2);

      const handlePointerMove = (e: PointerEvent) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      };

      window.addEventListener('pointermove', handlePointerMove);
      return () => window.removeEventListener('pointermove', handlePointerMove);
    }
  }, [mouseX, mouseY]);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f0f7ff]">
      {/* Base Canvas */}
      <div className="absolute inset-0 bg-[#f0f7ff]/90" />

      {/* Blob 1: Pastel Sky Blue - Top Left */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[90px] mix-blend-multiply opacity-50 bg-sky-200"
        style={prefersReducedMotion ? {} : { x: smoothX, y: smoothY, top: '-15%', left: '-10%' }}
      />

      {/* Blob 2: Light Cyan / Ice Blue - Bottom Right */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full blur-[80px] mix-blend-multiply opacity-45 bg-blue-100"
        style={{ bottom: '-10%', right: '-10%' }}
      />

      {/* Blob 3: Soft Periwinkle Accent - Center */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[85px] mix-blend-multiply opacity-40 bg-sky-100"
        style={{ top: '30%', left: '20%' }}
      />
    </div>
  );
}
