import { useState } from "react";
import { PARTY_CLASS_KEYS, PARTY_CLASS_NAMES } from "../content/classDefinitions.js";
import { WEAPON_FIXED_PRICES } from "../battle/scaling.js";
import {
  PARTY_ARMOR_PRICES,
  armorUpgradePrice,
  listPotencyOffers,
  weaponUpgradePrice,
} from "./partyShop.js";

/**
 * Party camp between floors: weapons, armor, skill potency (0.4× prices).
 */
export default function PartyShopScreen({
  colors,
  screenShell,
  comp,
  floor,
  partyWallet,
  equipment,
  skillUnlocks,
  onBuyWeapon,
  onBuyArmor,
  onBuyPotency,
  onContinue,
  onRetreat,
}) {
  const [tab, setTab] = useState(comp?.[0] ?? "warrior");
  const classKey = tab;
  const equip = equipment?.[classKey] ?? { weaponTier: 0, armorTier: 0, skillPotency: {} };
  const weaponNext = equip.weaponTier + 1;
  const armorNext = equip.armorTier + 1;
  const potencyOffers = listPotencyOffers(classKey, skillUnlocks?.[classKey], equip);

  return (
    <div style={{ ...screenShell, animation: "fadeUp 0.3s ease" }}>
      <div style={{ fontSize: 9, color: colors.gold, marginBottom: 6 }}>Party camp</div>
      <div style={{ fontSize: 7, color: colors.muted, marginBottom: 10 }}>
        Floor {floor} · Wallet 💰 {Number(partyWallet || 0).toLocaleString()} (0.4× prices)
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {(comp ?? PARTY_CLASS_KEYS).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 6,
              padding: "8px 10px",
              cursor: "pointer",
              border: `1px solid ${tab === key ? colors.gold : "#2a2a3a"}`,
              color: tab === key ? colors.gold : colors.dimmed,
              background: tab === key ? `${colors.gold}18` : "transparent",
            }}
          >
            {PARTY_CLASS_NAMES[key] ?? key}
          </button>
        ))}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 340,
          padding: 10,
          border: `1px solid ${colors.surfaceBorder}`,
          borderRadius: 6,
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 7, color: colors.muted, marginBottom: 8 }}>
          Weapon tier {equip.weaponTier} · Armor tier {equip.armorTier}
        </div>
        <button
          type="button"
          onClick={() => onBuyWeapon(classKey)}
          disabled={weaponNext >= WEAPON_FIXED_PRICES.length}
          style={shopBtnStyle(colors)}
        >
          Upgrade weapon → tier {weaponNext} (
          {weaponUpgradePrice(classKey, weaponNext).toLocaleString()})
        </button>
        <button
          type="button"
          onClick={() => onBuyArmor(classKey)}
          disabled={armorNext >= PARTY_ARMOR_PRICES.length}
          style={{ ...shopBtnStyle(colors), marginTop: 8 }}
        >
          Upgrade armor → tier {armorNext} ({armorUpgradePrice(armorNext).toLocaleString()})
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 340, marginBottom: 12 }}>
        <div style={{ fontSize: 7, color: colors.muted, marginBottom: 6 }}>Skill potency</div>
        {potencyOffers.length === 0 && (
          <div style={{ fontSize: 6, color: colors.dimmed }}>No upgrades available</div>
        )}
        {potencyOffers.slice(0, 6).map((o) => (
          <button
            key={o.skillId}
            type="button"
            onClick={() => onBuyPotency(classKey, o.skillId)}
            style={{ ...shopBtnStyle(colors), marginTop: 6, width: "100%" }}
          >
            {o.icon} {o.name} Lv{o.level}→{o.level + 1} ({o.price.toLocaleString()})
          </button>
        ))}
      </div>

      <button type="button" onClick={onContinue} style={primaryBtnStyle(colors)}>
        Next floor
      </button>
      <button type="button" onClick={onRetreat} style={{ ...ghostBtnStyle(colors), marginTop: 10 }}>
        Retreat
      </button>
    </div>
  );
}

function shopBtnStyle(colors) {
  return {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 6,
    padding: "10px 12px",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    border: `1px solid ${colors.surfaceBorder}`,
    background: colors.surface,
    color: colors.dimmed,
  };
}

function primaryBtnStyle(colors) {
  return {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 9,
    padding: "14px 28px",
    cursor: "pointer",
    border: `2px solid ${colors.fightBorder}`,
    background: `${colors.fight}22`,
    color: colors.fight,
  };
}

function ghostBtnStyle(colors) {
  return {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 7,
    padding: "10px 16px",
    cursor: "pointer",
    border: "1px solid #4a3a2a",
    color: "#ccaa66",
    background: "transparent",
  };
}
