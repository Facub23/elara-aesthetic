"use client";

import { motion } from "framer-motion";

export function PageLoader() {

  return (

    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      exit={{ scaleX: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed left-0 top-0 z-[9999] h-[3px] w-full origin-left bg-black"
    />

  );
}