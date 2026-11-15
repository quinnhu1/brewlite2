import React from 'react';
import Image from 'next/image';

export default function NewDrinkSection() {
  return (
    <section className="w-full bg-[#f2ebe4] py-16 px-8 md:px-16 lg:px-24">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">

        {/* CỘT TRÁI */}
        <div className="w-full lg:w-[58%] flex flex-col items-start text-[#2B100C]">

          {/* Header Title */}
          <div className="relative">
            <h2 className="text-6xl sm:text-7xl lg:text-[5.5rem] font-black tracking-tight leading-[0.95] uppercase">
              NEW <br /> DRINK
            </h2>
            {/* Chữ attetion */}
            <span className="absolute top-8 left-[175px] sm:left-[210px] lg:left-[240px] text-xl sm:text-2xl font-pacifico italic text-[#2B100C] lowercase select-none">
              attetion
            </span>
          </div>

          <h3 className="text-4xl sm:text-5xl font-bold mt-4 tracking-tight text-[#2B100C]">
            Iced Latte
          </h3>

          <p className="mt-6 text-base sm:text-lg text-[#2B100C] leading-relaxed max-w-xl font-normal opacity-90">
            A refreshing coffee drink made with espresso, cold milk and ice. It has a smooth,
            light flavor, balancing the strength of espresso with the creaminess of milk.
            Perfect for hot days or when you want a cool, energizing coffee without being too strong.
          </p>

          <div className="mt-10 flex flex-wrap items-start gap-12 sm:gap-20">
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold text-[#2B100C]">
                3 <span className="text-xl sm:text-2xl font-bold">Syrups</span>
              </span>
              <span className="mt-1 text-base text-[#2B100C] font-medium leading-snug opacity-90">
                vanilla, caramel, <br /> hazelnut
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold text-[#2B100C]">
                With
              </span>
              <span className="mt-1 text-base text-[#2B100C] font-medium leading-snug opacity-90">
                espresso + cold <br /> milk + ice
              </span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="w-full lg:w-[42%] flex justify-center lg:justify-end items-center">
          <div className="relative w-[320px] h-[380px] sm:w-[400px] sm:h-[480px] lg:w-[560px] lg:h-[660px]">
            <Image
              src="/imghome/home2.png"
              alt="New Drink Iced Latte with Coconut"
              fill
              priority
              className="object-contain drop-shadow-[0_20px_30px_rgba(43,16,12,0.18)]"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
