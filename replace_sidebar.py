import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    content = f.read()

# We need to find the logic where it applies colors.
# Specifically inside Sidebar.tsx:
# isActive && !isAdminItem
#   ? 'bg-mh-slate-800 border-mh-slate-700 shadow-md shadow-black/40 text-mh-gold-400 translate-x-1'
#   : isActive && isAdminItem
# ...

def replace_logic(content):
    # we want to modify the classes dynamically if item.id == 'challenges'
    # Actually it's better to just inject a condition for challenges
    
    # Let's write the new class logic
    old_class_logic = """                    isActive && !isAdminItem
                      ? 'bg-mh-slate-800 border-mh-slate-700 shadow-md shadow-black/40 text-mh-gold-400 translate-x-1'
                      : isActive && isAdminItem
                      ? 'bg-mh-slate-800 border-mh-slate-700 shadow-md shadow-black/40 text-mh-gold-400 translate-x-1'
                      : isAdminItem
                      ? 'border-transparent bg-transparent text-mh-gold-600 hover:bg-mh-slate-900 hover:border-mh-slate-800 hover:translate-x-0.5 hover:text-mh-gold-400'
                      : 'border-transparent bg-transparent text-mh-slate-400 hover:bg-mh-slate-900 hover:border-mh-slate-800 hover:translate-x-0.5 hover:text-mh-slate-200',"""
    
    new_class_logic = """                    isActive && !isAdminItem && item.id !== 'challenges'
                      ? 'bg-mh-slate-800 border-mh-slate-700 shadow-md shadow-black/40 text-mh-gold-400 translate-x-1'
                      : isActive && !isAdminItem && item.id === 'challenges'
                      ? 'bg-sky-800 border-sky-700 shadow-md shadow-black/40 text-yellow-400 translate-x-1'
                      : isActive && isAdminItem
                      ? 'bg-mh-slate-800 border-mh-slate-700 shadow-md shadow-black/40 text-mh-gold-400 translate-x-1'
                      : isAdminItem
                      ? 'border-transparent bg-transparent text-mh-gold-600 hover:bg-mh-slate-900 hover:border-mh-slate-800 hover:translate-x-0.5 hover:text-mh-gold-400'
                      : item.id === 'challenges'
                      ? 'border-transparent bg-transparent text-sky-400 hover:bg-sky-900 hover:border-sky-800 hover:translate-x-0.5 hover:text-sky-200'
                      : 'border-transparent bg-transparent text-mh-slate-400 hover:bg-mh-slate-900 hover:border-mh-slate-800 hover:translate-x-0.5 hover:text-mh-slate-200',"""
                      
    content = content.replace(old_class_logic, new_class_logic)
    
    # Active indicator bar
    old_bar = """                  {isActive && !sidebarCollapsed && (
                    <span
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-sm bg-mh-gold-400 shadow-[2px_0_8px_rgba(250,204,21,0.4)]"
                      aria-hidden="true"
                    />
                  )}"""
    
    new_bar = """                  {isActive && !sidebarCollapsed && (
                    <span
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 rounded-r-sm shadow-[2px_0_8px_rgba(250,204,21,0.4)]",
                        item.id === 'challenges' ? "bg-yellow-400" : "bg-mh-gold-400"
                      )}
                      aria-hidden="true"
                    />
                  )}"""
    content = content.replace(old_bar, new_bar)
    
    old_collapsed_bar = """                  {isActive && sidebarCollapsed && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-mh-gold-400 glow-gold"
                      aria-hidden="true"
                    />
                  )}"""
    new_collapsed_bar = """                  {isActive && sidebarCollapsed && (
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full glow-gold",
                        item.id === 'challenges' ? "bg-yellow-400" : "bg-mh-gold-400"
                      )}
                      aria-hidden="true"
                    />
                  )}"""
    content = content.replace(old_collapsed_bar, new_collapsed_bar)
    
    old_icon = """                  <Icon
                    size={20}
                    className={cn(
                      'shrink-0 transition-colors duration-300',
                      isActive
                        ? 'text-mh-gold-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                        : isAdminItem
                        ? 'text-mh-gold-600 group-hover:text-mh-gold-400'
                        : 'text-mh-slate-500 group-hover:text-mh-slate-300',
                    )}
                  />"""
                  
    new_icon = """                  <Icon
                    size={20}
                    className={cn(
                      'shrink-0 transition-colors duration-300',
                      isActive
                        ? (item.id === 'challenges' ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' : 'text-mh-gold-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]')
                        : isAdminItem
                        ? 'text-mh-gold-600 group-hover:text-mh-gold-400'
                        : item.id === 'challenges'
                        ? 'text-sky-500 group-hover:text-sky-300'
                        : 'text-mh-slate-500 group-hover:text-mh-slate-300',
                    )}
                  />"""
    content = content.replace(old_icon, new_icon)
    
    old_label = """                      <p className={cn(
                        'text-sm font-bold tracking-wide transition-colors',
                        isActive ? 'text-mh-gold-300 drop-shadow-sm' : '',
                      )}>"""
                      
    new_label = """                      <p className={cn(
                        'text-sm font-bold tracking-wide transition-colors',
                        isActive ? (item.id === 'challenges' ? 'text-yellow-300 drop-shadow-sm' : 'text-mh-gold-300 drop-shadow-sm') : '',
                      )}>"""
    content = content.replace(old_label, new_label)
    
    old_desc = """                      <p className="mt-0.5 text-[10px] text-mh-slate-500">
                        {item.description}
                      </p>"""
    new_desc = """                      <p className={cn("mt-0.5 text-[10px]", item.id === 'challenges' && !isActive ? "text-sky-500" : "text-mh-slate-500")}>
                        {item.description}
                      </p>"""
    content = content.replace(old_desc, new_desc)

    return content

new_content = replace_logic(content)

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(new_content)
print("Sidebar updated")
