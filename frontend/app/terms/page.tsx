/**
 * Terms of Service Page
 */

"use client";

import { motion } from "framer-motion";
import { FileText, Scale } from "lucide-react";

import CTAButton from "@/components/ui/CTAButton";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Gashapon ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. The Platform is a blockchain-based gaming service that allows users to play claw machine games using cryptocurrency tokens and potentially win physical prizes represented as NFTs.`,
  },
  {
    title: "2. Eligibility",
    content: `You must be at least 18 years old (or the age of majority in your jurisdiction) to use the Platform. By using Gashapon, you represent that you meet this age requirement and have the legal capacity to enter into these Terms. The Platform may not be available in all jurisdictions. It is your responsibility to ensure that your use of the Platform complies with all applicable local laws.`,
  },
  {
    title: "3. Wallet Connection & Cryptocurrency",
    content: `To use the Platform, you must connect a compatible Solana wallet. You are solely responsible for maintaining the security of your wallet, including your private keys and seed phrases. Gashapon will never ask for your private keys. All transactions on the Platform are processed on the Solana blockchain and are irreversible. You are responsible for ensuring you have sufficient tokens to cover transaction fees. The value of cryptocurrency tokens may fluctuate significantly.`,
  },
  {
    title: "4. Gameplay & Prizes",
    content: `Games on the Platform use provably fair random number generation recorded on the blockchain. Each game has published odds that determine the probability of winning prizes. Winning a game results in receiving an NFT that represents ownership of a physical prize. There is no guarantee of winning any prize, and past performance does not indicate future results. The Platform reserves the right to modify game mechanics, odds, and available prizes at any time.`,
  },
  {
    title: "5. NFT Ownership & Redemption",
    content: `When you win a prize, you receive an NFT that represents your claim to that physical item. You may hold this NFT, and once our marketplace launches, you will be able to trade or sell it before redemption. To receive the physical prize, you must redeem the NFT through the Platform by providing valid shipping information. Once redeemed, the NFT is marked as claimed and cannot be traded or redeemed again. Physical prizes are subject to availability and may be substituted with items of equal or greater value if unavailable.`,
  },
  {
    title: "6. Shipping & Delivery",
    content: `Physical prizes will be shipped to the address provided during redemption. Shipping times vary by location: domestic US orders typically arrive within 5-7 business days; international orders may take 2-4 weeks. The Platform is not responsible for delays caused by customs, shipping carriers, or incorrect address information. Import duties, taxes, and customs fees are the responsibility of the recipient. Risk of loss transfers to you upon delivery to the shipping carrier.`,
  },
  {
    title: "7. Prohibited Activities",
    content: `You agree not to: (a) Use bots, scripts, or automated tools to interact with the Platform; (b) Exploit bugs, glitches, or vulnerabilities in the Platform; (c) Attempt to manipulate game outcomes or odds; (d) Engage in money laundering or other illegal activities; (e) Create multiple accounts to circumvent limits or restrictions; (f) Interfere with the Platform's operation or other users' enjoyment; (g) Reverse engineer or attempt to extract the Platform's source code.`,
  },
  {
    title: "8. Intellectual Property",
    content: `All content on the Platform, including but not limited to graphics, logos, designs, text, and software, is owned by Gashapon or its licensors and is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without express written permission. Prize NFT artwork and metadata remain the property of Gashapon, though you may display them for personal, non-commercial purposes.`,
  },
  {
    title: "9. Disclaimer of Warranties",
    content: `THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE MAKE NO REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF ANY CONTENT. YOUR USE OF THE PLATFORM IS AT YOUR SOLE RISK. CRYPTOCURRENCY AND NFT TRANSACTIONS CARRY INHERENT RISKS INCLUDING POTENTIAL TOTAL LOSS OF FUNDS.`,
  },
  {
    title: "10. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, GASHAPON SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR CRYPTOCURRENCY. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO USE THE PLATFORM IN THE 12 MONTHS PRECEDING THE CLAIM. THIS LIMITATION APPLIES REGARDLESS OF THE LEGAL THEORY UPON WHICH THE CLAIM IS BASED.`,
  },
  {
    title: "11. Indemnification",
    content: `You agree to indemnify and hold harmless Gashapon, its affiliates, officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney fees) arising from your use of the Platform, violation of these Terms, or infringement of any third-party rights.`,
  },
  {
    title: "12. Modifications to Terms",
    content: `We reserve the right to modify these Terms at any time. Changes will be effective upon posting to the Platform. Your continued use of the Platform after changes constitutes acceptance of the modified Terms. We encourage you to review these Terms periodically.`,
  },
  {
    title: "13. Termination",
    content: `We may suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice. Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination will survive, including ownership provisions, warranty disclaimers, and limitations of liability.`,
  },
  {
    title: "14. Governing Law & Disputes",
    content: `These Terms shall be governed by the laws of the State of Delaware, USA, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Platform shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive any right to participate in class action lawsuits or class-wide arbitration.`,
  },
  {
    title: "15. Contact Information",
    content: `For questions about these Terms of Service, please contact us through our Support page or reach out on X (Twitter) @Gashaponfun.`,
  },
];

export default function TermsPage() {
  const lastUpdated = "January 19, 2026";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none bg-cloud-tile" />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border-2 border-[#111827] mb-6"
            style={{ boxShadow: "3px 4px 0 #8ECCC1" }}
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-[#111827]">LEGAL</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </motion.div>

          <h1 className="font-display text-5xl md:text-6xl text-pastel-coral text-outline-xl mb-4">
            TERMS OF SERVICE
          </h1>
          <p className="text-pastel-text">
            Last updated: {lastUpdated}
          </p>
        </motion.div>

        {/* Terms Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              border: "2px solid #111827",
              borderRight: "4px solid #111827",
              borderBottom: "5px solid #111827",
            }}
          >
            <div className="bg-pastel-mint px-6 py-4 border-b-2 border-[#111827] flex items-center gap-3">
              <FileText className="w-5 h-5 text-emerald-700" />
              <h2 className="font-display text-xl text-[#111827]">TERMS & CONDITIONS</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Introduction */}
              <div className="p-4 rounded-xl bg-pastel-yellow/30 border border-pastel-yellow">
                <p className="text-sm text-[#111827]">
                  <strong>Important:</strong> Please read these Terms of Service carefully before using Gashapon. 
                  By using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms.
                </p>
              </div>

              {/* Sections */}
              {sections.map((section, index) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-gray-200 pb-6 last:border-0 last:pb-0"
                >
                  <h3 className="font-bold text-[#111827] mb-2">{section.title}</h3>
                  <p className="text-sm text-pastel-text leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <CTAButton variant="orange" href="/">
            BACK TO HOME
          </CTAButton>
        </motion.div>

        {/* Footer spacing */}
        <div className="h-12" />
      </div>
    </div>
  );
}
