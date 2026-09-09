\# Kai Modules



Bu doküman Kai içerisindeki bütün modüllerin görevlerini açıklar.



\---



\# Core



Sorumluluk



\- Event Bus

\- Dependency Injection

\- Configuration

\- Logging

\- Lifecycle



Bağımlılığı



Yok



\---



\# Planner



Sorumluluk



\- Goal Planning

\- Task Planning

\- Workflow Planning

\- AI Decision Making



Bağımlılık



Core



Memory



Vision



\---



\# Vision Engine



Sorumluluk



\- Screen Capture

\- OCR

\- Window Detection

\- UI Detection

\- Browser Detection

\- IDE Detection

\- Snapshot Creation



Bağımlılık



Core



Shared



\---



\# Windows Engine



Sorumluluk



\- Mouse

\- Keyboard

\- Clipboard

\- Explorer

\- Notifications

\- Window Management



Bağımlılık



Core



Vision



\---



\# Browser Engine



Sorumluluk



\- Chrome Automation

\- Edge Automation

\- Firefox Automation

\- DOM Access



Bağımlılık



Vision



Windows



\---



\# Voice Engine



Sorumluluk



\- Wake Word

\- Speech Recognition

\- Text To Speech

\- Voice Conversation



Bağımlılık



Planner



Memory



\---



\# Coding Engine



Sorumluluk



\- VSCode

\- Git

\- Docker

\- Terminal

\- MongoDB

\- MSSQL



Bağımlılık



Planner



Vision



Windows



\---



\# Memory Engine



Sorumluluk



\- Short Memory

\- Long Memory

\- Semantic Search

\- User Profile



Bağımlılık



Core



\---



\# Tool Engine



Sorumluluk



\- Tool Registry

\- Tool Resolver

\- Plugin Loader

\- Permission Check



Bağımlılık



Core



\---



\# Permission Engine



Sorumluluk



\- File Permissions

\- Desktop Permissions

\- Browser Permissions

\- Microphone Permissions



Bağımlılık



Core



\---



\# Plugin SDK



Sorumluluk



\- Third-party Plugin Support

\- Plugin Lifecycle

\- Plugin API



Bağımlılık



Core

