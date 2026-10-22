import re

with open('src/pages/HunterChallenges.tsx', 'r') as f:
    content = f.read()

# 1. Update image boxes
# Compact row
old_compact = """        {/* Piece icon */}
        <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-sky-950 border border-sky-800">
          {pieceImg && (
            <img src={pieceImg} alt={slotLabel} className="h-8 w-8 object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          )}
        </div>"""
new_compact = """        {/* Piece icon */}
        <div className="shrink-0 flex items-center justify-center">
          {pieceImg && (
            <img src={pieceImg} alt={slotLabel} className="h-10 w-10 object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          )}
        </div>"""
content = content.replace(old_compact, new_compact)

# Desktop card
old_desktop = """        {/* Piece image */}
        <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl bg-sky-950 border border-sky-800 p-1.5">
          {pieceImg ? (
            <img src={pieceImg} alt={slotLabel} className="h-full w-full object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          ) : (
            <Shield size={24} className="text-sky-600" />
          )}
        </div>"""
new_desktop = """        {/* Piece image */}
        <div className="shrink-0 flex items-center justify-center">
          {pieceImg ? (
            <img src={pieceImg} alt={slotLabel} className="h-16 w-16 object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          ) : (
            <Shield size={32} className="text-sky-600" />
          )}
        </div>"""
content = content.replace(old_desktop, new_desktop)

# HuntingTargetsPanel props
old_panel_props = """interface HuntingTargetsPanelProps {
  monsterGroups: Map<string, { monsterName: string; setIcon: string | null; challenges: HunterChallenge[] }>;
}"""
new_panel_props = """interface HuntingTargetsPanelProps {
  monsterGroups: Map<string, { monsterName: string; setIcon: string | null; challenges: HunterChallenge[] }>;
  selectedMonster: string | null;
  onSelectMonster: (monsterName: string | null) => void;
  selectedActivity: string | null;
  onSelectActivity: (activityName: string | null) => void;
}"""
content = content.replace(old_panel_props, new_panel_props)

# HuntingTargetsPanel definition
old_panel_def = """function HuntingTargetsPanel({ monsterGroups }: HuntingTargetsPanelProps) {"""
new_panel_def = """function HuntingTargetsPanel({ monsterGroups, selectedMonster, onSelectMonster, selectedActivity, onSelectActivity }: HuntingTargetsPanelProps) {"""
content = content.replace(old_panel_def, new_panel_def)

# Monster icon in panel
old_panel_icon = """                {/* Monster icon */}
                <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-sky-950 border border-sky-800 p-1">
                  {group.setIcon ? (
                    <img
                      src={group.setIcon}
                      alt={group.monsterName}
                      className="h-full w-full object-contain"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Shield size={20} className="text-sky-600" />
                  )}
                </div>"""
new_panel_icon = """                {/* Monster icon */}
                <div className="shrink-0 flex items-center justify-center">
                  {group.setIcon ? (
                    <img
                      src={group.setIcon}
                      alt={group.monsterName}
                      className="h-12 w-12 object-contain"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Shield size={24} className="text-sky-600" />
                  )}
                </div>"""
content = content.replace(old_panel_icon, new_panel_icon)

# Monster row click & selected style
old_monster_row = """              <button
                type="button"
                onClick={() => setExpandedMonster(isExpanded ? null : monsterId)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-sky-800/60 transition-colors"
              >"""
new_monster_row = """              <button
                type="button"
                onClick={() => {
                  setExpandedMonster(isExpanded ? null : monsterId);
                  onSelectMonster(selectedMonster === group.monsterName ? null : group.monsterName);
                  onSelectActivity(null);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left transition-colors",
                  selectedMonster === group.monsterName ? "bg-sky-800" : "hover:bg-sky-800/60"
                )}
              >"""
content = content.replace(old_monster_row, new_monster_row)

# Sub-challenge icon in panel
old_sub_icon = """                          {/* Slot icon */}
                          <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-sky-950 border border-sky-800">
                            {(c.piece_image ?? slotIcon) && (
                              <img
                                src={c.piece_image ?? slotIcon!}
                                alt={slotLabel}
                                className="h-5 w-5 object-contain"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            )}
                          </div>"""
new_sub_icon = """                          {/* Slot icon */}
                          <div className="shrink-0 flex items-center justify-center">
                            {(c.piece_image ?? slotIcon) && (
                              <img
                                src={c.piece_image ?? slotIcon!}
                                alt={slotLabel}
                                className="h-7 w-7 object-contain"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            )}
                          </div>"""
content = content.replace(old_sub_icon, new_sub_icon)

# Activities list interaction
old_activity = """            {sortedActivities.map(([activity, count]) => (
              <div key={activity} className="flex items-center justify-between bg-sky-800/40 border border-sky-700/50 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-sky-200 truncate pr-2">{activity}</span>
                <span className="text-[10px] font-bold text-sky-500 bg-sky-800 px-2 py-0.5 rounded-full shrink-0">
                  x{count}
                </span>
              </div>
            ))}"""
new_activity = """            {sortedActivities.map(([activity, count]) => (
              <button
                key={activity}
                onClick={() => {
                  onSelectActivity(selectedActivity === activity ? null : activity);
                  onSelectMonster(null);
                }}
                className={cn(
                  "w-full flex items-center justify-between border rounded-xl px-3 py-2 text-left transition-colors",
                  selectedActivity === activity 
                    ? "bg-sky-800 border-sky-600 shadow-md"
                    : "bg-sky-800/40 border-sky-700/50 hover:bg-sky-800/70"
                )}
              >
                <span className="text-xs font-semibold text-sky-200 truncate pr-2">{activity}</span>
                <span className="text-[10px] font-bold text-sky-500 bg-sky-800 px-2 py-0.5 rounded-full shrink-0">
                  x{count}
                </span>
              </button>
            ))}"""
content = content.replace(old_activity, new_activity)

# Mobile strip interactions and state setup
old_state = """  const [filterTab, setFilterTab]         = useState<FilterTab>('active');
  const [loginModalOpen, setLoginModalOpen] = useState(false);"""
new_state = """  const [filterTab, setFilterTab]         = useState<FilterTab>('active');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedMonster, setSelectedMonster] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);"""
content = content.replace(old_state, new_state)

# Apply filter to filteredChallenges
old_filtered = """  const filteredChallenges = useMemo(() => {
    switch (filterTab) {
      case 'active':
        return challenges.filter((c) => c.status === 'crafting' || c.status === 'upgrading');
      case 'completed':
        return challenges.filter((c) => c.status === 'completed' || c.status === 'abandoned');
      default:
        return challenges;
    }
  }, [challenges, filterTab]);"""
new_filtered = """  const filteredChallenges = useMemo(() => {
    let baseList = challenges;
    switch (filterTab) {
      case 'active':
        baseList = challenges.filter((c) => c.status === 'crafting' || c.status === 'upgrading');
        break;
      case 'completed':
        baseList = challenges.filter((c) => c.status === 'completed' || c.status === 'abandoned');
        break;
    }
    
    if (selectedMonster) {
      baseList = baseList.filter(c => c.monster_name === selectedMonster);
    } else if (selectedActivity) {
      baseList = baseList.filter(c => c.missing_material_activity === selectedActivity);
    }
    
    return baseList;
  }, [challenges, filterTab, selectedMonster, selectedActivity]);"""
content = content.replace(old_filtered, new_filtered)

# Mobile strip icon
old_mobile_strip_icon = """                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-sky-950 border border-sky-800">
                      {group.setIcon ? (
                        <img src={group.setIcon} alt={group.monsterName} className="h-8 w-8 object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <Shield size={18} className="text-sky-600" />
                      )}
                    </div>"""
new_mobile_strip_icon = """                    <div className="flex items-center justify-center">
                      {group.setIcon ? (
                        <img src={group.setIcon} alt={group.monsterName} className="h-10 w-10 object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <Shield size={24} className="text-sky-600" />
                      )}
                    </div>"""
content = content.replace(old_mobile_strip_icon, new_mobile_strip_icon)

# Pass props to panel
old_panel_usage = """<HuntingTargetsPanel monsterGroups={monsterGroups} />"""
new_panel_usage = """<HuntingTargetsPanel 
                monsterGroups={monsterGroups} 
                selectedMonster={selectedMonster}
                onSelectMonster={setSelectedMonster}
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity}
              />"""
content = content.replace(old_panel_usage, new_panel_usage)

# Make mobile strip clickable
old_mobile_strip_row = """                  <div
                    key={group.monsterName}
                    className="shrink-0 flex flex-col items-center gap-1 rounded-xl border border-sky-700 bg-sky-900 p-2 min-w-[64px]"
                  >"""
new_mobile_strip_row = """                  <button
                    key={group.monsterName}
                    onClick={() => {
                      setSelectedMonster(selectedMonster === group.monsterName ? null : group.monsterName);
                      setSelectedActivity(null);
                    }}
                    className={cn(
                      "shrink-0 flex flex-col items-center gap-1 rounded-xl border p-2 min-w-[64px] transition-colors",
                      selectedMonster === group.monsterName ? "bg-sky-800 border-sky-600" : "bg-sky-900 border-sky-700"
                    )}
                  >"""
# Need to make sure closing tag matches! Wait, the original has a div closing tag.
# If I change `<div` to `<button`, I need to change `</div>` to `</button>`. Let's just fix it properly.
pass

with open('src/pages/HunterChallenges.tsx', 'w') as f:
    f.write(content)
print("Updated HunterChallenges.tsx")
