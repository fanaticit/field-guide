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
