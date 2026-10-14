---
title: "Is Someone Building a Quantum Computer in Secret?"
description: "Could a nation secretly build a quantum computer capable of breaking modern encryption without the rest of the world knowing?"
pubDatetime: 2026-07-28T09:00:00-04:00
author: "Lawrence Nara"
tags:
  [
    "notes",
    "quantum-computing",
    "artificial-intelligence",
    "cybersecurity",
    "cryptography",
    "geopolitics",
    "everything-is-interface",
  ]
draft: false
timezone: "America/New_York"
---

This note began while watching Hannah Fry and Michael Stevens discuss Paul Erdos, mathematical collaboration and quantum computing in an episode of _The Rest Is Science_.

The quantum-computing segment collided with another idea I have been developing: if everything is computer, everything is interface.

Frontier AI increasingly treats software as something it can inspect and manipulate through interfaces. Anthropic reports that Claude Mythos Preview can find and exploit zero-day vulnerabilities in major operating systems and browsers. If an AI system can eventually poke through almost every software layer, then maybe encryption is only another interface.

Then I realized that thought was mixing together two different forms of attack.

## 1. Is encryption just another interface?

Software can fail because the implementation is flawed. It can also remain secure because the underlying mathematical problem is computationally infeasible.

An AI system such as Mythos can exploit mistakes in the software around encryption.

But it cannot simply reason its way through correctly implemented modern encryption when it does not possess the key. At that point, the obstacle is not an undiscovered software interface. It is a mathematical problem that requires an infeasible amount of ordinary computation.

That led me to a different question. Could a nation secretly build a quantum computer capable of changing which mathematical problems are feasible? And if it did, would frontier AI make that machine less important by finding easier ways into the same systems?

## 2. AI attacks the implementation

During Anthropic's testing, Mythos Preview found and exploited zero-day vulnerabilities in every major operating system and browser. The oldest was a 27-year-old bug in OpenBSD.

Mythos can search for authentication errors, exposed passwords and cryptographic keys, memory-safety vulnerabilities and vulnerable dependencies.

In real systems, these layers often fail before the encryption algorithm does. An attacker does not need to crack AES if a server exposes its key, an administrator reuses a password or a browser vulnerability lets the attacker read the plaintext after the browser decrypts it.

Every software layer gives the agent another place to look. More capable agents can search more of that attack surface automatically.

But suppose Mythos receives ciphertext produced by AES-256. The implementation is correct. The key is genuinely secret. No endpoint can be compromised. There may be no software loophole left to discover. The remaining task is to search an enormous mathematical space.

Intelligence can improve the search. It does not automatically make the search feasible.

## 3. Quantum computing changes the mathematics

A sufficiently powerful, error-corrected quantum computer changes the available computation.

Shor's algorithm can solve integer factorization and discrete-logarithm problems efficiently on a capable enough quantum computer. RSA depends on the difficulty of factorization. Elliptic-curve cryptography depends on a form of the discrete-logarithm problem.

Such a machine would threaten RSA, Diffie-Hellman, elliptic-curve cryptography and systems that depend on their signatures or key exchange.

It still would not decrypt everything. AES-256, one-time pads and properly deployed post-quantum cryptography are different cases. The attacker would also need access to the encrypted traffic, public key or system being targeted.

This is why governments are already collecting encrypted communications under the logic of "harvest now, decrypt later." The machine does not need to exist today for today's intercepted data to become vulnerable later.

NIST released its first three post-quantum cryptography standards in 2024 and urged organizations to begin migrating. These algorithms run on ordinary computers but rely on mathematical problems not currently known to be efficiently solvable by classical or quantum computers.

The quantum threat begins before the machine exists.

## 4. No known machine can break modern encryption

No publicly known quantum computer can break modern encryption at scale. There is also no honest way to name one uncontested leader because the machines are difficult to compare. Physical qubit counts, logical qubits, gate fidelity, circuit depth, error correction and specialized benchmarks measure different things.

Quantinuum's Helios has 98 physical qubits. Quantinuum reports configurations with 50 logical qubits and a demonstration of 48 fully error-corrected logical qubits. Its trapped-ion architecture emphasizes fidelity and all-to-all connectivity rather than raw qubit count. Those logical-qubit demonstrations still do not mean Helios can run Shor's algorithm against modern cryptography.

Google's Willow chip has 105 superconducting qubits. Its most important result was showing that errors could decrease as the error-correcting code grew, the "below threshold" behavior required for a fault-tolerant machine. Google later reported a verifiable quantum-advantage experiment using its Quantum Echoes algorithm. These are major steps, but not a cryptographically relevant computer.

China's Zuchongzhi 3.0 is also a 105-qubit superconducting prototype, with 182 couplers. Its headline result came from random-circuit sampling, a specialized benchmark that demonstrates performance beyond practical classical simulation. It does not mean the machine is ready to run arbitrary useful algorithms.

IBM has published one of the clearest industrial roadmaps. It says its Starling system will run 100 million gates on 200 logical qubits in 2029. That matters because cryptographically useful computation requires both reliable logical qubits and very long computations.

But Starling is a plan. Willow, Helios and Zuchongzhi are frontier machines. None can break modern encryption.

## 5. Could the real machine be secret?

The United States and China are the two most plausible nation-state leaders. The United States has the broadest publicly visible ecosystem, spanning frontier companies, universities, national laboratories and federal agencies. China combines strong university research, state coordination, quantum-communications infrastructure and programs whose full capabilities are difficult to observe.

Classified research beyond what either country describes publicly would not surprise me. A lead of a few engineering milestones is plausible. A hidden leap from today's machines to a system capable of breaking modern RSA or elliptic-curve cryptography at scale is much harder to imagine.

The problem is physical scale. A cryptographically relevant system requires large numbers of reliable logical qubits and very long sequences of fault-tolerant operations. Depending on the architecture and error rates, that may require enormous numbers of physical qubits. It also requires fabrication, refrigeration or vacuum systems, control electronics, specialized facilities and a specialized workforce.

A government can classify performance data, compartmentalize work and conceal the moment a threshold is crossed. It cannot make the entire scientific and industrial buildup disappear.

The most important secret may be the final integration and demonstrated capability, not the existence of the project.

We would probably see the approach. We might not know when the decisive threshold had been crossed.

## 6. First possession would not mean control of the world

The first country to possess a cryptographically relevant quantum computer would gain an enormous intelligence advantage.

It could decrypt captured diplomatic or military traffic and read some current traffic still protected by vulnerable cryptography. It could forge signatures or interfere with software-update systems. Information expected to stay secret for decades could become readable.

That would not equal automatic control of the world. The attacker would need access to the ciphertext, keys, networks or systems. Some targets would already use post-quantum or symmetric protection. Others would be air-gapped, physically protected or simply unknown.

Using the capability everywhere would reveal it.

If systems protected by strong public-key cryptography began failing at the same time, governments and security researchers would infer that the threat model had changed. Migration would accelerate. Vulnerable systems would be disconnected. New keys and algorithms would be deployed.

The first mover would face a choice: use the capability broadly and shorten its useful life, or use it selectively and preserve the secret.

## 7. The American project is probably distributed

The public record already shows a coordinated American government effort. It does not look like one military laboratory independently recreating Google or IBM.

The National Quantum Initiative coordinates work across more than twenty federal departments and agencies. DARPA's Quantum Benchmarking Initiative is evaluating whether any approach can produce an industrially useful quantum computer by 2033. Its role is partly to test engineering assumptions and company claims that are otherwise difficult to compare.

The Department of Energy operates national laboratories and quantum research centers with capabilities in materials, fabrication, high-performance computing and system integration. In June 2026, DOE announced Quantum Genesis, an initiative intended to develop and deploy a fault-tolerant, scientifically relevant quantum capability by 2028. Two executive orders signed the previous day paired that development effort with an accelerated federal migration to post-quantum cryptography.

NSA is preparing the defense. It has published requirements for migrating national-security systems toward post-quantum algorithms and warned that foreign states are pursuing cryptographically relevant machines.

The government does not need to rebuild every piece of commercial quantum hardware inside a military facility. Companies and universities can build the hardware. Federal agencies can fund and benchmark competing approaches. National laboratories can solve engineering and integration problems, while classified organizations study cryptanalysis, intelligence targets and operational use. That distributed government-industry system may be the national project.

## 8. The real capability is AI and quantum together

AI could identify valuable targets, map vulnerable infrastructure, obtain encrypted archives, automate access and determine which cryptographic systems are in use. Quantum hardware could then attack public-key protections that remained mathematically secure against ordinary computers.

AI attacks the implementation. Quantum computing changes the underlying computational feasibility.

The first country to combine both capabilities could possess a historic intelligence advantage. But even that advantage would depend on access, secrecy and the amount of the world that had not yet migrated.

## 9. What I would watch

Another record physical-qubit count is not enough.

I would watch whether logical qubits survive longer and perform better than their underlying physical qubits. I would watch logical gate fidelity and how many fault-tolerant operations a system can complete before errors win. I would watch whether classical hardware can decode and correct those errors while the computation is still running.

I would also watch the less glamorous evidence: government procurement, new facilities, national-laboratory partnerships, supply chains and the speed of post-quantum migration.

I would watch the convergence with AI because it could help decide what to target, how to reach it and what to do once the mathematical barrier is gone.

Frontier AI does not remove the need for quantum cryptanalysis. It makes the machine more operationally useful.

The advantage would be real. It would also start expiring the first time someone used it.

---

### Research notes

- Hannah Fry and Michael Stevens, ["Why Every Math Nerd Has a 'Number'"](https://www.youtube.com/watch?v=FVoOATd1wH4), _The Rest Is Science_.
- Anthropic, ["Assessing Claude Mythos Preview's cybersecurity capabilities"](https://www.anthropic.com/research/mythos-preview), April 2026.
- Quantinuum, ["Introducing Helios"](https://www.quantinuum.com/blog/introducing-helios-the-most-accurate-quantum-computer-in-the-world), November 2025.
- Google Quantum AI, ["Meet Willow, our state-of-the-art quantum chip"](https://blog.google/innovation-and-ai/technology/research/google-willow-quantum-chip/), December 2024.
- Google Quantum AI, ["The Quantum Echoes algorithm breakthrough"](https://blog.google/innovation-and-ai/technology/research/quantum-echoes-willow-verifiable-quantum-advantage/), October 2025.
- University of Science and Technology of China, ["Zuchongzhi-3: A 105-Qubit Superconducting Quantum Processor"](https://en.ustc.edu.cn/info/1007/5015.htm), March 2025.
- IBM Quantum, ["How IBM will build the world's first large-scale, fault-tolerant quantum computer"](https://www.ibm.com/quantum/blog/large-scale-ftqc), June 2025.
- NIST, ["Post-Quantum Cryptography"](https://csrc.nist.gov/projects/post-quantum-cryptography/).
- CISA, NSA and NIST, ["Quantum-Readiness: Migration to Post-Quantum Cryptography"](https://www.cisa.gov/sites/default/files/2023-08/Quantum%20Readiness_Final_CLEAR_508c%20%283%29.pdf), August 2023.
- NSA, ["NSA Releases Future Quantum-Resistant Algorithm Requirements for National Security Systems"](https://www.nsa.gov/Press-Room/News-Highlights/Article/Article/3148990/nsa-releases-future-quantum-resistant-qr-algorithm-requirements-for-national-se/), September 2022.
- DARPA, [Quantum Benchmarking Initiative](https://www.darpa.mil/research/programs/quantum-benchmarking-initiative).
- U.S. Department of Energy, ["Quantum Genesis"](https://www.energy.gov/science/articles/energy-department-announces-initiative-create-and-deploy-worlds-first), June 2026.
- The White House, ["Securing the Nation Against Advanced Cryptographic Attacks"](https://www.whitehouse.gov/presidential-actions/2026/06/securing-the-nation-against-advanced-cryptographic-attacks/), June 2026.
- The White House, ["Ushering in the Next Frontier of Quantum Innovation"](https://www.whitehouse.gov/presidential-actions/2026/06/ushering-in-the-next-frontier-of-quantum-innovation/), June 2026.

## Index

1. Is encryption just another interface?
2. AI attacks the implementation
3. Quantum computing changes the mathematics
4. No known machine can break modern encryption
5. Could the real machine be secret?
6. First possession would not mean control of the world
7. The American project is probably distributed
8. The real capability is AI and quantum together
9. What I would watch
