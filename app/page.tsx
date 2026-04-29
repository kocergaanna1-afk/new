"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { Newspaper, TrendingUp, Building2, Bell, ArrowRight, ChevronDown } from "lucide-react";

const newsItems = [
  {
    emoji: "📦",
    category: "Маркетплейсы",
    title: "Ozon Financial Services: 43 млн клиентов",
    text: "Число пользователей финтех-сервисов Ozon превысило 43 млн. Чистая прибыль в Q1 2026 — 4,5 млрд рублей.",
    seller: "Присутствие на Ozon — доступ к финансово активной аудитории.",
    color: "#005BFF",
  },
  {
    emoji: "⚖️",
    category: "Регуляторика",
    title: "НДС на трансграничные товары: битва за сроки",
    text: "АПЭТ просит поэтапного введения до 22% к 2029 году. Одномоментный скачок грозит ростом цен на 15–25%.",
    seller: "Следите за решением — от него зависит себестоимость импортного товара.",
    color: "#e63946",
  },
  {
    emoji: "🏛️",
    category: "Политика",
    title: "WB вводит единые условия для всех с 25 мая",
    text: "Повышение комиссий и выравнивание условий для российских и иностранных продавцов.",
    seller: "Пересмотрите юнит-экономику до 25 мая.",
    color: "#7c3aed",
  },
  {
    emoji: "📈",
    category: "Тренды",
    title: "Электроника на WB: продажи +270% при падении рынка",
    text: "Рынок ноутбуков упал на 20%+, но WB показывает рост 270%. Категория мигрирует в онлайн.",
    seller: "Интересный момент для входа, пока конкуренция не выровнялась.",
    color: "#4DC8B4",
  },
];

const stats = [
  { value: "2×", label: "дайджеста в день" },
  { value: "4+", label: "источника СМИ" },
  { value: "24ч", label: "только свежие новости" },
  { value: "100%", label: "для селлеров WB/Ozon" },
];

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <main className="bg-[#05080f] text-white min-h-screen overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex items-center justify-between bg-[#05080f]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4DC8B4] to-[#7c3aed] flex items-center justify-center text-sm font-bold">Q</div>
          <span className="font-bold text-lg">Qubba</span>
          <span className="text-[#4DC8B4] text-sm ml-1">Дайджест</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#4DC8B4]/10 border border-[#4DC8B4]/30 text-[#4DC8B4] text-sm hover:bg-[#4DC8B4]/20 transition-colors"
        >
          <Bell size={14} />
          Подписаться
        </motion.button>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-8 pt-20">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#4DC8B4]/5 blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-[#7c3aed]/5 blur-[100px]" />

        <motion.div
          style={{ y, opacity }}
          className="relative z-10 text-center max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4DC8B4]/10 border border-[#4DC8B4]/20 text-[#4DC8B4] text-sm mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#4DC8B4] animate-pulse" />
            Обновляется каждый день
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold leading-tight mb-6"
          >
            Новости маркетплейсов{" "}
            <span className="bg-gradient-to-r from-[#4DC8B4] to-[#7c3aed] bg-clip-text text-transparent">
              для селлеров
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl text-white/50 mb-10 max-w-xl mx-auto"
          >
            Wildberries, Ozon, таможня, регуляторика. Только свежее, только важное — утром и вечером.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            <motion.a
              href="https://t.me/qubba"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#4DC8B4] to-[#3aad9a] text-black font-semibold hover:shadow-[0_0_30px_rgba(77,200,180,0.3)] transition-shadow"
            >
              Читать в Telegram <ArrowRight size={16} />
            </motion.a>
            <motion.a
              href="#news"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-white/70 hover:border-white/20 hover:text-white transition-colors"
            >
              Примеры постов
            </motion.a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 animate-bounce"
        >
          <ChevronDown size={24} />
        </motion.div>
      </section>

      {/* STATS */}
      <section className="py-16 px-8 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-[#4DC8B4] to-[#7c3aed] bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-white/40 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* NEWS CARDS */}
      <section id="news" className="py-24 px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Примеры из дайджеста</h2>
            <p className="text-white/40">Вот как выглядят наши посты — конкретно, с выводом для вас</p>
          </motion.div>

          <div className="grid gap-6">
            {newsItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors group cursor-pointer overflow-hidden"
              >
                {/* Glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${item.color}10, transparent 70%)` }}
                />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: `${item.color}20`, color: item.color }}
                    >
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-white/50 text-sm mb-3 leading-relaxed">{item.text}</p>
                  <div className="flex items-start gap-2 pt-3 border-t border-white/5">
                    <TrendingUp size={14} className="text-[#4DC8B4] mt-0.5 shrink-0" />
                    <p className="text-[#4DC8B4] text-sm underline decoration-dotted">{item.seller}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOURCES */}
      <section className="py-16 px-8 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold mb-3">Источники</h2>
            <p className="text-white/40 text-sm mb-8">Мониторим ежедневно</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {["Коммерсантъ", "Ведомости", "ТАСС", "Retail.ru", "@WBakalchuk", "@kimtatyana2024"].map((src) => (
                <div key={src} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm">
                  {src}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#4DC8B4]/5 to-transparent" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-xl mx-auto"
        >
          <h2 className="text-4xl font-bold mb-4">Начни читать прямо сейчас</h2>
          <p className="text-white/40 mb-8">Утренний дайджест и итоги дня — бесплатно в Telegram</p>
          <motion.a
            href="https://t.me/qubba"
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(77,200,180,0.4)" }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#4DC8B4] to-[#3aad9a] text-black font-bold text-lg"
          >
            Подписаться на Qubba <ArrowRight size={20} />
          </motion.a>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-8 border-t border-white/5 text-center text-white/20 text-sm">
        © 2026 Qubba.io — Аналитика для продавцов на маркетплейсах
      </footer>
    </main>
  );
}
