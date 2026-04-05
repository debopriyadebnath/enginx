"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/session";

import { motion } from "framer-motion";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4";

const containerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const Login = () => {
  const router = useRouter();
  const { setToken } = useSession();
  const signIn = useMutation(api.sessions.signIn);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#010828]">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 transition-opacity duration-1000"
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>

      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#010828]/40 via-transparent to-[#010828]/80" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 z-30"
      >
        <Link
          href="/"
          className="group flex items-center gap-2 font-grotesk text-[16px] uppercase text-[#EFF4FF] tracking-wider"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          <span className="group-hover:text-[#6FFF00] transition-colors">EngineX</span>
        </Link>
      </motion.div>

      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-4">
        <motion.form
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ 
            scale: 1.01,
            boxShadow: "0 20px 80px rgba(111, 255, 0, 0.05)",
            border: "1px solid rgba(111, 255, 0, 0.2)"
          }}
          className="liquid-glass rounded-[32px] px-10 py-12 max-w-[420px] w-full border border-white/10 transition-all duration-300"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSubmitting(true);
            try {
              const form = e.currentTarget;
              const email = (form.elements.namedItem("email") as HTMLInputElement)
                .value;
              const password = (form.elements.namedItem("password") as HTMLInputElement)
                .value;
              const { token } = await signIn({ email, password });
              setToken(token);
              router.replace("/dashboard");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Sign in failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <motion.h2 
            variants={itemVariants}
            className="font-grotesk text-[36px] uppercase text-[#EFF4FF] mb-8 tracking-tight"
          >
            Sign <span className="text-[#6FFF00]">In</span>
          </motion.h2>

          <motion.div variants={itemVariants} className="space-y-4">
            <div className="relative group">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Email Address"
                className="font-mono bg-white/[0.03] border border-white/10 rounded-[14px] px-5 py-4 text-[#EFF4FF] placeholder:text-white/20 w-full focus:border-[#6FFF00]/50 focus:bg-white/[0.06] focus:outline-none transition-all hover:bg-white/[0.05] hover:border-white/20"
              />
            </div>
            
            <div className="relative group">
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                className="font-mono bg-white/[0.03] border border-white/10 rounded-[14px] px-5 py-4 text-[#EFF4FF] placeholder:text-white/20 w-full focus:border-[#6FFF00]/50 focus:bg-white/[0.06] focus:outline-none transition-all hover:bg-white/[0.05] hover:border-white/20"
              />
            </div>
          </motion.div>

          {error ? (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="font-mono text-red-400 text-sm mt-4 text-center"
            >
              {error}
            </motion.p>
          ) : null}

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="mt-8 w-full bg-[#6FFF00] text-[#010828] font-grotesk uppercase rounded-[14px] py-4 shadow-[0_0_20px_rgba(111,255,0,0.2)] hover:shadow-[0_0_30px_rgba(111,255,0,0.4)] hover:brightness-110 transition-all text-[16px] tracking-[0.2em] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </motion.button>
        </motion.form>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 font-mono text-white/40 text-sm"
        >
          New to the lab?{" "}
          <Link href="/signup" className="text-[#6FFF00] hover:text-[#6FFF00]/80 transition-colors font-bold underline-offset-4 hover:underline">
            Create an account
          </Link>
        </motion.p>
      </div>
    </div>
  );
};

export default Login;
