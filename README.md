# Netention

**Netention** is a revolutionary personal knowledge and task management system that transforms how you organize and achieve your goals. Built around **Active Notes**—dynamic, intelligent digital entities that autonomously process information, perform tasks, and adapt to your needs—Netention moves beyond static note-taking into a realm of proactive assistance. It seamlessly integrates into your digital life, offering subtle, context-aware support to boost productivity across all domains, from personal projects to professional workflows.

Unlike traditional tools, Netention's Active Notes are not passive documents; they act as living agents, evolving with your input and powered by a self-improving architecture. With a focus on originality, modularity, and efficiency, Netention aims to redefine personal productivity and set a new standard for AI-driven assistants.

## Table of Contents

- [Goals and Design Principles](#goals-and-design-principles)
- [Core System Architecture](#core-system-architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Extensibility](#extensibility)
- [Security](#security)
- [Deployment](#deployment)
- [Development Roadmap](#development-roadmap)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

---

## Goals and Design Principles

Netention is guided by a set of ambitious goals and design principles that shape its development:

- **Originality:** Deliver a novel approach by blending the "Flow Note" UI, anticipatory planning, and implicit intelligence.
- **Iconic User Interface:** Create a visually distinctive and intuitive "Flow Note" UI that stands out and engages users.
- **Seminal Design:** Establish a foundational framework that influences the future of AI assistants and productivity tools.
- **Ubiquity:** Ensure accessibility across devices, including low-power hardware, through efficient, cross-platform design.
- **Intelligence in Interaction:** Foster emergent intelligence from the interplay of users, notes, and agents, rather than imposing rigid AI behaviors.
- **User Empowerment:** Position users as co-creators, shaping the system’s behavior through natural interactions.
- **Implicit Assistance:** Provide subtle, non-intrusive support that enhances efficiency without overwhelming the user.
- **Conceptual Clarity:** Maintain well-defined core concepts (Notes, Agents, Plans, Tools) for an understandable architecture.
- **Modularity and Extensibility:** Design a flexible system that supports easy addition of new tools and features.
- **Efficiency:** Optimize for performance, enabling operation on resource-constrained devices.
- **Self-Evolution:** Enable the system to grow and improve itself, minimizing manual development effort over time.

---

## Core System Architecture

Netention’s architecture revolves around a unified, self-evolving structure anchored by the **Primordial Note**—the seed from which the entire system emerges. Key components include:

- **Notes:** The fundamental units of Netention, representing tasks, ideas, or knowledge. Each Note is "active," with its own:
    - **Agent:** An intelligent engine that interprets content, manages plans, and executes tasks.
    - **Plan:** A dynamic, graph-based workflow outlining steps to achieve the Note’s goals.
    - **Memory:** A persistent history of interactions and outcomes, providing context over time.
- **Agents:** Embedded within Notes, Agents drive intelligence by reasoning, planning, and acting via tools. The **Ur-Agent**, housed in the Primordial Note, bootstraps the system’s evolution.
- **Plans:** Directed graphs of **PlanSteps**, enabling non-linear, adaptive workflows with dependencies and contingencies. Plans prioritize tasks based on user input, deadlines, and system needs.
- **Tools:** Modular, extensible functionalities (e.g., web search, summarization) that Agents use to interact with the world. Tools are managed in a **Tool Registry**.
- **Executor:** A unified interface for executing tools, handling both synchronous and asynchronous operations.
- **Memory Manager:** Oversees each Note’s memory, implementing summarization and archiving to manage resources.
- **Graph Database:** Stores all data (Notes, Plans, Tools, Memory) in a LevelGraph structure, optimized for relationships and queries.
- **LLM Interface:** An abstraction layer for interacting with multiple Large Language Models (e.g., OpenAI, Ollama), powering reasoning and code generation.

The system evolves through a recursive loop: Agents reflect on their state, refine Plans, execute Tools, and update Memory, driving continuous improvement from a minimal seed.

---

## Features

Netention offers a rich feature set, categorized by component:

### Note Features
- **Dynamic Entities:** Notes evolve with user and agent actions, maintaining state and context.
- **Interconnectedness:** Notes link via graph relationships for complex knowledge structures.

### Agent Features
- **Task Interpretation:** Agents extract goals from Note content using LLM-powered reasoning.
- **Adaptive Planning:** Create and adjust Plans dynamically based on context and feedback.
- **Tool Execution:** Select and invoke Tools to achieve Plan objectives.

### Planning Features
- **Graph-Based Plans:** Flexible, non-linear workflows with hierarchical sub-plans and branching scenarios.
- **Prioritization:** Dynamic priority scores guide execution based on deadlines, dependencies, and relevance.
- **Anticipatory Design:** Plans adapt to intermediate results and anticipate future needs.

### Tool Features
- **Core Toolset:** Includes web search, file operations, summarization, and user interaction.
- **Extensibility:** Add new Tools via a plugin system with defined schemas.

### User Interface Features
- **Flow Note UI:** Visualize Plans as interactive flowcharts, centered around Notes.
- **Minimalist Design:** Progressive disclosure keeps the interface clean and focused.
- **System Tray:** Subtle notifications and quick actions enhance usability.

### Data Management Features
- **Graph Persistence:** Store all data in LevelGraph for integrity and efficiency.
- **Memory Management:** Summarize or archive data to optimize resource use.

### Self-Evolution Features
- **Code Generation:** Agents use LLMs to write and refine their own code.
- **Self-Reflection:** Continuous analysis improves system performance and functionality.

---

## Technology Stack

- **Language:** JavaScript (Node.js) for cross-platform compatibility.
- **Database:** LevelGraph (on LevelDB) for lightweight graph storage.
- **LLM Interface:** OpenAI Node.js SDK with abstraction for multiple providers.
- **UI Framework:** TBD (options: React, Vue, Svelte; initially CLI-based).
- **Tools:** Pino (logging), Zod (schema validation), npm/yarn (package management).

---

## Extensibility

Netention is designed for growth:
- **Tool Plugins:** Developers can add custom Tools via a modular registry.
- **Prompt Customization:** Users can tweak Agent behavior with tailored LLM prompts.
- **API:** A RESTful API enables integration with external systems.

---

## Security

- **Encryption:** Data at rest and in transit is encrypted using industry standards.
- **Sandboxing:** Tools run in isolated environments to prevent misuse.
- **Validation:** Inputs are sanitized to avoid injection attacks.
- **Audits:** Regular security checks ensure system integrity.

---

## Deployment

- **Options:**
    - **Desktop:** Electron or Tauri for local use.
    - **Web:** Browser-based deployment.
    - **Serverless:** Background task processing.
- **Scalability:** LevelDB suits single-user setups; multi-user support may require a scalable backend.

---

## Development Roadmap

Netention evolves through stages, leveraging its self-building capabilities to minimize human effort:

### Stage 0: Seed Creation
- Define the Primordial Note’s seed description.
- Hardcode a minimal Ur-Agent with basic LLM and tool support.
- Set up project structure and LevelGraph.

### Stage 1: Core Bootstrap
- Generate core schemas and classes (Note, Plan, Agent, Executor).
- Implement initial tools and basic plan execution.
- Integrate LevelGraph and establish self-reflection.

### Stage 2: Capability Expansion
- Enhance Agent and Plan functionality with prioritization.
- Add new tools (e.g., search, summarize).
- Build a basic CLI UI and full memory management.

### Stage 3: Autonomous Evolution
- Enable continuous refactoring and feature development.
- Improve UI and security autonomously.
- Explore advanced self-modification (e.g., metamodel updates).

Human effort focuses on initial setup and high-level guidance, with the system taking over most development tasks.

---

## Getting Started

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/netention.git
   cd netention
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
    - Create a `.env` file with your LLM API key:
      ```plaintext
      LLM_API_KEY=your-key-here
      ```

4. **Initialize the System:**
   ```bash
   npm run init
   ```

5. **Run Netention:**
   ```bash
   npm start
   ```

Explore the CLI to create Notes and watch the system evolve!
