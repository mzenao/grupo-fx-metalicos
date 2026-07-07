import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Hero from '@/components/landing/Hero';
import OurMission from '@/components/landing/ourMission';
import WhoWeAre from '@/components/landing/whoWeAre';
import SellScrap from '@/components/landing/SellScrap';
import Contact from '@/components/landing/Contact';

export default function Home() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] z-50 origin-left"
        style={{ scaleX }}
      />
      <main ref={ref} className="flex-1">
        <Hero />
        <SellScrap />
        <OurMission />
        <WhoWeAre />
        <Contact />
      </main>
    </>
  );
}
