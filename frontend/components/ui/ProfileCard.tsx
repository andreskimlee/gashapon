"use client";

import { CometCard } from "@/components/ui/comet-card";

// X (Twitter) icon from Simple Icons - https://simpleicons.org/?q=x
const XIcon = ({ className }: { className?: string }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

interface SocialLink {
  platform: "twitter" | "github" | "website";
  url: string;
  handle?: string;
}

interface Badge {
  label: string;
  color: "coral" | "mint" | "lavender" | "yellow";
}

interface ProfileCardProps {
  name: string;
  role?: string;
  imageUrl?: string;
  imagePlaceholder?: string;
  bio?: string;
  quote?: string;
  badges?: Badge[];
  socialLinks?: SocialLink[];
  shadowColor?: string;
  horizontal?: boolean;
}

const badgeColors = {
  coral: "bg-pastel-coral/30 text-rose-700 border-rose-400/50",
  mint: "bg-pastel-mint text-emerald-700 border-emerald-400/50",
  lavender: "bg-pastel-lavender text-purple-700 border-purple-400/50",
  yellow: "bg-pastel-yellow text-yellow-700 border-yellow-400/50",
};

export default function ProfileCard({
  name,
  role,
  imageUrl,
  imagePlaceholder,
  bio,
  quote,
  badges = [],
  socialLinks = [],
  shadowColor = "#8ECCC1",
  horizontal = false,
}: ProfileCardProps) {
  const twitterLink = socialLinks.find((l) => l.platform === "twitter");

  return (
    <CometCard rotateDepth={8} translateDepth={10}>
      <div
        className={`flex rounded-2xl bg-white border-2 border-[#111827] overflow-hidden ${
          horizontal ? "flex-col md:flex-row" : "flex-col"
        }`}
        style={{ boxShadow: `6px 8px 0 ${shadowColor}` }}
      >
        {/* Image Section */}
        <div
          className={`bg-[#E9EEF2] relative ${
            horizontal
              ? "w-full md:w-72 lg:w-80 shrink-0 aspect-square md:aspect-auto"
              : "aspect-square w-full"
          }`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : imagePlaceholder ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pastel-coral to-pastel-pink">
              <span className="font-display text-8xl text-white">
                {imagePlaceholder}
              </span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">👤</span>
            </div>
          )}

          {/* Role badge overlay */}
          {role && (
            <div className="absolute top-3 left-3">
              <span className="inline-block px-3 py-1 rounded-full text-sm font-bold uppercase border bg-white/90 backdrop-blur-sm text-[#111827] border-[#111827]/20">
                {role}
              </span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div
          className={`p-5 ${horizontal ? "md:p-6 flex flex-col justify-center" : ""}`}
        >
          {/* Name and Twitter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
            <h3
              className={`font-display text-[#111827] ${horizontal ? "text-2xl md:text-3xl" : "text-2xl"}`}
            >
              {name}
            </h3>
            {twitterLink && (
              <a
                href={twitterLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111827] text-white text-sm font-medium hover:bg-[#2a2a3a] transition-colors w-fit"
              >
                <XIcon className="w-3.5 h-3.5" />
                {twitterLink.handle || "Twitter"}
              </a>
            )}
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {badges.map((badge, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeColors[badge.color]}`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {bio && (
            <p
              className={`text-pastel-text leading-relaxed mb-4 ${horizontal ? "text-sm md:text-base" : "text-sm"}`}
            >
              {bio}
            </p>
          )}

          {/* Quote */}
          {quote && (
            <div className="p-4 rounded-xl bg-pastel-sky/50 border border-pastel-sky">
              <p
                className={`text-pastel-text italic ${horizontal ? "text-sm md:text-base" : "text-sm"}`}
              >
                &ldquo;{quote}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </CometCard>
  );
}
