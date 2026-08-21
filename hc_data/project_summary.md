# Monster Hunter Now - Self Challenge Tracker

## Project Overview

A community-driven web platform where Monster Hunter Now players can discover, complete, and share custom self-imposed challenges. The site enables hunters to push the game's replayability by creating their own limitations and achievements, fostering a competitive and creative community.

## Recent Updates (v1.1)

### New Features
- **MHN.Quest Integration**: 
  - **Import**: Paste an `mhn.quest` URL when creating a "Build" challenge to automatically populate weapon and armor details.
  - **Export**: Generate an `mhn.quest` compatible link from any build challenge to view stats and material requirements.
- **Enhanced Sharing**: 
  - **Share Image Generator**: Create beautiful, shareable image cards with challenge details and loadout visuals.
  - **Quick Share Link**: Copy direct challenge URLs with a single click.
- **Localization**: Full English and Japanese support.
- **Driftstone Field Guide**: Track event-specific driftstone drops and goals.

## Current Phase: Phase 3 (Community & Polish)

We have successfully launched the MVP and are currently refining community features and adding polish. The platform is live with core functionality including challenge creation, browsing, adoption, and voting.

### Completed Milestones
- [x] **Core Frontend**: React-based UI on Cloudflare Pages.
- [x] **Backend Infrastructure**: Supabase Auth & Database.
- [x] **Challenge System**: 
  - Story, Build, and Custom challenge types.
  - Submission logic with validation.
  - "Adopt" workflow for personal tracking.
- [x] **Community Features**:
  - Upvote/Downvote system.
  - User profiles (basic).
  - Creator attribution.
- [x] **Localization**: Japanese translation support.
- [x] **External Integrations**: MHN.Quest import/export.

## Feature Rollout Roadmap & Remaining Tasks

### Phase 2: Automation & AI (In Progress/Next)
- [ ] **AI Pre-Review Agent**: Integrate Claude API to scan submissions for safety/quality before posting.
- [ ] **Auto-Posting**: Enable auto-approval for low-risk submissions that pass AI checks.
- [ ] **Reputation System**: Formalize scoring for user contributions.

### Phase 3: Advanced Engagement (Current Focus)
- [ ] **Leaderboards**: Display top hunters and most popular challenges.
- [x] **Advanced Filtering**: Filter by monster, weapon, etc. (Basic implementation done, refining).
- [ ] **Email Notifications**: Notify users of upvotes or replies.
- [ ] **Video Preview**: Better integration for video clips in challenges.

### Phase 4: Expansion & Monetization (Future)
- [ ] **Patreon Integration**: 
  - [ ] Webhook for subscription tracking.
  - [ ] Tier-based features (e.g., custom badges, priority review).
  - *Note: OAuth foundation exists.*
- [ ] **Advanced Vision AI**: Verify screenshot proofs against challenge requirements.
- [ ] **Mobile App**: Native React Native application.
- [ ] **Analytics Dashboard**: Insights for creators on their challenge performance.

## Target Audience

- **Monster Hunter Now players** seeking extended gameplay challenge.
- **Community-driven hunters** who enjoy sharing builds and strategies.

## Success Metrics (Updated)

- **Adoption**: Tracking active challenge adoptions.
- **Engagement**: Monitoring share link usage and export actions.
- **Quality**: Ratio of upvotes to downvotes on challenges.

## Tech Stack (Current)

- **Frontend**: React (Vite), Cloudflare Pages.
- **Backend**: Supabase (PostgreSQL, Auth), Cloudflare Workers (API).
- **Styling**: CSS Modules/Vanilla CSS with responsive design.
- **Localization**: i18n for EN/JA.
