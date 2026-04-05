'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Mail } from 'lucide-react';

const HERO_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4";

const SocialButton = ({ icon: Icon, index }: { icon: React.ElementType; index: number }) => (
  <motion.button 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.5 + index * 0.1 }}
    className="liquid-glass w-14 h-14 rounded-[1rem] flex items-center justify-center hover:bg-white/10 transition-colors"
  >
    <Icon size={20} className="text-cream" />
  </motion.button>
);

const HeroSection = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);

  return (
    <section className="relative min-h-screen overflow-hidden rounded-b-[32px]">
      {/* Video Background with Parallax */}
      <motion.div style={{ y }} className="absolute inset-0 w-full h-full">
        <video
          autoPlay loop muted playsInline
          className="w-full h-full object-cover scale-110" // Slightly scaled to avoid edges during parallax
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      </motion.div>

      {/* Bottom blur dissolve */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#010828] to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 max-w-[1831px] mx-auto px-4 sm:px-6 lg:px-10 min-h-screen flex">
        {/* Left Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden lg:flex flex-col justify-between py-8 mr-8"
        >
          {/* Logo */}
          <div>
            <span className="font-grotesk text-[16px] uppercase text-cream tracking-wider">EngineX</span>
            <div className="w-full h-px bg-white/20 my-4" />
            {/* Nav */}
            <nav className="liquid-glass rounded-[28px] px-[52px] py-[24px]">
              <a href="/login" className="font-grotesk text-[13px] uppercase text-cream hover:text-neon transition-colors">
                Get Started
              </a>
            </nav>
          </div>
          {/* Profile placeholder */}
          <div className="w-8 h-8 rounded-full bg-white/10" />
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-start pt-8 sm:pt-12 lg:pt-16">
          <div className="relative max-w-[780px]">
            <motion.h2 
              initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="font-grotesk text-[32px] sm:text-[44px] md:text-[56px] lg:text-[68px] uppercase text-cream leading-[1.1]"
            >
              Turning Knowledge{' '}
              <br className="hidden sm:block" />
              into a Competitive Advantage
            </motion.h2>

            {/* Mobile social icons */}
            <div className="flex lg:hidden gap-3 mt-8 justify-center">
              <SocialButton icon={Mail} index={0} />
            </div>
          </div>
        </div>

        {/* Desktop social icons - top right */}
        <div className="hidden lg:flex flex-col gap-3 absolute top-8 right-10">
          <SocialButton icon={Mail} index={0} />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
