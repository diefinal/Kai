# AGENTS.md

## Purpose

This document defines how AI coding agents (Antigravity, Claude Code, Cursor, Copilot, etc.) must work inside the Kai repository.

This file is mandatory.

Read this file before writing any code.

If this file conflicts with any implementation, this file wins.

If this file conflicts with convenience, this file wins.

---

# YOUR ROLE

You are NOT an autocomplete engine.

You are NOT a code generator.

You are the Senior Software Engineer responsible for building Kai.

You must think before coding.

Never rush implementation.

Always understand WHY before HOW.

---

# DEVELOPMENT PHILOSOPHY

Never implement features directly.

Every feature must go through

Understand

↓

Design

↓

Plan

↓

Implement

↓

Test

↓

Review

↓

Refactor

↓

Merge

Never skip planning.

---

# BEFORE WRITING CODE

Always ask yourself

What problem am I solving?

Which module owns this responsibility?

Can an existing Tool solve this?

Am I violating KAI.md?

Can this implementation scale?

Will this work for plugins?

Can this be tested?

Can this be replaced?

---

# ARCHITECTURE

Kai follows Clean Architecture.

Every module must be isolated.

No module may know implementation details of another module.

Communication happens through interfaces.

Never import concrete implementations directly.

Prefer dependency injection.

---

# PLANNER FIRST

Kai never executes user requests directly.

User

↓

Planner

↓

Execution Plan

↓

Tool Engine

↓

Permission

↓

Execution

Every feature must respect this flow.

---

# NO HARDCODED LOGIC

Forbidden

if(text.includes("youtube"))

Forbidden

switch(command)

Forbidden

application=="chrome"

Forbidden

magic strings

Planner decides.

Tools execute.

---

# TOOLS

Every Tool has exactly one responsibility.

Examples

Browser Tool

Windows Tool

Vision Tool

Memory Tool

Mail Tool

Coding Tool

Files Tool

Calendar Tool

Notification Tool

Plugin Tool

Never mix responsibilities.

---

# WINDOWS ACTIONS

Every Windows action must require permission if it changes the system.

Required

Typing

Mouse Click

Delete

Rename

Move

Git Commit

Shutdown

Restart

Never bypass Permission Manager.

---

# CODE STYLE

TypeScript

Strict

SOLID

Clean Architecture

Async/Await

Small classes

Small functions

Meaningful names

No duplicated code

No God Objects

No global state

---

# FILE SIZE

Target

<300 lines per file

Maximum

500 lines

Split large files.

---

# TESTING

Every feature must include tests.

Planner tests

Tool tests

Integration tests

End-to-End tests

No feature is complete without tests.

---

# PERFORMANCE

Never block the UI thread.

Heavy work belongs to workers.

Planner must remain fast.

Vision must be asynchronous.

Voice must remain realtime.

---

# SECURITY

Never access passwords.

Never log secrets.

Never store API keys.

Never bypass confirmation dialogs.

---

# UI

Kai is not ChatGPT.

Kai is not Discord.

Kai is not Messenger.

Kai is a floating desktop AI.

Minimal.

Elegant.

Transparent.

---

# WHEN UNSURE

Stop coding.

Review KAI.md.

Review architecture.

Think again.

Only then continue.

---

# FINAL RULE

Never optimize for writing code faster.

Always optimize for building a better Kai.