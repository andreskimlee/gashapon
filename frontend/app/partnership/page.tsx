/**
 * Partnership Page
 *
 * Application form for token projects wanting to partner with Gashapon.
 * Prerequisites:
 * - Must be Developer/CTO/Founder
 * - Token market cap minimum $100k
 * - Clear prize ideas
 */

"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Handshake, Rocket, Send } from "lucide-react";
import { useState } from "react";

import CTAButton from "@/components/ui/CTAButton";

interface PartnershipFormData {
  projectName: string;
  role: string;
  tokenAddress: string;
  marketCap: string;
  prizeIdeas: string;
  contact: string;
  additionalNotes: string;
}

const initialFormData: PartnershipFormData = {
  projectName: "",
  role: "",
  tokenAddress: "",
  marketCap: "",
  prizeIdeas: "",
  contact: "",
  additionalNotes: "",
};

export default function PartnershipPage() {
  const [formData, setFormData] = useState<PartnershipFormData>(initialFormData);
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
      const response = await fetch("/api/partnership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Submission error:", error);
      alert(error instanceof Error ? error.message : "Failed to submit application. Please try again.");
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
            style={{ boxShadow: "3px 4px 0 #D4B8E8" }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Handshake className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-[#111827]">FOR TOKEN PROJECTS</span>
            <Handshake className="w-4 h-4 text-purple-600" />
          </motion.div>

          <h1 className="font-display text-5xl md:text-6xl text-pastel-coral text-outline-xl mb-4">
            BECOME A PARTNER
          </h1>
          <p className="text-pastel-text max-w-lg mx-auto">
            Launch your own Gashapon machine with custom prizes for your community.
            Drive engagement and reward your holders with exclusive collectibles.
          </p>
        </motion.div>

        {isSubmitted ? (
          /* Success State - Modal Style */
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
              {/* Header */}
              <div className="bg-pastel-mint px-6 py-4 border-b-2 border-[#111827] flex items-center justify-between">
                <h2 className="font-display text-2xl text-[#111827]">SUCCESS</h2>
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
                <h3 className="font-display text-2xl text-[#111827] mb-2">APPLICATION SENT</h3>
                <p className="text-pastel-textLight mb-6">
                  Thanks for your interest! We&apos;ll review your application and reach out via your
                  provided contact within 48 hours.
                </p>
                <CTAButton variant="orange" href="/">
                  BACK TO HOME
                </CTAButton>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Prerequisites Card - Modal Style */}
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
                {/* Header */}
                <div className="bg-pastel-lavender px-6 py-4 border-b-2 border-[#111827] flex items-center gap-3">
                  <Rocket className="w-5 h-5 text-purple-700" />
                  <h2 className="font-display text-xl text-[#111827]">PREREQUISITES</h2>
                </div>

                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-[#E9EEF2] rounded-xl border-2 border-[#111827]">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border-2 border-[#111827]">
                        <CheckCircle2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold text-[#111827]">Developer / CTO / Founder</p>
                        <p className="text-sm text-pastel-textLight">Key team member with decision-making authority</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-[#E9EEF2] rounded-xl border-2 border-[#111827]">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border-2 border-[#111827]">
                        <CheckCircle2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold text-[#111827]">$100k+ Market Cap</p>
                        <p className="text-sm text-pastel-textLight">Minimum market cap of $100,000</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-[#E9EEF2] rounded-xl border-2 border-[#111827]">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border-2 border-[#111827]">
                        <CheckCircle2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold text-[#111827]">Prize Ideas Ready</p>
                        <p className="text-sm text-pastel-textLight">A vision for prizes that excite your community</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Application Form - Modal Style */}
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
                {/* Header */}
                <div className="bg-pastel-mint px-6 py-4 border-b-2 border-[#111827] flex items-center gap-3">
                  <Send className="w-5 h-5 text-emerald-700" />
                  <h2 className="font-display text-xl text-[#111827]">APPLICATION FORM</h2>
                </div>

                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Row 1: Project Name & Role */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="projectName" className={labelClasses}>
                          Project Name *
                        </label>
                        <input
                          type="text"
                          id="projectName"
                          name="projectName"
                          value={formData.projectName}
                          onChange={handleChange}
                          placeholder="e.g. DogeCoin"
                          className={inputClasses}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="role" className={labelClasses}>
                          Your Role *
                        </label>
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className={inputClasses}
                          required
                        >
                          <option value="">Select your role...</option>
                          <option value="founder">Founder</option>
                          <option value="cto">CTO</option>
                          <option value="developer">Developer</option>
                          <option value="marketing">Marketing Lead</option>
                          <option value="other">Other (Key Team Member)</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2: Token Address & Market Cap */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="tokenAddress" className={labelClasses}>
                          Token Contract Address *
                        </label>
                        <input
                          type="text"
                          id="tokenAddress"
                          name="tokenAddress"
                          value={formData.tokenAddress}
                          onChange={handleChange}
                          placeholder="Solana token address"
                          className={inputClasses}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="marketCap" className={labelClasses}>
                          Current Market Cap (USD) *
                        </label>
                        <input
                          type="text"
                          id="marketCap"
                          name="marketCap"
                          value={formData.marketCap}
                          onChange={handleChange}
                          placeholder="e.g. $250,000"
                          className={inputClasses}
                          required
                        />
                      </div>
                    </div>

                    {/* Prize Ideas */}
                    <div>
                      <label htmlFor="prizeIdeas" className={labelClasses}>
                        Prize Ideas *
                      </label>
                      <textarea
                        id="prizeIdeas"
                        name="prizeIdeas"
                        value={formData.prizeIdeas}
                        onChange={handleChange}
                        placeholder="What prizes would you like to offer? (hoodies, plushies, signed posters, physical coins, exclusive access...)"
                        rows={3}
                        className={inputClasses}
                        required
                      />
                    </div>

                    {/* Contact */}
                    <div>
                      <label htmlFor="contact" className={labelClasses}>
                        Contact (Telegram or Email) *
                      </label>
                      <input
                        type="text"
                        id="contact"
                        name="contact"
                        value={formData.contact}
                        onChange={handleChange}
                        placeholder="@yourtelegram or you@email.com"
                        className={inputClasses}
                        required
                      />
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label htmlFor="additionalNotes" className={labelClasses}>
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        id="additionalNotes"
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleChange}
                        placeholder="Anything else about your project..."
                        rows={2}
                        className={inputClasses}
                      />
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
                        {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
                      </CTAButton>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Additional Info */}
            <motion.p
              className="text-center text-sm text-pastel-text mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Questions? Reach out on{" "}
              <a
                href="https://x.com/Gashaponfun"
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
