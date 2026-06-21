"use client";

import { useMemo, useState } from "react";
import type { AccountType, Package, PackageFeature } from "@/lib/types";
import { formatEuro } from "@/lib/format";
import { BuyButton } from "./BuyButton";

export function PlansClient({
  packages,
  signedIn,
  accountType,
}: {
  packages: Package[];
  signedIn: boolean;
  accountType: AccountType | null;
}) {
  const parentPkg = packages.find((p) => p.package_type === "parent");
  const schoolTiers = useMemo(
    () =>
      packages
        .filter((p) => p.package_type === "school")
        .sort((a, b) => (a.min_students ?? 0) - (b.min_students ?? 0)),
    [packages],
  );

  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const selectedTier = schoolTiers[selectedTierIdx];

  // A signed-in parent cannot buy school packages, and vice versa.
  const parentDisabled = signedIn && accountType === "school";
  const schoolDisabled = signedIn && accountType === "parent";

  return (
    <section className="bg-white py-14 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-brand mb-3">
          Πακέτα
        </div>
        <h2 className="font-display text-3xl md:text-5xl text-ink leading-tight">
          Διαλέξτε το πακέτο σας
        </h2>
        <p className="mt-4 text-sm md:text-base text-ink/60 max-w-2xl leading-relaxed">
          Δύο πακέτα. Ένα για γονείς που παρακολουθούν τα παιδιά τους, και ένα για φροντιστήρια
          που προσαρμόζεται στον αριθμό των μαθητών τους.
        </p>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 mt-12">
          {parentPkg && (
            <ParentCard pkg={parentPkg} signedIn={signedIn} disabled={parentDisabled} />
          )}

          {schoolTiers.length > 0 && selectedTier && (
            <SchoolCard
              tiers={schoolTiers}
              selectedIdx={selectedTierIdx}
              onSelect={setSelectedTierIdx}
              signedIn={signedIn}
              disabled={schoolDisabled}
            />
          )}

          {(!parentPkg || schoolTiers.length === 0) && (
            <div className="lg:col-span-2 rounded-3xl border border-dashed border-ink/15 p-10 text-center text-sm text-ink/50">
              Τα πακέτα δεν έχουν ρυθμιστεί ακόμα. Επικοινωνήστε μαζί μας στο{" "}
              <a className="!text-[#056ef5] font-bold" href="mailto:info@protupa.gr">info@protupa.gr</a>.
            </div>
          )}
        </div>

        <p className="mt-8 text-xs text-ink/50 text-center max-w-xl mx-auto leading-relaxed">
          Ετήσιο πακέτο. Μπορείτε ανά πάσα στιγμή να αναβαθμίσετε ή να υποβιβάσετε το πακέτο σας
          ανάλογα με τις ανάγκες σας.
        </p>
      </div>
    </section>
  );
}

// ─── Parent card ─────────────────────────────────────────────────────────
function ParentCard({
  pkg,
  signedIn,
  disabled,
}: {
  pkg: Package;
  signedIn: boolean;
  disabled: boolean;
}) {
  const purchasable = !!pkg.stripe_price_id && pkg.price_cents > 0;

  return (
    <article
      className={`relative flex flex-col rounded-3xl bg-[#7c00d0] text-white p-7 md:p-9 overflow-hidden transition-opacity ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="pointer-events-none absolute -bottom-12 -right-8 text-[10rem] leading-none select-none opacity-[0.07]">
        ♡
      </div>

      {disabled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/20">
          <span className="bg-white/90 text-ink text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full">
            Μη διαθέσιμο για φροντιστήρια
          </span>
        </div>
      )}

      <div className="relative flex flex-col flex-1">
        <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-70">Γονέας</span>
        <h3 className="mt-2 font-display text-3xl md:text-4xl leading-tight">{pkg.name_el}</h3>
        {pkg.description_el && (
          <p className="mt-2 text-sm opacity-80 leading-relaxed">{pkg.description_el}</p>
        )}

        <PriceBlock priceCents={pkg.price_cents} />

        <div className="mt-7 h-px bg-white/15" />

        <FeatureList features={pkg.features} accent="bg-[#c8ff00] text-ink" />

        <div className="mt-8">
          {disabled ? (
            <div className="w-full text-center py-4 text-sm font-semibold opacity-60">
              Μη διαθέσιμο για τον λογαριασμό σας
            </div>
          ) : (
            <BuyButton
              packageId={pkg.id}
              signedIn={signedIn}
              purchasable={purchasable}
              buttonClass="bg-[#FDFFFC] !text-[#7c00d0] border-2 border-white hover:bg-white/95"
            />
          )}
        </div>
      </div>
    </article>
  );
}

// ─── School card with tier picker ────────────────────────────────────────
function SchoolCard({
  tiers,
  selectedIdx,
  onSelect,
  signedIn,
  disabled,
}: {
  tiers: Package[];
  selectedIdx: number;
  onSelect: (i: number) => void;
  signedIn: boolean;
  disabled: boolean;
}) {
  const tier = tiers[selectedIdx];
  const purchasable = !!tier.stripe_price_id && tier.price_cents > 0;

  return (
    <article
      className={`relative flex flex-col rounded-3xl bg-[#056ef5] text-white p-7 md:p-9 overflow-hidden transition-opacity ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="pointer-events-none absolute -bottom-12 -right-8 text-[10rem] leading-none select-none opacity-[0.07]">
        ★
      </div>

      {/* Popular badge */}
      <span className="absolute top-7 right-7 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#c8ff00] text-ink text-[10px] font-black uppercase tracking-wider">
        Δημοφιλές
      </span>

      {disabled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/20">
          <span className="bg-white/90 text-ink text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full">
            Μη διαθέσιμο για γονείς
          </span>
        </div>
      )}

      <div className="relative flex flex-col flex-1">
        <span className="text-xs font-bold tracking-[0.2em] uppercase opacity-70">Φροντιστήριο</span>
        <h3 className="mt-2 font-display text-3xl md:text-4xl leading-tight">
          Πακέτο Φροντιστηρίου
        </h3>
        <p className="mt-2 text-sm opacity-80 leading-relaxed">
          Για φροντιστήρια προετοιμασίας. Επιλέξτε εύρος μαθητών — το πακέτο προσαρμόζεται.
        </p>

        {/* Tier picker */}
        <div className="mt-6">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mb-3">
            Αριθμός μαθητών
          </div>
          <div className="grid grid-cols-3 gap-2">
            {tiers.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(i)}
                className={`relative px-3 py-2.5 rounded-lg text-xs font-bold tabular-nums transition-all cursor-pointer ${
                  selectedIdx === i
                    ? "bg-white !text-[#056ef5] shadow-md"
                    : "bg-white/10 text-white/85 hover:bg-white/20"
                }`}
              >
                {t.min_students}–{t.max_students}
                {/* Expansion available badge */}
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#c8ff00] text-ink text-[8px] font-black leading-none">
                  +επέκταση
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs opacity-60">
            Επέκταση: +5 μαθητές με 30€ + ΦΠΑ ανά πακέτο
          </p>
        </div>

        <PriceBlock priceCents={tier.price_cents} />

        <div className="mt-7 h-px bg-white/15" />

        <FeatureList features={tier.features} accent="bg-[#c8ff00] text-ink" />

        <div className="mt-8">
          {disabled ? (
            <div className="w-full text-center py-4 text-sm font-semibold opacity-60">
              Μη διαθέσιμο για τον λογαριασμό σας
            </div>
          ) : (
            <BuyButton
              packageId={tier.id}
              signedIn={signedIn}
              purchasable={purchasable}
              buttonClass="bg-[#FDFFFC] !text-[#056ef5] border-2 border-[#c8ff00] hover:bg-[#c8ff00]/10"
            />
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────
function PriceBlock({ priceCents }: { priceCents: number }) {
  if (priceCents === 0) {
    return (
      <div className="mt-7">
        <div className="font-display text-3xl opacity-70 leading-none">Σύντομα διαθέσιμο</div>
        <div className="mt-2 text-[11px] opacity-60 font-bold uppercase tracking-wider">
          Οι τιμές ανακοινώνονται σύντομα
        </div>
      </div>
    );
  }
  return (
    <div className="mt-7">
      <div className="flex items-end gap-2">
        <span className="font-display text-5xl md:text-6xl tabular-nums leading-none">
          {formatEuro(priceCents)}
        </span>
        <span className="text-xs opacity-70 pb-2">+ ΦΠΑ / έτος</span>
      </div>
      <div className="mt-2 text-[11px] opacity-60 font-bold uppercase tracking-wider">
        Ετήσιο πακέτο
      </div>
    </div>
  );
}

function FeatureList({ features, accent }: { features: PackageFeature[]; accent: string }) {
  return (
    <ul className="mt-7 space-y-3 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span
            className={`flex-shrink-0 mt-0.5 grid place-items-center w-5 h-5 rounded-full text-[10px] font-black leading-none ${
              f.included ? accent : "bg-white/10 text-white/40"
            }`}
          >
            {f.included ? "✓" : "—"}
          </span>
          <span className={`leading-snug ${f.included ? "" : "opacity-55 line-through"}`}>
            {f.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
