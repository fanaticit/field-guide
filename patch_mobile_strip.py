import re

with open('src/pages/HunterChallenges.tsx', 'r') as f:
    content = f.read()

# Make mobile strip clickable correctly
old_mobile_strip_div = """                  <div
                    key={group.monsterName}
                    className="shrink-0 flex flex-col items-center gap-1 rounded-xl border border-sky-700 bg-sky-900 p-2 min-w-[64px]"
                  >
                    <div className="flex items-center justify-center">
                      {group.setIcon ? (
                        <img src={group.setIcon} alt={group.monsterName} className="h-10 w-10 object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <Shield size={24} className="text-sky-600" />
                      )}
                    </div>
                    <span className="text-[9px] font-semibold text-sky-300 text-center leading-tight max-w-[60px] truncate">
                      {group.monsterName}
                    </span>
                    <span className="text-[8px] text-sky-600 font-mono">
                      ×{group.challenges.length}
                    </span>
                  </div>"""

new_mobile_strip_div = """                  <button
                    key={group.monsterName}
                    onClick={() => {
                      setSelectedMonster(selectedMonster === group.monsterName ? null : group.monsterName);
                      setSelectedActivity(null);
                    }}
                    className={cn(
                      "shrink-0 flex flex-col items-center gap-1 rounded-xl border p-2 min-w-[64px] transition-colors",
                      selectedMonster === group.monsterName ? "bg-sky-800 border-sky-600 shadow-md" : "bg-sky-900 border-sky-700"
                    )}
                  >
                    <div className="flex items-center justify-center">
                      {group.setIcon ? (
                        <img src={group.setIcon} alt={group.monsterName} className="h-10 w-10 object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <Shield size={24} className="text-sky-600" />
                      )}
                    </div>
                    <span className="text-[9px] font-semibold text-sky-300 text-center leading-tight max-w-[60px] truncate">
                      {group.monsterName}
                    </span>
                    <span className="text-[8px] text-sky-600 font-mono">
                      ×{group.challenges.length}
                    </span>
                  </button>"""

if old_mobile_strip_div in content:
    content = content.replace(old_mobile_strip_div, new_mobile_strip_div)
    with open('src/pages/HunterChallenges.tsx', 'w') as f:
        f.write(content)
    print("Mobile strip updated")
else:
    print("Could not find mobile strip div")
