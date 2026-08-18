// ─────────────────────────────────────────────────────────────
// MHN Monster Overlay
// Extends core monster data with MHN-specific fields:
//   - sortOrder (in-game Pokédex-style ordering)
//   - hasWeaponStyles (whether this monster's weapons support style customisation)
//   - icon path (relative to /public)
//   - event/collab entries that have no counterpart in the core list
// ─────────────────────────────────────────────────────────────

export interface MHNMonsterOverlay {
  /** Must match a CoreMonster id OR be a MHN-only entry */
  id: string;
  /** In-game sort order (Pokédex-style). undefined = event/no fixed order */
  sortOrder?: number;
  /** Whether this monster's weapons have style customisation available */
  hasWeaponStyles?: boolean;
  icon: string;
}

/** MHN-specific event / collab / starter sets that have no core monster entry */
export interface MHNEventEntry {
  id: string;
  name: string;
  nameJa: string;
  type: 'event' | 'collab' | 'starter';
  icon: string;
}

export const MHN_MONSTER_OVERLAYS: MHNMonsterOverlay[] = [
  { id: 'great_jagras', sortOrder: 1, icon: '/images/monsters/MHNow-Great_Jagras_Icon.png' },
  { id: 'kulu_ya_ku', sortOrder: 2, icon: '/images/monsters/MHNow-Kulu-Ya-Ku_Icon.png' },
  { id: 'pukei_pukei', sortOrder: 3, icon: '/images/monsters/MHNow-Pukei-Pukei_Icon.png' },
  { id: 'coral_pukei_pukei', sortOrder: 4, icon: '/images/monsters/MHNow-Coral_Pukei-Pukei_Icon.png' },
  { id: 'barroth', sortOrder: 5, icon: '/images/monsters/MHNow-Barroth_Icon.png' },
  { id: 'great_girros', sortOrder: 6, icon: '/images/monsters/MHNow-Great_Girros_Icon.png' },
  { id: 'tobi_kadachi', sortOrder: 7, icon: '/images/monsters/MHNow-Tobi-Kadachi_Icon.png' },
  { id: 'viper_tobi_kadachi', sortOrder: 8, icon: '/images/monsters/MHNow-Viper_Tobi-Kadachi_Icon.png' },
  { id: 'paolumu', sortOrder: 9, icon: '/images/monsters/MHNow-Paolumu_Icon.png' },
  { id: 'nightshade_paolumu', sortOrder: 10, icon: '/images/monsters/MHNow-Nightshade_Paolumu_Icon.png' },
  { id: 'jyuratodus', sortOrder: 11, icon: '/images/monsters/MHNow-Jyuratodus_Icon.png' },
  { id: 'anjanath', sortOrder: 12, icon: '/images/monsters/MHNow-Anjanath_Icon.png' },
  { id: 'fulgur_anjanath', sortOrder: 13, icon: '/images/monsters/MHNow-Fulgar-Anjanath_Icon.png' },
  { id: 'rathian', sortOrder: 14, icon: '/images/monsters/MHNow-Rathian_Icon.png' },
  { id: 'pink_rathian', sortOrder: 15, icon: '/images/monsters/MHNow-Pink_Rathian_Icon.png' },
  { id: 'gold_rathian', sortOrder: 16, icon: '/images/monsters/MHNow-Gold_Rathian_Icon.png' },
  { id: 'legiana', sortOrder: 17, icon: '/images/monsters/MHNow-Legiana_Icon.png' },
  { id: 'diablos', sortOrder: 18, icon: '/images/monsters/MHNow-Diablos_Icon.png' },
  { id: 'black_diablos', sortOrder: 19, icon: '/images/monsters/MHNow-Black_Diablos_Icon.png' },
  { id: 'rathalos', sortOrder: 20, icon: '/images/monsters/MHNow-Rathalos_Icon.png' },
  { id: 'azure_rathalos', sortOrder: 21, icon: '/images/monsters/MHNow-Azure_Rathalos_Icon.png' },
  { id: 'silver_rathalos', sortOrder: 22, icon: '/images/monsters/MHNow-Silver_Rathalos_Icon.png' },
  { id: 'radobaan', sortOrder: 23, icon: '/images/monsters/MHNow-Radobaan_Icon.png' },
  { id: 'banbaro', sortOrder: 24, icon: '/images/monsters/MHNow-Banbaro_Icon.png' },
  { id: 'barioth', sortOrder: 25, icon: '/images/monsters/MHNow-Barioth_Icon.png' },
  { id: 'zinogre', sortOrder: 26, icon: '/images/monsters/MHNow-Zinogre_Icon.png' },
  { id: 'stygian_zinogre', sortOrder: 27, icon: '/images/monsters/MHNow-Stygian_Zinogre_Icon.png' },
  { id: 'tzitzi_ya_ku', sortOrder: 28, icon: '/images/monsters/MHNow-Tzitzi-Ya-Ku_Icon.png' },
  { id: 'odogaron', sortOrder: 29, icon: '/images/monsters/MHNow-Odogaron_Icon.png' },
  { id: 'ebony_odogaron', sortOrder: 30, icon: '/images/monsters/MHNow-Ebony_Odogaron_Icon.png' },
  { id: 'deviljho', sortOrder: 31, icon: '/images/monsters/MHNow-Deviljho_Icon.png' },
  { id: 'basarios', sortOrder: 32, icon: '/images/monsters/MHNow-Basarios_Icon.png' },
  { id: 'khezu', sortOrder: 33, icon: '/images/monsters/MHNow-Khezu_Icon.png' },
  { id: 'mizutsune', sortOrder: 34, icon: '/images/monsters/MHNow-Mizutsune_Icon.png' },
  { id: 'kushala_daora', sortOrder: 35, icon: '/images/monsters/MHNow-Kushala_Daora_Icon.png' },
  { id: 'teostra', sortOrder: 36, icon: '/images/monsters/MHNow-Teostra_Icon.png' },
  { id: 'aknosom', sortOrder: 37, icon: '/images/monsters/MHNow-Aknosom_Icon.png' },
  { id: 'magnamalo', sortOrder: 38, icon: '/images/monsters/MHNow-Magnamalo_Icon.png' },
  { id: 'rajang', sortOrder: 39, icon: '/images/monsters/MHNow-Rajang_Icon.png' },
  { id: 'nergigante', sortOrder: 40, icon: '/images/monsters/MHNow-Nergigante_Icon.png' },
  { id: 'lagombi', sortOrder: 41, icon: '/images/monsters/MHNow-Lagombi_Icon.png' },
  { id: 'volvidon', sortOrder: 42, icon: '/images/monsters/MHNow-Volvidon_Icon.png' },
  { id: 'somnacanth', sortOrder: 43, icon: '/images/monsters/MHNow-Somnacanth_Icon.png' },
  { id: 'beotodus', sortOrder: 44, icon: '/images/monsters/MHNow-Beotodus_Icon.png' },
  { id: 'tigrex', sortOrder: 45, icon: '/images/monsters/MHNow-Tigrex_Icon.png' },
  { id: 'brute_tigrex', sortOrder: 46, icon: '/images/monsters/MHNow-Brute_Tigrex_Icon.png' },
  { id: 'kirin', sortOrder: 47, icon: '/images/monsters/MHNow-Kirin_Icon.png' },
  { id: 'bazelgeuse', sortOrder: 48, icon: '/images/monsters/MHNow-Bazelgeuse_Icon.png' },
  { id: 'chatacabra', sortOrder: 49, icon: '/images/monsters/MHNow-Chatacabra_Icon.png' },
  { id: 'arzuros', sortOrder: 50, icon: '/images/monsters/MHNow-Arzuros_Icon.png' },
  { id: 'glavenus', sortOrder: 51, icon: '/images/monsters/MHNow-Glavenus_Icon.png' },
  { id: 'chameleos', sortOrder: 52, icon: '/images/monsters/MHNow-Chameleos_Icon.png' },
  { id: 'wroggi', sortOrder: 53, icon: '/images/monsters/MHNow-Great_Wroggi_Icon.png' },
  { id: 'bishaten', sortOrder: 54, hasWeaponStyles: true, icon: '/images/monsters/MHNow-Bishaten_Icon.png' },
  { id: 'namielle', sortOrder: 55, icon: '/images/monsters/MHNow-Namielle_Icon.png' },
  { id: 'nargacuga', sortOrder: 56, icon: '/images/monsters/MHNow-Nargacuga_Icon.png' },
  { id: 'lunagaron', sortOrder: 57, icon: '/images/monsters/MHNow-Lunagaron_Icon.png' },
  { id: 'espinas', sortOrder: 58, icon: '/images/monsters/MHNow-Espinas_Icon.png' },
  { id: 'malzeno', sortOrder: 59, icon: '/images/monsters/MHNow-Malzeno_Icon.png' },
  { id: 'quematrice', sortOrder: 60, icon: '/images/monsters/MHNow-Quematrice_Icon.png' },
  { id: 'garangolm', sortOrder: 61, icon: '/images/monsters/MHNow-Garangolm_Icon.png' },
  { id: 'goss_harag', sortOrder: 62, icon: '/images/monsters/MHNow-Goss_Harag_Icon.png' },
  { id: 'astalos', sortOrder: 63, icon: '/images/monsters/MHNow-Astalos_Icon.png' },
  { id: 'seregios', sortOrder: 64, icon: '/images/monsters/MHNow-Seregios_Icon.png' },
  { id: 'almudron', sortOrder: 65, icon: '/images/monsters/MHNow-Almudron_Icon.png' },
  { id: 'shogun_ceanataur', sortOrder: 66, icon: '/images/monsters/MHNow-Shogun_Ceanataur_Icon.png' },
  { id: 'velkhana', sortOrder: 67, icon: '/images/monsters/MHNow-Velkhana_Icon.png' },
];

/** MHN-only event/collab entries not in the core monster list */
export const MHN_EVENT_ENTRIES: MHNEventEntry[] = [
  { id: 'leather', name: 'Leather', nameJa: 'レザー', type: 'starter', icon: '/images/monsters/MHNow-Leather_Icon.png' },
  { id: 'alloy', name: 'Alloy', nameJa: 'アロイ', type: 'starter', icon: '/images/monsters/MHNow-Alloy_Icon.png' },
  { id: 'bone', name: 'Bone', nameJa: '骨', type: 'starter', icon: '/images/monsters/MHNow-Bone_Icon.png' },
  { id: 'lunar_new_year', name: 'Lunar New Year', nameJa: '旧正月', type: 'event', icon: '/images/monsters/MHNow-Lunar_New_Year_Icon.png' },
  { id: 'spring_festival', name: 'Spring Festival', nameJa: 'スプリングフェスティバル', type: 'event', icon: '/images/monsters/MHNow-Spring_Festival_Icon.png' },
  { id: 'hope', name: 'Hope', nameJa: 'ホープ', type: 'event', icon: '/images/monsters/MHNow-Hope_Icon.png' },
  { id: 'halloween', name: 'Halloween', nameJa: 'ハロウィン', type: 'event', icon: '/images/monsters/MHNow-Halloween_Icon.png' },
  { id: 'happy_hunting_new_year', name: 'Happy Hunting New Year', nameJa: 'ハッピーハンティングニューイヤー', type: 'event', icon: '/images/monsters/MHNow-Happy_Hunting_New_Year_Icon.png' },
  { id: 'mrbeast', name: 'MrBeast', nameJa: 'MrBeast', type: 'collab', icon: '/images/monsters/MHNow-MrBeast_Icon.png' },
];

export const MHN_MONSTER_OVERLAY_MAP = new Map<string, MHNMonsterOverlay>(
  MHN_MONSTER_OVERLAYS.map((o) => [o.id, o])
);
