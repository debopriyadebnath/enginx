import { Mail} from 'lucide-react';

const CTA_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055729_72d66327-b59e-4ae9-bb70-de6ccb5ecdb0.mp4";

const SocialIcon = ({ icon: Icon, last = false }: { icon: React.ElementType; last?: boolean }) => (
  <button
    className={`w-[14vw] sm:w-[14.375rem] md:w-[10.78125rem] lg:w-[16.77rem] h-[14vw] sm:h-[14.375rem] md:h-[10.78125rem] lg:h-[5rem] flex items-center justify-center hover:bg-white/10 transition-colors ${!last ? 'border-b border-white/10' : ''}`}
  >
    <Icon size={20} className="text-cream" />
  </button>
);

const CTASection = () => {
  return (
    <section className="relative w-full">
      {/* Video - native aspect ratio */}
      <video
        autoPlay loop muted playsInline
        className="w-full h-auto block"
      >
        <source src={CTA_VIDEO} type="video/mp4" />
      </video>

      {/* Text overlay */}
      <div className="absolute inset-0 flex items-center justify-end lg:pr-[20%] lg:pl-[15%] px-4 sm:px-8">
        <div className="relative">
          <span className="absolute -top-6 sm:-top-8 lg:-top-12 left-0 font-condiment text-[17px] sm:text-[32px] md:text-[48px] lg:text-[68px] text-neon mix-blend-exclusion">
            Go beyond
          </span>

          <div className="font-grotesk text-[16px] sm:text-[24px] md:text-[40px] lg:text-[60px] uppercase text-cream leading-[1.15]">
            <p className="mb-4 sm:mb-6 md:mb-8 lg:mb-12">JOIN US.</p>
            <p>REVEAL WHAT'S HIDDEN.</p>
            <p>DEFINE WHAT'S NEXT.</p>
            <p>FOLLOW THE SIGNAL.</p>
          </div>
        </div>
      </div>

      {/* Bottom-left social strip */}
      <div className="absolute left-[8%] bottom-[12%] sm:bottom-[15%] lg:bottom-[20%]">
        <div className="liquid-glass rounded-[0.5rem] sm:rounded-[0.75rem] lg:rounded-[1.25rem] flex flex-col">
          <SocialIcon icon={Mail} />
          {/* <SocialIcon icon={Twitter} />
          <SocialIcon icon={Github} last /> */}
        </div>
      </div>
    </section>
  );
};

export default CTASection;
