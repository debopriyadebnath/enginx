"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/session";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4";

const Signup = () => {
  const router = useRouter();
  const { setToken } = useSession();
  const signUp = useMutation(api.sessions.signUp);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={HERO_VIDEO} type="video/mp4" />
      </video>

      <div className="absolute inset-0 z-10 bg-[#010828]/60" />

      <div className="absolute top-8 left-8 z-30">
        <Link
          href="/"
          className="font-grotesk text-[16px] uppercase text-[#EFF4FF] tracking-wider"
        >
          EngineX
        </Link>
      </div>

      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-4">
        <form
          className="liquid-glass rounded-[28px] px-10 py-10 max-w-[440px] w-full animate-fade-in-up"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const form = e.currentTarget;
            const password = (form.elements.namedItem("password") as HTMLInputElement)
              .value;
            const confirm = (form.elements.namedItem("confirm") as HTMLInputElement)
              .value;
            if (password !== confirm) {
              setError("Passwords do not match");
              return;
            }
            setSubmitting(true);
            try {
              const name = (form.elements.namedItem("name") as HTMLInputElement)
                .value;
              const email = (form.elements.namedItem("email") as HTMLInputElement)
                .value;
              const { token } = await signUp({
                email,
                password,
                name: name.trim() || undefined,
              });
              setToken(token);
              router.replace("/dashboard");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Sign up failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <h2 className="font-grotesk text-[28px] uppercase text-[#EFF4FF] mb-6">
            Create Account
          </h2>

          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Full Name"
            className="font-mono bg-white/5 border border-white/10 rounded-[12px] px-4 py-3 text-[#EFF4FF] placeholder:text-white/30 w-full mb-3 focus:border-[#6FFF00]/60 focus:outline-none transition-colors"
          />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email Address"
            className="font-mono bg-white/5 border border-white/10 rounded-[12px] px-4 py-3 text-[#EFF4FF] placeholder:text-white/30 w-full mb-3 focus:border-[#6FFF00]/60 focus:outline-none transition-colors"
          />
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="New Password"
            className="font-mono bg-white/5 border border-white/10 rounded-[12px] px-4 py-3 text-[#EFF4FF] placeholder:text-white/30 w-full mb-3 focus:border-[#6FFF00]/60 focus:outline-none transition-colors"
          />
          <input
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Confirm Password"
            className="font-mono bg-white/5 border border-white/10 rounded-[12px] px-4 py-3 text-[#EFF4FF] placeholder:text-white/30 w-full mb-2 focus:border-[#6FFF00]/60 focus:outline-none transition-colors"
          />

          {error ? (
            <p className="font-mono text-red-400 text-sm mb-3">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#6FFF00] text-[#010828] font-grotesk uppercase rounded-[12px] py-3 hover:brightness-110 transition font-bold text-[16px] disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 font-mono text-white/50 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-[#6FFF00] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
