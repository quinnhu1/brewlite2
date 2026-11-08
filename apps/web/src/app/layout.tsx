import type { Metadata } from 'next';
import { Suspense } from 'react';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import './globals.css';
import CartHydration from '@/components/cart/cart-hydration';

export const metadata: Metadata = {
  title: 'Craft & Grind',
  description: 'Every cup tells the story of the bean',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f2ebe4] text-[#2c1810] flex flex-col justify-between">
        <CartHydration />
        {/* Navbar xuất hiện cố định ở trên cùng mọi trang */}
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>

        {/* Nội dung thay đổi theo từng trang */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Homepage footer; pathname is resolved within Suspense for dynamic routes. */}
        <Suspense fallback={null}><Footer /></Suspense>
      </body>
    </html>
  );
}
