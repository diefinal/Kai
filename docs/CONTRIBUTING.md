# Contributing to Kai

Thank you for contributing to the Kai project.

Before making any visual, behavioral, or architectural changes, you MUST read the official specifications:
- [docs/KAI_IDENTITY.md](KAI_IDENTITY.md)

## Mandatory Rules for Contributors

Every contributor (human developer or AI agent) MUST:
1. **Read and respect KAI_IDENTITY.md**: This document has the highest priority across all styling, avatar, and persona implementations.
2. **Preserve Kai Identity**: Kai has a single, immutable character identity (kai-official-v1).
3. **Preserve Official Colors**: Adhere strictly to the dark navy, obsidian black, and subtle cyan/blue neon accent palette.
4. **Preserve Official Personality**: Professional, calm, intelligent, friendly, and trustworthy.
5. **Preserve Official UI Language**: Minimal, elegant, glassmorphic desktop interface.

## Strict Prohibitions

Contributors MUST NOT:
- Redesign Kai or create alternate visual themes.
- Replace Kai with other characters, 3D meshes, or personas.
- Generate new avatars using random AI prompts.
- Introduce or restore placeholders, developer avatars, or demo avatars.
- Introduce robot avatars, anime characters, or cartoon styles.
- Change Kai's age (23-25 appearance) or gender (female).
- Hardcode avatar file paths outside of @kai/avatar-engine (CharacterRegistry).

If an asset cannot be loaded or is absent, the system must display:
Official Kai asset missing.
Never render a fallback avatar or alternate character.
