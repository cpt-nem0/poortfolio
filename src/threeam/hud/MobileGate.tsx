"use client";

import Link from "next/link";

export function MobileGate() {
  return (
    <div className="grid h-full w-full place-items-center bg-[#0a0916] px-6 font-mono text-sm text-[#9d8fd8]">
      <div className="max-w-sm text-center">
        <p className="text-base text-[#c9bfef]">it&apos;s 3am in here.</p>
        <p className="mt-2">
          the house needs a keyboard — here&apos;s the 9am version instead.
        </p>
        <Link
          href="/9am"
          className="mt-6 inline-block rounded border border-[#9d8fd8]/40 bg-[#9d8fd8]/10 px-5 py-3 text-base text-[#c9bfef] transition-colors hover:border-[#c9bfef] hover:bg-[#9d8fd8]/20"
        >
          → the 9am version
        </Link>
      </div>
    </div>
  );
}
