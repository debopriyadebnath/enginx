import { ChevronRight } from 'lucide-react';

const CARDS = [
  {
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_053923_22c0a6a5-313c-474c-85ff-3b50d25e944a.mp4",
    score: "8.7/10",
    big: "Real-Time Multiplayer Battles",
    small: "Compete with other players in fast-paced rounds where speed and accuracy decide the winner.",
  },
  {
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_054411_511c1b7a-fb2f-42ef-bf6c-32c0b1a06e79.mp4",
    score: "9/10",
    big: "Diverse Engineering Challenges",
    small: "Solve coding, computer science, and math problems designed to test your logic and problem-solving skills.",
  },
  {
    video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055427_ac7035b5-9f3b-4289-86fc-941b2432317d.mp4",
    score: "8.2/10",
    big: "Track Your Performance",
    small: "Track your performance, build winning streaks, and climb the leaderboard as you improve.",
  },
];

const AboutSection = () => {
  return (
    <section className="py-16 sm:py-24 lg:py-32" style={{ backgroundColor: '#010828' }}>
      <div className="max-w-[1831px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 sm:mb-20 gap-6">
          <h2 className="font-grotesk text-[32px] sm:text-[48px] lg:text-[60px] uppercase text-cream leading-[1.1]">
            Collection of
            <br />
            <span className="ml-8 sm:ml-16">&nbsp;&nbsp;Games</span>
          </h2>

          <button className="group">
            <div className="flex items-end gap-2">
              <span className="font-grotesk text-[32px] sm:text-[48px] lg:text-[60px] uppercase text-cream leading-none">SEE</span>
              <div className="flex flex-col font-grotesk uppercase text-cream leading-none">
                <span className="text-[20px] sm:text-[28px] lg:text-[36px]">ALL</span>
                <span className="text-[20px] sm:text-[28px] lg:text-[36px]">CREATORS</span>
              </div>
            </div>
            <div className="h-[6px] sm:h-[8px] lg:h-[10px] bg-neon w-full mt-2" />
          </button>
        </div>

        {/* Card Grid */}
        <div className="space-y-12 sm:space-y-20">
          {CARDS.map((card, i) => (
            <div
              key={i}
              className={`flex flex-col ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-6 lg:gap-12 items-center`}
            >
              {/* Card */}
              <div className="w-full lg:w-1/2 max-w-[560px]">
                <div className="liquid-glass rounded-[32px] p-[18px] hover:bg-white/10 transition-colors">
                  <div className="relative w-full pb-[100%] rounded-[24px] overflow-hidden">
                    <video
                      autoPlay loop muted playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    >
                      <source src={card.video} type="video/mp4" />
                    </video>
                  </div>

                  {/* Overlay bar */}
                  <div className="liquid-glass rounded-[20px] px-5 py-4 mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-cream/70 uppercase tracking-wider font-mono">RARITY SCORE:</span>
                      <span className="text-[16px] text-cream font-grotesk ml-2">{card.score}</span>
                    </div>
                    <button className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b724ff] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-purple-500/50 hover:scale-110 transition-transform">
                      <ChevronRight size={20} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Feature text */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center">
                <h3 className="font-grotesk text-[24px] sm:text-[32px] lg:text-[40px] uppercase text-cream leading-[1.1] mb-4">
                  {card.big}
                </h3>
                <p className="font-mono text-[14px] sm:text-[16px] text-cream/70 max-w-md leading-relaxed">
                  {card.small}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
