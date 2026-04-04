'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const HERO_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const Signup = () => {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>

      <div className="absolute inset-0 z-10 bg-[#010828]/60" />

      <div className="absolute top-8 left-8 z-30">
        <Link href="/" className="font-anton text-[16px] uppercase text-[#EFF4FF] tracking-wider">
          EngineX
        </Link>
      </div>

      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="liquid-glass rounded-[28px] px-10 py-10 max-w-[440px] w-full animate-fade-in-up">
          <h2 className="font-anton text-[28px] uppercase text-[#EFF4FF] mb-6">Create Account</h2>

          <input
            type="text"
            placeholder="Full Name"
            className="font-mono bg-white/5 border border-white/10 rounded-[12px] px-4 py-3 text-[#EFF4FF] placeholder:text-white/30 w-full mb-3 focus:border-[#6FFF00]/60 focus:outline-none transition-colors"
          />
          <input
            type="email"
            placeholder="Email Address"
            className="font-mono bg-white/5 border border-white/10 rounded-[12px] px-4 py-3 text-[#EFF4FF] placeholder:text-white/30 w-full mb-3 focus:border-[#6FFF00]/60 focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="New Password"
            className="font-mono bg-white/5 border border-white/10 rounded-[12px] px-4 py-3 text-[#EFF4FF] placeholder:text-white/30 w-full mb-3 focus:border-[#6FFF00]/60 focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="font-mono bg-white/5 border border-white/10 rounded-[12px] px-4 py-3 text-[#EFF4FF] placeholder:text-white/30 w-full mb-5 focus:border-[#6FFF00]/60 focus:outline-none transition-colors"
          />

          <button
            onClick={() => router.push('/')}
            className="w-full bg-[#6FFF00] text-[#010828] font-anton uppercase rounded-[12px] py-3 hover:brightness-110 transition font-bold text-[16px]"
          >
            Sign Up
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-mono text-white/40 text-sm">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button className="w-full liquid-glass rounded-[12px] py-3 flex items-center justify-center gap-3 hover:bg-white/10 transition">
            <GoogleIcon />
            <span className="font-mono text-[#EFF4FF] text-sm">Sign up with Google</span>
          </button>
        </div>

        <p className="mt-6 font-mono text-white/50 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-[#6FFF00] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
