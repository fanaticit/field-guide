# Hunter's Armory & Build Planner Updates

I've successfully updated the Build Planner and implemented the Hunter's Armory! Here's a breakdown of the new features:

## 1. Hunter's Armory Page
- Added a new `Armory.tsx` page to display community builds.
- The Armory queries the `mho_builds` database table for published builds and lists them in a responsive card grid, showing the build's title, description, author, and upvotes.
- Clicking on a build card directs you to the Build Planner page to view and edit that specific loadout.

## 2. Save & Load System in Build Planner
- The Build Planner now supports dynamic routing (`/build-planner/:buildId`) to fetch and load a saved build from the database. 
- Integrated a new **Title** and **Description** input at the top of the Build Planner.
- Refactored the `BuildPlannerStore` to properly hydrate all related entities (Adventurer, Weapon, Armour pieces, and Visage cards) when loading a build. 

## 3. Author Permissions & Cloning
- Added permission logic so that the author of a build can update their original save using the **Update Build** button.
- Other users viewing a build can tweak and test the loadout, but they can only save it as their own by using the **Clone as New** button. Authors also have access to the clone button to easily duplicate their own builds.

## 4. Build Role Toggle (Main / Support)
- Added a "Main / Support" toggle to the Build Planner next to the badge, styled with green (Main) and orange (Support).
- Embedded this role data directly into the build description block to safely save and load this data without requiring a database schema change. 
- Updated the Hunter's Armory community builds list to show the Adventurer's profile picture alongside the Main/Support role badge. 

## 5. Build Planner Visage Card Improvements
- Redesigned the Visage Cards layout in the Build Planner to dynamically expand across the full width of the panel. The Core Visage and slots 2-5 now use a responsive flex/grid layout (`aspect-[4/5]`) that scales with the window while remaining cleanly on one row.
- Replaced the hardcoded ink colors and circles with the precise data-driven configuration (`getInkConfig`) and SVGs (`InkIconComponent`) used in the Investigation Notes, ensuring perfect visual parity between the database and the Build Planner.
- Improved the text truncation on cards lacking images to allow full titles to wrap and display correctly within the expanded slot widths.

## 6. Set Bonus "Add Card" Feature
- Added a `+` button next to the name of each active Set Bonus inside the Build Planner.
- Clicking this button automatically finds the first available empty visage slot and opens the card picker menu.
- Crucially, the picker is automatically **filtered to only show cards that belong to that specific Set Bonus / ink type**, indicated by a small pill badge in the picker header. 
- Selecting a card while this filter is active will automatically equip it with that specific ink type selected (even if the card supports multiple inks).

## 7. Visage Card Search & Sorting
- The Visage card picker now natively sorts cards by their designated `sort_order` directly from the database instead of defaulting to insertion order.
- Added an autofocusing search input inside the card picker menu, allowing you to quickly filter down available cards by typing their name.
- Opening a slot or using the quick-add `+` button automatically clears your previous search query for a fresh slate.

## 8. Build Planner Layout & Styling Refinements
- **Skill Summary Placement**: Moved the Skills box from the right column to sit directly alongside the Equipment Selector in the left column. This naturally reduces its width by 50% while making the layout much more compact and related.
- **Skill Categorization**: Added visual categorizations to the Skills list. Skills are now color-coded based on their DB category (e.g., Attack is red, Defense is blue, Critical is purple) and feature matching category icons for quick scanning.
- **Equipment Slot Overhaul**: Redesigned the Equipment dropdown boxes. The slot titles (like "HELM") have been moved directly inside the buttons for a cleaner UI. The icons are now 25% larger, with reduced padding to make the equipment artwork much more prominent inside their borders.

## 9. Build Planner Grand Restructuring
- **Top Row Metadata**: Consolidated the Adventurer, Buddy, Build Title, and Build Description into a unified top row spanning the width of the screen.
- **Three-Column Core Layout**: Rearranged the main workspace into a single streamlined row with a strict 40/30/30 split across three columns: Equipment (40%), Skills (30%), and Visage Cards (30%).
- **Dropdown Enhancements**: Replaced the standalone "Equipped Armour" paper doll panel entirely. Instead, each slot in the Equipment dropdown now explicitly visualizes its state: the generic armour slot icon (e.g., a chest piece silhouette) sits on the left of the button, while the actually equipped armor image renders dynamically on the right side.
- **Streamlined Text**: Renamed the "Equipment Skills" header simply to "Skills".

## 10. Refined Build Planner Top Row & Dropdowns
- Reverted the "Build Planner" badge and Save/Clone action buttons to sit on their own dedicated row at the very top of the page.
- Adjusted the second row to precisely match the requested column layout: 
  - **Left**: Adventurer (centered) with the Weapon Type selector directly underneath it.
  - **Middle**: Buddy selection and its passive effect underneath.
  - **Right**: Build Title and Description inputs.
- Restored the **Monster Icon** inside the actual equipment dropdown selection lists.
- Adjusted the right-side box of the dropdowns to display the **Armor's picture** (or fallback to the monster icon if the armor artwork is missing).
