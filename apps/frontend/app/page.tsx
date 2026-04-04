import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import CTASection from './components/CTASection';

const Index = () => {
  return (
    <div className="relative min-h-screen" style={{ backgroundColor: '#010828' }}>
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

      <HeroSection />
      <AboutSection />
      <CTASection />
    </div>
  );
};

export default Index;
