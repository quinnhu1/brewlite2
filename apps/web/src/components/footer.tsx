"use client";
import { usePathname } from "next/navigation";
import React from "react";
import Link from "next/link";

export default function Footer() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return (
    <footer
      id="about"
      className="w-full bg-[#2B100C] text-white py-14 px-8 md:px-16 lg:px-24"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10 md:gap-12">
        {/* Brand Logo & Tagline */}
        <div className="flex flex-col space-y-2 max-w-xs">
          <h2 className="text-xl md:text-2xl font-black tracking-wider uppercase text-white">
            CRAFT &amp; GRIND
          </h2>
          <p className="text-sm text-white font-normal leading-relaxed opacity-90">
            Every cup tells the story of the bean
          </p>
        </div>

        {/* SERVICES */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-base font-bold tracking-wider uppercase text-white">
            SERVICES
          </h3>
          <ul className="flex flex-col space-y-2.5 text-sm text-white">
            <li>
              <Link
                href="/menu"
                className="hover:opacity-75 transition-opacity"
              >
                Menu
              </Link>
            </li>
            <li>
              <Link
                href="/cart"
                className="hover:opacity-75 transition-opacity"
              >
                My cart
              </Link>
            </li>
            <li>
              <Link
                href="/account"
                className="hover:opacity-75 transition-opacity"
              >
                My orders
              </Link>
            </li>
          </ul>
        </div>

        {/* INFORMATION */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-base font-bold tracking-wider uppercase text-white">
            INFORMATION
          </h3>
          <ul className="flex flex-col space-y-2.5 text-sm text-white">
            <li>
              <Link
                href="/account"
                className="hover:opacity-75 transition-opacity"
              >
                Account
              </Link>
            </li>
            <li>
              <Link
                href="/signin"
                className="hover:opacity-75 transition-opacity"
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                href="/signup"
                className="hover:opacity-75 transition-opacity"
              >
                Sign up
              </Link>
            </li>
          </ul>
        </div>

        {/* SOCIAL MEDIA */}
        <div className="flex flex-col space-y-4">
          <h3 className="text-base font-bold tracking-wider uppercase text-white">
            SOCIAL MEDIA
          </h3>
          <div className="flex items-center space-x-4 text-white">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="hover:opacity-75 transition-opacity text-white"
            >
              <svg
                className="w-6 h-6 stroke-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"
                />
              </svg>
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:opacity-75 transition-opacity text-white"
            >
              <svg
                className="w-6 h-6 stroke-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="5"
                  ry="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"
                />
                <line
                  x1="17.5"
                  y1="6.5"
                  x2="17.51"
                  y2="6.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>

            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="hover:opacity-75 transition-opacity text-white"
            >
              <svg
                className="w-6 h-6 stroke-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"
                />
                <rect
                  x="2"
                  y="9"
                  width="4"
                  height="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="4"
                  cy="4"
                  r="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
