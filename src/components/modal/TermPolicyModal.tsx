"use client";
import { hrAccessProfileNames } from "@/lib/constants";
import {
  attendanceAdminRoute,
  rootEmployeeRoute,
  rootHrRoute,
} from "@/lib/paths";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function TermPolicyModal() {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const session = useSession();

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      const scrolledHeight = parseInt(
        (el.scrollTop + el.clientHeight).toFixed()
      );
      const isAtBottom = el.scrollHeight === scrolledHeight;
      setScrolledToBottom(isAtBottom);
    }
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(event.target.checked);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
      return () => el.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const handleClick = () => {
    if (session?.data?.user.userType === "ATTENDANCE_ADMIN") {
      router.push(attendanceAdminRoute);
      return;
    }

    if (hrAccessProfileNames.includes(session?.data?.user.profile)) {
      // router.push("/dashboard/hr");
      router.push(rootHrRoute);
    } else {
      // router.push("/dashboard/employee");
      router.push(rootEmployeeRoute);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-black space-y-6">
      <h2 className="text-2xl font-semibold text-center text-[var(--foreground)]">
        Terms and Conditions
      </h2>

      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto border border-[var(--primary-background)] rounded-lg p-4  shadow-inner text-sm text-[var(--foreground)] custom-scroll"
      >
        <p>
          By using this app, you agree not to misuse or exploit its features in
          any unlawful, harmful, or abusive manner. Any attempt to interfere
          with the proper functioning of the app, including unauthorized access
          or tampering, is strictly prohibited. We reserve the right to suspend
          or terminate access for users found violating these terms. <br />
          <br />
          Users must use this app responsibly and ethically. Any form of
          spamming, harassment, or inappropriate behavior will lead to immediate
          suspension or legal action if necessary. We aim to maintain a safe and
          respectful environment for all users. <br />
          <br />
          This app is intended for personal and lawful use only. Misuse, such as
          attempting to hack, duplicate, or manipulate the system, is a
          violation of our terms and will result in a permanent ban without
          notice. <br />
          <br />
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="agree"
          checked={isChecked}
          disabled={!scrolledToBottom}
          onChange={handleCheckboxChange}
          className="w-5 h-5 rounded border-[var(--secondary-background)] checked:bg-[var(--primary-background)] checked:border-[var(--primary-background)] focus:ring-[var(--primary-background)] transition duration-200"
        />
        <label
          htmlFor="agree"
          className={`text-sm ${
            scrolledToBottom ? "opacity-100" : "opacity-50"
          }`}
          style={{ color: "var(--foreground)" }}
        >
          I have read and agree to the Terms and Conditions
        </label>
      </div>

      <div className="flex justify-end">
        <button
          className="bg-[var(--primary-background)] px-6 py-3 rounded-lg text-white font-medium border cursor-pointer disabled:bg-gray-300 transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-[var(--primary-background)] focus:ring-opacity-50 disabled:opacity-50"
          disabled={!scrolledToBottom || !isChecked}
          onClick={() => handleClick()}
        >
          Agree & Continue
        </button>
      </div>
    </div>
  );
}
