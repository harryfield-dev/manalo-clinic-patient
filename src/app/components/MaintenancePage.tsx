import { motion } from "framer-motion";

export const MaintenancePage = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 overflow-hidden text-white">

      {/* Animated Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl"
          animate={{ x: [0, 100, -50, 0], y: [0, -50, 100, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 bottom-0 w-[400px] h-[400px] bg-blue-300/10 rounded-full blur-3xl"
          animate={{ x: [0, -80, 60, 0], y: [0, 80, -60, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl"
      >
        {/* Pulse Icon */}
        <motion.div
          className="text-5xl mb-6"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🏥
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          System Maintenance
        </h1>

        {/* Description */}
        <p className="text-blue-100/80 mb-6">
          We're currently improving our system to serve you better.
          Please check back shortly.
        </p>

        {/* Loading Bar */}
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-6">
          <motion.div
            className="h-full bg-blue-400"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
        </div>

        {/* Status */}
        <p className="text-xs text-blue-200/70 mb-6">
          Upgrading services...
        </p>

        {/* Button */}
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-xl bg-white text-blue-900 font-medium hover:bg-blue-100 transition"
        >
          Refresh
        </button>
      </motion.div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 1, 0.2] }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </div>
  );
};