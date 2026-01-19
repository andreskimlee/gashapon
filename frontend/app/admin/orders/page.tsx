/**
 * Admin Orders Page - Order Management & Label Printing
 *
 * Admin page for managing redemption orders:
 * - View all redemptions with status
 * - Print shipping labels
 * - Track shipment status
 * - View order details
 */

"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import { redemptionApi, type Redemption } from "@/services/api/redemption";

const STATUS_COLORS = {
  processing: "bg-yellow-100 text-yellow-700 border-yellow-300",
  shipped: "bg-blue-100 text-blue-700 border-blue-300",
  delivered: "bg-green-100 text-green-700 border-green-300",
  failed: "bg-red-100 text-red-700 border-red-300",
};

const STATUS_ICONS = {
  processing: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
        clipRule="evenodd"
      />
    </svg>
  ),
  shipped: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
    </svg>
  ),
  delivered: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  failed: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const TIER_COLORS = {
  common: "bg-gray-100 text-gray-700",
  uncommon: "bg-green-100 text-green-700",
  rare: "bg-blue-100 text-blue-700",
  legendary: "bg-purple-100 text-purple-700",
};

export default function AdminOrdersPage() {
  const { connected, publicKey } = useWallet();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Redemption | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render wallet-dependent content after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch redemptions
  useEffect(() => {
    if (!mounted || !connected) return;

    const fetchRedemptions = async () => {
      try {
        setLoading(true);
        const data = await redemptionApi.getAllRedemptions();
        setRedemptions(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch redemptions:", err);
        setError("Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRedemptions();
  }, [connected, mounted]);

  // Filter redemptions
  const filteredRedemptions =
    filterStatus === "all"
      ? redemptions
      : redemptions.filter((r) => r.status === filterStatus);

  // Stats
  const stats = {
    total: redemptions.length,
    processing: redemptions.filter((r) => r.status === "processing").length,
    shipped: redemptions.filter((r) => r.status === "shipped").length,
    delivered: redemptions.filter((r) => r.status === "delivered").length,
    failed: redemptions.filter((r) => r.status === "failed").length,
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show loading state until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-pastel-coral border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-sky via-pastel-pinkLight to-pastel-lavender flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md">
          <h1 className="font-display text-2xl text-pastel-coral mb-4">
            ADMIN ORDERS
          </h1>
          <p className="text-pastel-text mb-6">
            Connect your wallet to manage orders
          </p>
          <WalletMultiButton className="!bg-pastel-coral !rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="text-gray-500 hover:text-gray-700 transition"
            >
              ← Back to Admin
            </a>
            <h1 className="font-display text-xl text-gray-800">
              ORDER MANAGEMENT
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {publicKey?.toBase58().slice(0, 8)}...
            </span>
            <WalletMultiButton className="!bg-pastel-coral !rounded-xl !h-10 !text-sm" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Orders", value: stats.total, color: "bg-gray-500" },
            {
              label: "Processing",
              value: stats.processing,
              color: "bg-yellow-500",
            },
            { label: "Shipped", value: stats.shipped, color: "bg-blue-500" },
            {
              label: "Delivered",
              value: stats.delivered,
              color: "bg-green-500",
            },
            { label: "Failed", value: stats.failed, color: "bg-red-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${stat.color}`} />
                <span className="text-sm text-gray-500">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold text-gray-800">
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Filter:</span>
          {["all", "processing", "shipped", "delivered", "failed"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filterStatus === status
                    ? "bg-pastel-coral text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-pastel-coral border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredRedemptions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                    Order ID
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                    Prize
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                    Tracking
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                    Date
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRedemptions.map((redemption) => (
                  <tr
                    key={redemption.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm text-gray-800">
                        #{redemption.id}
                      </div>
                      <div className="text-xs text-gray-400">
                        {redemption.nftMint.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {redemption.prize?.imageUrl && (
                          <img
                            src={redemption.prize.imageUrl}
                            alt={redemption.prize.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {redemption.prize?.name || "Unknown Prize"}
                          </div>
                          {redemption.prize?.tier && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs ${
                                TIER_COLORS[
                                  redemption.prize
                                    .tier as keyof typeof TIER_COLORS
                                ] || TIER_COLORS.common
                              }`}
                            >
                              {redemption.prize.tier}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[redemption.status]}`}
                      >
                        {STATUS_ICONS[redemption.status]}
                        {redemption.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {redemption.trackingNumber ? (
                        <div>
                          <div className="font-mono text-sm text-gray-800">
                            {redemption.trackingNumber}
                          </div>
                          <div className="text-xs text-gray-400 uppercase">
                            {redemption.carrier?.replace(/_/g, " ")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Not available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800">
                        {formatDate(redemption.redeemedAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Print Label */}
                        {redemption.labelPdfUrl && (
                          <a
                            href={redemption.labelPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-pastel-coral hover:bg-pastel-coral/10 rounded-lg transition"
                            title="Download Label (PDF)"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                              />
                            </svg>
                          </a>
                        )}

                        {/* Track Shipment */}
                        {redemption.trackingUrl && (
                          <a
                            href={redemption.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                            title="Track Shipment"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                              />
                            </svg>
                          </a>
                        )}

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedOrder(redemption)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          title="View Details"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedOrder(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-xl text-gray-800">
                    Order #{selectedOrder.id}
                  </h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Prize Info */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
                  {selectedOrder.prize?.imageUrl && (
                    <img
                      src={selectedOrder.prize.imageUrl}
                      alt={selectedOrder.prize.name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {selectedOrder.prize?.name || "Unknown Prize"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      SKU: {selectedOrder.prize?.physicalSku || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Status</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.status]}`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">NFT Mint</span>
                    <span className="font-mono text-sm text-gray-800">
                      {selectedOrder.nftMint.slice(0, 12)}...
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">User Wallet</span>
                    <span className="font-mono text-sm text-gray-800">
                      {selectedOrder.userWallet.slice(0, 12)}...
                    </span>
                  </div>

                  {selectedOrder.trackingNumber && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Tracking #</span>
                      <span className="font-mono text-sm text-gray-800">
                        {selectedOrder.trackingNumber}
                      </span>
                    </div>
                  )}

                  {selectedOrder.carrier && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Carrier</span>
                      <span className="text-sm text-gray-800 uppercase">
                        {selectedOrder.carrier.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Order Date</span>
                    <span className="text-sm text-gray-800">
                      {formatDate(selectedOrder.redeemedAt)}
                    </span>
                  </div>

                  {selectedOrder.shippedAt && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Shipped Date</span>
                      <span className="text-sm text-gray-800">
                        {formatDate(selectedOrder.shippedAt)}
                      </span>
                    </div>
                  )}

                  {selectedOrder.deliveredAt && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Delivered Date</span>
                      <span className="text-sm text-gray-800">
                        {formatDate(selectedOrder.deliveredAt)}
                      </span>
                    </div>
                  )}

                  {selectedOrder.failureReason && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-600">
                        Failure Reason: {selectedOrder.failureReason}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  {selectedOrder.labelPdfUrl && (
                    <a
                      href={selectedOrder.labelPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-pastel-coral text-white rounded-xl hover:bg-pastel-coral/90 transition"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      Print Label
                    </a>
                  )}
                  {selectedOrder.trackingUrl && (
                    <a
                      href={selectedOrder.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      Track Package
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
