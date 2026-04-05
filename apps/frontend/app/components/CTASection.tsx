'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Mail, Bird, Computer } from 'lucide-react';
import { useRef } from 'react';

const CTA_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055729_72d66327-b59e-4ae9-bb70-de6ccb5ecdb0.mp4";

const SocialIcon = ({ icon: Icon, last = false, index }: { icon: React.ElementType; last?: boolean; index: number }) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: 0.5 + index * 0.1 }}
    className={`w-[14vw] sm:w-[14.375rem] md:w-[10.78125rem] lg:w-[16.77rem] h-[14vw] sm:h-[14.375rem] md:h-[10.78125rem] lg:h-[5rem] flex items-center justify-center hover:bg-white/10 transition-colors ${!last ? 'border-b border-white/10' : ''}`}
  >
    <Icon size={20} className="text-cream" />
  </motion.button>
);

const CTASection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const textX = useTransform(scrollYProgress, [0, 0.5], [-100, 0]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.3, 0.6], [0, 1, 1]);

  return (
    <section ref={containerRef} className="relative w-full overflow-hidden">
      {/* Video - native aspect ratio */}
      <video
        autoPlay loop muted playsInline
        className="w-full h-auto block transform scale-105"
      >
        <source src={CTA_VIDEO} type="video/mp4" />
      </video>

      {/* Text overlay */}
      <div className="absolute inset-0 flex items-center justify-end lg:pr-[20%] lg:pl-[15%] px-4 sm:px-8">
        <motion.div style={{ x: textX, opacity: textOpacity }} className="relative">
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" as const }}
            className="absolute -top-6 sm:-top-8 lg:-top-12 left-0 font-condiment text-[17px] sm:text-[32px] md:text-[48px] lg:text-[68px] text-neon mix-blend-exclusion"
          >
            Go beyond
          </motion.span>

          <div className="font-grotesk text-[16px] sm:text-[24px] md:text-[40px] lg:text-[60px] uppercase text-cream leading-[1.15]">
            {["JOIN US.", "REVEAL WHAT'S HIDDEN.", "DEFINE WHAT'S NEXT.", "FOLLOW THE SIGNAL."].map((text, i) => (
              <motion.p 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                className={i === 0 ? "mb-4 sm:mb-6 md:mb-8 lg:mb-12" : ""}
              >
                {text}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom-left social strip */}
      <div className="absolute left-[8%] bottom-[12%] sm:bottom-[15%] lg:bottom-[20%]">
        <div className="liquid-glass rounded-[0.5rem] sm:rounded-[0.75rem] lg:rounded-[1.25rem] flex flex-col">
          <SocialIcon icon={Computer} index={0} />
          <SocialIcon icon={Bird} index={1} />
          <SocialIcon icon={Mail} index={2} />
        </div>
      </div>
    </section>
  );
};

export default CTASection;
