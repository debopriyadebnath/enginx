'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef, useState } from 'react';

export const ScrollPath = () => {
  const containerRef = useRef<SVGSVGElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef as any, // Cast for compatibility with Motion's expected Target type
    offset: ["start end", "end start"]
  });

  // Smooth out the scroll progress for the drawing effect
  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Interaction transformations
  const glowOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  const hoverScale = isHovered ? 1.5 : 1;
  const hoverBrightness = isHovered ? "brightness(1.5)" : "brightness(1)";

  // SVG Path: Meandering from top right to bottom left
  // Matching the curvature of image.png as closely as possible for the reveal mask
  const pathData = "M 85 0 C 70 150, 15 250, 15 450 C 15 650, 85 750, 85 950 C 85 1100, 50 1100, 50 1200";

  return (
    <div 
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)'
      }}
    >
      {/* High-Fidelity Reference Image Path */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{ 
          maskImage: `url(#reveal-mask)`, 
          WebkitMaskImage: `url(#reveal-mask)`, // Safari support
          maskType: 'alpha'
        }}
      >
        <img 
          src="/image.png" 
          alt="Data Stream" 
          className="w-full h-full object-cover"
          style={{ 
            filter: `${hoverBrightness} contrast(1.2)`,
            opacity: 0.9,
            transition: 'filter 0.5s ease'
          }}
        />
        
        {/* Dynamic Color Overlay to shift Purple -> Blue -> Green */}
        <div 
          className="absolute inset-0 z-10 mix-blend-color"
          style={{
            background: 'linear-gradient(to bottom, #B36B92, #3b82f6, #6fff00)',
            opacity: 0.8
          }}
        />
      </div>

      <svg
        ref={containerRef}
        viewBox="0 0 100 1200"
        preserveAspectRatio="none"
        className="w-full h-[120%] top-0 left-0"
        style={{ 
          filter: hoverBrightness,
          transition: 'filter 0.5s ease',
          pointerEvents: 'auto'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <defs>
          {/* Transition Mask: Reveals the image based on scroll */}
          <mask id="reveal-mask">
            <motion.path
              d={pathData}
              fill="transparent"
              stroke="white"
              strokeWidth={80} // Wide enough to cover the image path
              strokeLinecap="round"
              style={{ pathLength }}
            />
          </mask>

          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B36B92" /> 
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6fff00" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="plasma-noise" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="1" seed="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          <filter id="aura">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <linearGradient id="fade-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="black" />
            <stop offset="30%" stopColor="white" />
            <stop offset="70%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </linearGradient>

          <mask id="line-mask">
            <rect x="0" y="0" width="100" height="1200" fill="url(#fade-gradient)" />
          </mask>
        </defs>

        {/* 1. Atmospheric Aura (The wide plasma glow) */}
          <motion.path
            d={pathData}
            fill="transparent"
            stroke="url(#line-gradient)"
            strokeWidth={isHovered ? 16 : 12}
            strokeLinecap="round"
            mask="url(#line-mask)"
            style={{ 
              pathLength, 
              opacity: useTransform(scrollYProgress, (v: number) => v * 0.4),
              filter: "url(#aura) url(#plasma-noise)"
            }}
            animate={{ 
              opacity: [0.3, 0.5, 0.35, 0.45],
              strokeWidth: isHovered ? [16, 18, 15, 17] : [12, 14, 11, 13]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />

        {/* 2. Braided Energy Strands (Replacing the solid tube) */}
        {[1, -1, 0.5, -0.5].map((offset, idx) => (
          <motion.path
            key={`strand-${idx}`}
            d={pathData}
            fill="transparent"
            stroke="url(#line-gradient)"
            strokeWidth={0.5}
            strokeLinecap="round"
            strokeOpacity={0.4}
            mask="url(#line-mask)"
            style={{ 
              pathLength,
              x: offset * 2,
              y: offset * 1.5,
              filter: "url(#glow)"
            }}
            animate={{ 
              x: [offset * 2, offset * -1.5, offset * 2.5, offset * 2],
              y: [offset * 1.5, offset * 2.5, offset * -1, offset * 1.5],
              strokeOpacity: [0.3, 0.6, 0.4, 0.5]
            }}
            transition={{ 
              duration: 3 + idx, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
        ))}

        {/* 3. The Central Particle Singularity (Sharp Core) */}
        <motion.path
          d={pathData}
          fill="transparent"
          stroke="url(#line-gradient)"
          strokeWidth={isHovered ? 2.5 : 1.5}
          strokeLinecap="round"
          mask="url(#line-mask)"
          style={{ pathLength, filter: "brightness(1.5) url(#glow)" }}
        />
      </svg>

      {/* 4. Traveling Particles (Data pulses) - Handled as HTML to avoid SVG stretching */}
      {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => (
        <DataPulse 
          key={i} 
          path={pathData} 
          scrollProgress={scrollYProgress} 
          delay={offset} 
          isHovered={isHovered}
        />
      ))}
    </div>
  );
};

const DataPulse = ({ path, scrollProgress, delay, isHovered }: any) => {
  const particlePosition = useTransform(scrollProgress, (v: number) => {
    const loop = (v * 2 + delay) % 1;
    return loop;
  });

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: isHovered ? '4px' : '3px', // Smaller, more concentrated
        height: isHovered ? '4px' : '3px',
        borderRadius: '50%',
        backgroundColor: 'white',
        boxShadow: '0 0 15px white, 0 0 30px #b724ff, 0 0 45px #3b82f6',
        offsetPath: `path('${path}')`,
        offsetDistance: useTransform(particlePosition, (v: number) => `${v * 100}%`),
        opacity: useTransform(scrollProgress, (v: number) => (v > delay ? 1 : 0)),
        zIndex: 20,
        pointerEvents: 'none'
      }}
    >
      {/* Comet Tail - Using CSS back shadow to create a trail */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1" 
        style={{
          background: 'linear-gradient(to right, white, transparent)',
          filter: 'blur(2px)',
          borderRadius: 'full',
          transformOrigin: 'left center',
          rotate: '180deg', // Tail points backward along path
          opacity: 0.6
        }}
      />
    </motion.div>
  );
};
