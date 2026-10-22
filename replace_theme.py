import re

def replace_theme(content):
    # Mapping for slate to sky
    content = content.replace('mh-slate-950', 'sky-950')
    content = content.replace('mh-slate-900', 'sky-900')
    content = content.replace('mh-slate-850', 'sky-800')
    content = content.replace('mh-slate-800', 'sky-800')
    content = content.replace('mh-slate-750', 'sky-700')
    content = content.replace('mh-slate-700', 'sky-700')
    content = content.replace('mh-slate-650', 'sky-600')
    content = content.replace('mh-slate-600', 'sky-600')
    content = content.replace('mh-slate-500', 'sky-500')
    content = content.replace('mh-slate-400', 'sky-400')
    content = content.replace('mh-slate-300', 'sky-300')
    content = content.replace('mh-slate-200', 'sky-200')
    content = content.replace('mh-slate-100', 'sky-100')
    
    # Mapping for gold to yellow
    content = content.replace('mh-gold-700', 'yellow-700')
    content = content.replace('mh-gold-600', 'yellow-600')
    content = content.replace('mh-gold-500', 'yellow-500')
    content = content.replace('mh-gold-400', 'yellow-400')
    content = content.replace('mh-gold-300', 'yellow-300')
    content = content.replace('mh-gold-200', 'yellow-200')
    
    # Check if there are other mh-slate or mh-gold left over
    return content

with open('src/pages/HunterChallenges.tsx', 'r') as f:
    content = f.read()

new_content = replace_theme(content)

with open('src/pages/HunterChallenges.tsx', 'w') as f:
    f.write(new_content)
print("Replaced theme in HunterChallenges.tsx")
