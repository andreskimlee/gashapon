/**
 * Home GameCard (reference-inspired)
 *
 * Matches the sample layout:
 * - White card container with black border
 * - Right-biased mint drop shadow (#8ECCC1)
 * - Full-height left image panel (placeholder)
 * - Right content column with prize preview squircle and CTA
 */

'use client';

import Link from 'next/link';
import CTAButton from '@/components/ui/CTAButton';
import { cn } from '@/utils/helpers';

export type HomeGameCardModel = {
  id: number | string;
  name: string;
  image: string; // placeholder for now
  room: string;
  cost: number;
};

export default function GameCard({
  game,
  className,
}: {
  game: HomeGameCardModel;
  className?: string;
}) {
  const cardStyle: React.CSSProperties = {
    border: '2px solid #111827',
    borderRight: '4px solid #111827',
    borderBottom: '5px solid #111827',
    boxShadow: '6px 8px 0 #8ECCC1',
  };

  return (
    <Link href={`/games/${game.id}`} className="block">
      <div
        className={cn(
          'bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1',
          className
        )}
        style={cardStyle}
      >
        <div className="flex">
          {/* Left image panel (full height) */}
          <div className="w-44 bg-[#CFEFEA] p-3">
            <div className="h-full min-h-[210px] rounded-xl border-2 border-[#111827] bg-white/10 flex items-center justify-center">
              {/* Placeholder image area */}
              <div className="text-6xl select-none">{game.image}</div>
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 p-4 flex flex-col">
            <h3 className="font-display text-xl leading-none text-[#111827]">
              {game.name.toUpperCase()}
            </h3>

            <div className="mt-2">
              <div className="text-[10px] font-bold text-[#111827] uppercase tracking-wide">
                PRIZE PREVIEW
              </div>
              <div className="mt-2 w-20 h-20 rounded-2xl border-2 border-[#111827] bg-[#E9EEF2] flex items-center justify-center">
                <span className="text-3xl select-none">{game.image}</span>
              </div>
            </div>

            <div className="mt-4 text-sm text-[#111827] leading-tight">
              <div className="font-bold">
                ROOM: <span className="font-extrabold">{game.room}</span>
              </div>
              <div className="mt-1 font-bold flex items-center gap-2">
                <span>COST:</span>
                <span className="px-2 py-0.5 rounded-md bg-[#FFE39A] border border-[#111827]/20 font-extrabold">
                  {game.cost} COINS
                </span>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <CTAButton
                size="sm"
                variant="pink"
                className="w-full text-xs py-2"
              >
                ENTER ROOM
              </CTAButton>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}


