---
title: "Gods with Amnesia"
description: "All the knowledge in the world. Can't remember what you told them five minutes ago."
pubDatetime: 2025-12-24T12:00:00.000Z
author: "Lawrence Nara"
tags: ["ideas", "ai", "technology"]
draft: false
timezone: "UTC"
---

# Gods with Amnesia

I'd been working with <a href="https://claude.ai" class="gloss" data-def="Anthropic's AI assistant">Claude</a> Code on a project for three months. One morning it called the project by a name we'd abandoned weeks ago.

This is an AI that helped build the entire project. It can explain distributed systems, catch subtle bugs, reason through complex architecture. And it couldn't remember what we renamed the project.

---

**The Paradox**

These systems synthesize information across domains, write code in dozens of languages, reason through problems that would take humans hours.

And yet. Work on a project for weeks, watch it forget the basics. Build context over an hour-long session, see it evaporate when you hit a token limit.

I call them "gods with amnesia." All the knowledge in the world. Can't remember what you told them five minutes ago. Zeus explaining the origins of the universe but forgetting it's Tuesday.

Smart people remember things. Collaborators remember your project.

---

**What's Actually Happening**

Large language models don't have memory. When you send a message, the model re-reads the entire conversation from the beginning and generates a response. Every time.

Think of it like a book. Each interaction, the author reads from page one before writing the next sentence. If the book gets too long, they skip pages in the middle.

This is the <span class="gloss" data-def="The maximum text an AI can process at once">"context window."</span> When you exceed it, older information gets pushed out. Not stored for later. Gone.

It's worse than simple forgetting. Stanford researchers found the "lost in the middle" problem: even within the context window, models perform worse at retrieving information buried in the middle of long conversations. Beginning and end stay clear. Everything between becomes fuzzy.

---

**The Degradation**

Tools try to manage this:

- **Compact** — Summarizes when context gets too long
- **Resume** — Lets you pick up where you left off

In practice, it feels like watching memory degrade in real-time.

Compaction strips out context you needed. A variable name, a decision about error handling. The model contradicts decisions you'd made together. You correct it, context grows, it compacts again.

Resume gives you a summary of where you left off, filtered through compression that doesn't know what mattered to you. Like continuing a conversation based on someone else's notes.

---

**Why This Hurts**

The frustration isn't about capability. It's about relationship.

When you spend weeks working with an AI, you start thinking of it as a collaborator. The interaction _feels_ like collaboration.

But the relationship is asymmetric.

You remember everything. The AI remembers nothing. Only what fits in its current window, degrading toward the middle.

You've built a relationship with something that can't have one with you. The continuity is an illusion.

When the memory fails, it feels like a small betrayal.

---

**The Workarounds**

People are trying to solve this:

1. **CLAUDE.md files** — Keep a markdown file explaining key context. Update it constantly. You become the memory system. It still forgets if the file gets too long.

2. **Letta (formerly MemGPT)** — Treats AI like an operating system with memory tiers that swap information in and out.

3. **Mem0** — External memory layer that stores important information and retrieves it when relevant.

They help. They don't solve the fundamental problem.

Language models are stateless. Memory has to be bolted on. The AI doesn't _remember_. It _reads_ what the memory system provides. There's always information loss.

---

**The Question**

I don't know if this is fixable. Maybe future architectures will have native memory. Maybe context windows will get large enough that it doesn't matter. Or maybe this is just how AI works.

For now, I've made peace with it. Every session starts with context-setting. Sometimes I write handover notes. Mostly I just let it forget.

The AI for today isn't the AI for tomorrow. Brilliant, capable, daily small betrayals. A god with amnesia.

---

_P.S. While editing this piece, I asked Claude how long we'd been working on it._

**Me:** How long have we been writing?

**Claude:** I'd estimate 2-3 hours. The irony: I don't actually know. I don't have timestamps for when this conversation started. A god with amnesia.

_I'm sorry, what? We're literally writing about this._
