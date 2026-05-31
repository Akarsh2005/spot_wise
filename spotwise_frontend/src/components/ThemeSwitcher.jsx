// src/components/ThemeSwitcher.jsx
import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";

const ThemeSwitcher = () => {
  const { theme, setTheme, THEMES } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions = [
    {
      id: THEMES.INDIGO,
      name: "Classic Indigo",
      colorClass: "from-indigo-500 to-indigo-700",
      description: "Clean Indigo Theme",
      icon: "🔮",
    },
    {
      id: THEMES.EMERALD,
      name: "Deep Emerald",
      colorClass: "from-emerald-400 to-emerald-600",
      description: "Fresh Organic Green",
      icon: "🌿",
    },
    {
      id: THEMES.ROSE,
      name: "Sunset Rose",
      colorClass: "from-rose-400 to-rose-600",
      description: "Warm Coral & Rose",
      icon: "🌅",
    },
    {
      id: THEMES.DARK,
      name: "Midnight Cyber",
      colorClass: "from-purple-500 via-violet-600 to-slate-950",
      description: "Futuristic Neon Dark",
      icon: "🌌",
    },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex items-center gap-3">
      {/* Expanded Theme Menu */}
      <div
        className={`glass px-4 py-3 flex items-center gap-3 shadow-lg transition-all duration-500 origin-left ${
          isOpen
            ? "opacity-100 translate-x-0 scale-100 pointer-events-auto"
            : "opacity-0 -translate-x-4 scale-75 pointer-events-none w-0 overflow-hidden"
        }`}
        style={{ border: "1px solid var(--border-color)" }}
      >
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted mr-1">
          Theme:
        </span>
        <div className="flex gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${
                opt.colorClass
              } border-2 transition-all duration-300 hover:scale-110 flex items-center justify-center text-sm shadow-sm ${
                theme === opt.id
                  ? "border-text-base scale-110 ring-2 ring-primary-base/20"
                  : "border-transparent hover:border-slate-200"
              }`}
              title={opt.name}
            >
              <span>{opt.icon}</span>
              {theme === opt.id && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border border-white rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-2 w-2 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-2xl shadow-md transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer"
        style={{
          border: "1px solid var(--border-color)",
          background: "var(--card-bg)",
        }}
        title="Toggle Theme Switcher"
      >
        <span
          className={`transition-transform duration-500 ${
            isOpen ? "rotate-180" : "group-hover:rotate-45"
          }`}
        >
          🎨
        </span>
      </button>
    </div>
  );
};

export default ThemeSwitcher;
