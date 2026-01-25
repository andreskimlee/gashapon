/**
 * Support Page
 *
 * Support ticket form for users to report issues or ask questions.
 */

"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Send,
} from "lucide-react";
import { useState } from "react";

import CTAButton from "@/components/ui/CTAButton";

interface SupportFormData {
  name: string;
  email: string;
  category: string;
  walletAddress: string;
  subject: string;
  message: string;
}

const initialFormData: SupportFormData = {
  name: "",
  email: "",
  category: "",
  walletAddress: "",
  subject: "",
  message: "",
};

const categories = [
  { value: "gameplay", label: "Gameplay Issue", icon: "🎮" },
  { value: "redemption", label: "Prize Redemption", icon: "📦" },
  { value: "wallet", label: "Wallet / Payment", icon: "💳" },
  { value: "shipping", label: "Shipping Problem", icon: "🚚" },
  { value: "bug", label: "Bug Report", icon: "🐛" },
  { value: "other", label: "Other", icon: "❓" },
];

const faqs = [
  {
    q: "How do I redeem my prize?",
    a: "Go to your Collection page, find your won NFT, and click 'Redeem'. Enter your shipping details and we'll send your prize!",
  },
  {
    q: "How long does shipping take?",
    a: "Domestic (US) orders typically arrive in 5-7 business days. International shipping can take 2-4 weeks.",
  },
  {
    q: "Can I trade my prize NFT?",
    a: "Our marketplace is coming soon! Once launched, you'll be able to trade unredeemed prize NFTs with other players.",
  },
];

export default function SupportPage() {
  const [formData, setFormData] = useState<SupportFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit ticket");
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Submission error:", error);
      alert(error instanceof Error ? error.message : "Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses =
    "w-full rounded-xl px-4 py-3 border-2 border-[#111827] focus:border-pastel-coral focus:outline-none text-[#111827] bg-white placeholder:text-pastel-textLight";

  const labelClasses = "block text-xs font-bold text-[#111827] uppercase mb-1";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-cloud-tile" />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border-2 border-[#111827] mb-6"
            style={{ boxShadow: "3px 4px 0 #F5C6D6" }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <LifeBuoy className="w-4 h-4 text-pink-600" />
            <span className="text-sm font-bold text-[#111827]">WE&apos;RE HERE TO HELP</span>
            <LifeBuoy className="w-4 h-4 text-pink-600" />
          </motion.div>

          <h1 className="font-display text-5xl md:text-6xl text-pastel-coral text-outline-xl mb-4">
            SUPPORT
          </h1>
          <p className="text-pastel-text max-w-lg mx-auto">
            Having trouble? We&apos;re here to help! Check our FAQs or submit a ticket below.
          </p>
        </motion.div>

        {isSubmitted ? (
          /* Success State */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto"
          >
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                border: "2px solid #111827",
                borderRight: "4px solid #111827",
                borderBottom: "5px solid #111827",
              }}
            >
              <div className="bg-pastel-mint px-6 py-4 border-b-2 border-[#111827]">
                <h2 className="font-display text-2xl text-[#111827]">TICKET SUBMITTED</h2>
              </div>

              <div className="p-6 text-center">
                <motion.div
                  className="w-20 h-20 mx-auto mb-4 rounded-xl bg-pastel-mint border-2 border-[#111827] flex items-center justify-center"
                  style={{ boxShadow: "4px 4px 0 #111827" }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </motion.div>
                <h3 className="font-display text-2xl text-[#111827] mb-2">WE GOT IT!</h3>
                <p className="text-pastel-textLight mb-6">
                  Thanks for reaching out! Our support team will review your ticket and get back to you
                  within 24-48 hours via email.
                </p>
                <CTAButton variant="orange" href="/">
                  BACK TO HOME
                </CTAButton>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* FAQ Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{
                  border: "2px solid #111827",
                  borderRight: "4px solid #111827",
                  borderBottom: "5px solid #111827",
                }}
              >
                <div className="bg-pastel-yellow px-6 py-4 border-b-2 border-[#111827] flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-yellow-700" />
                  <h2 className="font-display text-xl text-[#111827]">QUICK ANSWERS</h2>
                </div>

                <div className="p-6 space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="p-4 bg-[#E9EEF2] rounded-xl border-2 border-[#111827]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border-2 border-[#111827] shrink-0">
                          <MessageSquare className="w-4 h-4 text-pastel-coral" />
                        </div>
                        <div>
                          <p className="font-bold text-[#111827]">{faq.q}</p>
                          <p className="text-sm text-pastel-textLight mt-1">{faq.a}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Support Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{
                  border: "2px solid #111827",
                  borderRight: "4px solid #111827",
                  borderBottom: "5px solid #111827",
                }}
              >
                <div className="bg-pastel-pink px-6 py-4 border-b-2 border-[#111827] flex items-center gap-3">
                  <Send className="w-5 h-5 text-pink-700" />
                  <h2 className="font-display text-xl text-[#111827]">SUBMIT A TICKET</h2>
                </div>

                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name & Email */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className={labelClasses}>
                          Your Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className={inputClasses}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className={labelClasses}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="you@email.com"
                          className={inputClasses}
                          required
                        />
                      </div>
                    </div>

                    {/* Category & Wallet */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="category" className={labelClasses}>
                          Category *
                        </label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className={inputClasses}
                          required
                        >
                          <option value="">Select a category...</option>
                          {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.icon} {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="walletAddress" className={labelClasses}>
                          Wallet Address (Optional)
                        </label>
                        <input
                          type="text"
                          id="walletAddress"
                          name="walletAddress"
                          value={formData.walletAddress}
                          onChange={handleChange}
                          placeholder="Your Solana wallet"
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label htmlFor="subject" className={labelClasses}>
                        Subject *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Brief description of your issue"
                        className={inputClasses}
                        required
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className={labelClasses}>
                        Message *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Please describe your issue in detail. Include any relevant transaction IDs, NFT mints, or screenshots if applicable."
                        rows={5}
                        className={inputClasses}
                        required
                      />
                    </div>

                    {/* Info Box */}
                    <div className="p-4 rounded-xl bg-pastel-mint/30 border border-pastel-mint">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-pastel-textLight">
                          For faster resolution, please include any transaction signatures, NFT mint addresses, 
                          or order numbers related to your issue.
                        </p>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex gap-3">
                      <CTAButton
                        type="button"
                        variant="pink"
                        size="md"
                        className="flex-1"
                        href="/"
                      >
                        CANCEL
                      </CTAButton>
                      <CTAButton
                        type="submit"
                        variant="orange"
                        size="md"
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "SUBMITTING..." : "SUBMIT TICKET"}
                      </CTAButton>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Additional Contact */}
            <motion.p
              className="text-center text-sm text-pastel-text mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Need urgent help? DM us on{" "}
              <a
                href="https://x.com/grababorbit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pastel-coral hover:underline font-semibold"
              >
                X (Twitter)
              </a>
            </motion.p>
          </>
        )}
      </div>
    </div>
  );
}
