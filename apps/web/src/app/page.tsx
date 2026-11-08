import Image from "next/image";
import Link from "next/link";
import NewDrink from "@/components/newdrink";
import FeaturedProducts from "@/components/featured-products";
const icons = [
  ["Takeaway", "54.8% 78.8%"],
  ["Coffee beans", "54.8% 50%"],
  ["Coffee cup", "95.6% 21.2%"],
  ["Coffee machine", "95.6% 78.8%"],
];
export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <h1>
            Awaken Your
            <br />
            Senses With
            <br />
            Every Sip
          </h1>
          <Link className="hero-start" href="/menu">
            Get start
          </Link>
          <div className="hero-icons">
            {icons.map(([title, position]) => (
              <Link
                key={title}
                href="/menu"
                aria-label={title}
                style={{
                  backgroundImage: "url('/figma/coffee-icons.png')",
                  backgroundPosition: position,
                }}
              />
            ))}
          </div>
        </div>
        <div className="hero-image">
          <Image
            src="/imghome/home1.png"
            alt="Two Craft & Grind takeaway coffees"
            fill
            priority
            sizes="(min-width: 900px) 52vw, 90vw"
            className="object-contain"
          />
        </div>
      </section>
      <NewDrink />
      <FeaturedProducts />
    </main>
  );
}
