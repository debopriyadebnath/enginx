import { Mail } from 'lucide-react';

const HERO_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4";

const SocialButton = ({ icon: Icon }: { icon: React.ElementType }) => (
  <button className="liquid-glass w-14 h-14 rounded-[1rem] flex items-center justify-center hover:bg-white/10 transition-colors">
    <Icon size={20} className="text-cream" />
  </button>
);

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden rounded-b-[32px]">
      {/* Video Background */}
      <video
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>

      {/* Bottom blur dissolve */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#010828] to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 max-w-[1831px] mx-auto px-4 sm:px-6 lg:px-10 min-h-screen flex">
        {/* Left Sidebar */}
        <div className="hidden lg:flex flex-col justify-between py-8 mr-8">
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
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-start pt-8 sm:pt-12 lg:pt-16">
          <div className="relative max-w-[780px]">
            <h2 className="font-grotesk text-[32px] sm:text-[44px] md:text-[56px] lg:text-[68px] uppercase text-cream leading-[1.1]">
              Turning Knowledge{' '}
              <br className="hidden sm:block" />
              into a Competitive Advantage
            </h2>

            {/* Mobile social icons */}
            <div className="flex lg:hidden gap-3 mt-8 justify-center">
              <SocialButton icon={Mail} />
              {/* <SocialButton icon={Twitter} />
              <SocialButton icon={Github} /> */}
            </div>
          </div>
        </div>

        {/* Desktop social icons - top right */}
        <div className="hidden lg:flex flex-col gap-3 absolute top-8 right-10">
          <SocialButton icon={Mail} />
          {/* <SocialButton icon={Twitter} />
          <SocialButton icon={Github} /> */}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
