import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

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
      <main ref={ref} className="pt-28 px-6 flex-1">
      <section id="hero" className="max-w-6xl mx-auto py-16">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900">Faz seu nome inácio</h1>
      </section>
    </main>
    </>
  );
}

