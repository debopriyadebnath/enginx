'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import CTASection from './components/CTASection';

const Index = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: '#010828' }}>
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-neon z-[100] origin-left shadow-[0_0_10px_#6fff00]"
        style={{ scaleX }}
      />

      {/* Texture overlay */}
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          backgroundImage: 'url(/texture.png)',
          backgroundSize: 'cover',
          mixBlendMode: 'lighten',
          opacity: 0.6,
        }}
      />

      <main>
        <HeroSection />
        <AboutSection />
        <CTASection />
      </main>
    </div>
  );
};

export default Index;
