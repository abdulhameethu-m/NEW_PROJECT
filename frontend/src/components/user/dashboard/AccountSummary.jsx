import { Bell, Gift, Heart, PackageCheck, PackageX, ShoppingBag, Timer, WalletCards } from "lucide-react";
import { StatisticsCard } from "./StatisticsCard";

export function AccountSummary({ stats = {} }) {
  const total = Number(stats.totalOrders || 0);
  const pending = Number(stats.pendingOrders || 0);
  const delivered = Number(stats.deliveredOrders ?? Math.max(total - pending, 0));

  const items = [
    { label: "Total orders", value: total, icon: ShoppingBag, tone: "slate" },
    { label: "Pending", value: pending, icon: Timer, tone: "amber" },
    { label: "Delivered", value: delivered, icon: PackageCheck, tone: "emerald" },
    { label: "Cancelled", value: stats.cancelledOrders || 0, icon: PackageX, tone: "rose" },
    { label: "Wishlist", value: stats.wishlistCount || 0, icon: Heart, tone: "rose" },
    { label: "Coupons", value: stats.coupons || 0, icon: Gift, tone: "blue" },
    { label: "Rewards", value: stats.rewardPoints || 0, icon: Bell, tone: "amber" },
    { label: "Wallet", value: stats.walletBalance || 0, icon: WalletCards, tone: "emerald" },
  ];

  return (
    <section aria-labelledby="account-summary-title" className="grid grid-cols-1 gap-3 w-full min-w-0">
      <div className="flex items-center justify-between">
        <h2 id="account-summary-title" className="text-[15px] font-black text-slate-950 dark:text-white">
          Account summary
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <StatisticsCard key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
