import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Marquee from "@/components/landing/Marquee";
import AdvisorShowcase from "@/components/landing/AdvisorShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import WarRoomPreview from "@/components/landing/WarRoomPreview";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="relative bg-council-bg min-h-screen noise-overlay">
      <Navbar />
      <Hero />
      <Marquee />
      <AdvisorShowcase />
      <HowItWorks />
      <WarRoomPreview />
      <FinalCTA />
      <Footer />
    </main>
  );
}
