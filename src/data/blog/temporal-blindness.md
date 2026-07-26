---
title: "Temporal Blindness"
description: "AI systems can remember what we say while still failing to understand when we said it or how much time has passed."
pubDatetime: 2026-07-26T17:11:32-04:00
author: "Lawrence Nara"
tags: ["notes", "ai", "product", "memory", "time"]
draft: false
timezone: "America/New_York"
---

Sometimes I tell Claude I'm going to bed. Then another thought comes three minutes later, so I go back to the same chat and send it. Claude responds as if I slept, woke up, and started a new day.

The opposite happens too. I say good night, actually go to sleep, and come back the next morning. Claude keeps wrapping up yesterday's conversation. ChatGPT does this less noticeably. Claude's attempts to acknowledge morning, night, sleep, and breaks make the problem more visible and more annoying.

These are small mistakes. Nothing important is lost. But they kept bugging me, so I went looking for the reason.

## 1. I assumed I was missing something

My first guess was a hard technical constraint. Maybe time zones. Maybe something about the knowledge cutoff.

The cutoff explanation falls apart fast. A knowledge cutoff is about what the model learned during training. The current clock and the time of my private message are different kinds of information. Web search doesn't solve it either. Search can tell an AI what time it is in Baltimore. It cannot tell the AI when I said I was going to bed, because that message never touched the public internet.

The real answer turns out to have three layers. The storage system knows when every message was sent. It has to, in order to store and order them. The interface mostly hides that information from me. And the model commonly receives the conversation as a plain sequence of roles and text, with no timestamp attached to any message.

So to the model, these three situations can look identical: I came back after three minutes. I came back the next morning. I came back three weeks later.

That's why I can't ask "what did I discuss on June 24 in this chat?" and why I can't scroll a long conversation by date the way I can in iMessage. The information exists. It just never reaches the model or me.

## 2. Someone already named this

While researching, I found a 2025 paper from a group at the University of Maryland with a phrase for it: temporal blindness. Their definition is the failure of an AI agent to account for real-world time passing between messages. The model treats the conversation as a static sequence of tokens while the world outside keeps changing.

Their test case makes the stakes concrete. An agent checked a flight price for you. Later you ask whether it's still the best price. Should the agent reuse yesterday's answer or search again? The right call depends partly on how much time has passed. The same logic applies to weather, prices, appointment availability, anything that changes on its own.

They built a benchmark of over 700 conversations to test this, and the results surprised me. Without time information, models performed only slightly better than chance at matching human judgment about when to re-check. That part I expected. The part I didn't expect: adding timestamps helped only modestly. The best result was around 65 percent.

## 3. Timestamps don't fix it

That finding broke my assumed solution. I had figured the product just needed to attach a time to every message. But having access to time and understanding time are different capabilities. A model can see that eight hours passed and still draw the wrong conclusion about what those eight hours mean.

It might assume I slept. It might assume I finished the thing I said I'd do. If a conversation contains six hours of activity spread across three days, it might tell me I've been working for six straight hours and should take a break. A clock tells the model that time passed. It doesn't tell the model what I did with it.

This probably explains Claude's good-morning behavior. It sees "I'm going to bed," predicts the social script that normally follows, and continues the implied story when I return. It learned the language of time from text. It was never grounded in the actual clock.

The paper's conclusion points the same direction: prompting models to pay attention to elapsed time barely helped. Temporal awareness apparently needs training, the way refusing harmful requests needed training. Metadata alone doesn't produce judgment.

## 4. Why the products stay timeless anyway

The first AI chats were built as question-and-answer sessions. You typed a prompt, got a response, maybe asked a follow-up. In that world, the difference between ten minutes and ten days rarely mattered.

That's no longer how I use these products. I have ChatGPT conversations that have run for more than sixty days. I use them to track work, decisions, and what happened in my life. Once a chat gets that long, the timeline is part of the meaning. "I can't do this today" means one thing on Monday and something else two weeks later. Advice about a deadline or an unpaid bill has a shelf life.

I can list the reasons companies might have avoided this. Changing timestamps complicate prompt caching. Time zones and travel create edge cases. Visible times clutter the interface. Behavioral timing is genuinely private information: when someone sleeps, when they work, when they disappear. And a model with timestamps might overuse them and start making annoying personal assumptions, which is exactly the failure the research predicts.

None of these adds up to a reason for making the conversation completely timeless. Messaging apps solved the visual problem years ago with quiet date dividers and tap-to-reveal timestamps. Privacy could be a setting: exact times, rough elapsed time, or nothing.

## 5. The chat I would want

![Mockup of a chronological AI chat with day dividers, elapsed-time markers, and notes explaining temporal context.](/images/temporal-blindness-chat-i-would-want.png)

Day dividers in long conversations, the way iMessage does it. Tap a message, see the exact time. Search that takes ordinary chronological questions: what did I discuss on June 24, when did I first mention this idea.

The model gets the current date and time every turn, plus a plain signal like "the user returned fourteen hours after the last message." And it gets trained to keep facts and guesses separate. "It's been fourteen hours since your last message" is a fact. "I hope you slept well" is a guess, and it should stay unsaid unless I told it I was sleeping. Even then, intention isn't proof. I might be back in three minutes because another thought showed up.

Old information should age at different rates. A traffic report goes stale in minutes. A personal preference can hold for years. A project decision stays active until I revise it. Memory that fades everything at the same speed gets this wrong in both directions.

And all of it should be a choice. Some people want exact chronology. Some want the model to know only "later that day" or "weeks later." Incognito chats stay timeless. I should be able to see what temporal information the system is using, the same way I should be able to see what it remembers.

## 6. Nothing here is hard to build

People keep saying software is solved now, and what they usually mean is that generating code got easier. This problem is a good counterexample. Attaching a timestamp to a message is trivial. Deciding how a product should use time without becoming intrusive, wrong, or expensive is a product problem, and it's still open. The research says even the reasoning part isn't solved: you can hand a model the clock and it still doesn't know what the clock means.

## 7. Memory is not chronology

Last December, before memory became a real product feature, I wrote something called Gods with Amnesia. The contradiction back then was that these systems seemed almost limitless in what they could discuss, and yet every new conversation erased the relationship.

The companies have made real progress on that. Preferences, projects, and details now carry across conversations. The amnesia is no longer complete.

But remembering something and knowing when it happened are separate problems. What happened before a decision and what happened three months after it are different facts, even when the words are the same. An assistant that runs across months of my life needs more than memory. It needs a calendar inside the memory.

Until then, it may remember what I said. It just won't always know which day of my life I said it on.

---

### Research notes

* Cheng et al., *[Temporal Blindness in Multi-Turn LLM Agents: Misaligned Tool Use vs. Human Time Perception](https://arxiv.org/html/2510.23853v1)*, University of Maryland, 2025. Benchmark: TicToc-v1, 725 trajectories across 34 scenarios. Without timestamps, best alignment with human judgment just over 60 percent. With timestamps, peak around 65 percent. Prompt-based fixes had limited effect; authors argue for targeted post-training.
* Anthropic, [Claude system prompts](https://platform.claude.com/docs/en/release-notes/system-prompts): Claude's consumer apps supply the current date through the system prompt.
* OpenAI, [ChatGPT chat-history search](https://help.openai.com/en/articles/10056348-how-do-i-search-my-chat-history-in-chatgpt): search currently centers on keywords and exact matches, not dates.

## Index

1. I assumed I was missing something
2. Someone already named this
3. Timestamps don't fix it
4. Why the products stay timeless anyway
5. The chat I would want
6. Nothing here is hard to build
7. Memory is not chronology
