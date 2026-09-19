🧠 MindForge AI

🌐 Live Demo: https://mindforge-ai-f0qf.onrender.com

From Voice → Thoughts → Mind Map → Action

Turn scattered thoughts into a structured plan and help users actually execute it.

MindForge AI is an AI-powered productivity companion that transforms natural voice or text input into a structured mind map, actionable tasks, priorities, deadlines, and execution plans.

Instead of simply reminding users about tasks, MindForge focuses on understanding what the user wants to accomplish and converting unstructured thoughts into a practical action system.

🚨 The Problem

Modern productivity tools often assume that users already know:

What they need to do

How to break a goal into tasks

Which task should be done first

How much time each task requires

What to do when they fall behind

But real-world thoughts are rarely structured.

A student might say:

"I want to start a YouTube horror channel. I need to research topics, write scripts, record the voice, edit videos, create thumbnails and upload them, but I also have college work to complete."

Traditional productivity apps require the user to manually convert this thought into multiple tasks.

MindForge AI automates that transition.

💡 Our Solution

MindForge AI acts as an AI execution layer between human thoughts and productivity tools.

User Input

🎙️ Voice / Text

↓

AI Understanding

🧠 Extract goals, tasks, dependencies, priorities and deadlines

↓

Visualization

🗺️ Generate a structured mind map

↓

Action Planning

✅ Convert ideas into actionable tasks

↓

Execution

📅 Track deadlines, progress and next actions

↓

Rescue Mode

🚨 Help users recover when they fall behind

✨ Key Features

🎙️ 1. Voice-to-Action Input

Users can express their thoughts naturally through voice or text.

Instead of filling multiple forms, users can simply explain what they want to accomplish.

Example:

"I have to prepare for my DBMS exam, complete my project report and submit the assignment by Friday."

MindForge converts this unstructured input into structured actions.

🧠 2. AI-Powered Mind Maps

MindForge converts complex thoughts into a visual hierarchy.

Example

YouTube Horror Channel
│
├── Research
│   ├── Find topics
│   └── Study competitors
│
├── Content
│   ├── Write script
│   └── Review script
│
├── Production
│   ├── Voice recording
│   └── Video editing
│
├── Branding
│   └── Thumbnail design
│
└── Publishing
    ├── Upload video
    └── Optimize title & description

This allows users to understand the complete project before starting execution.

✅ 3. Automatic Action Planning

MindForge doesn't stop at visualization.

The generated plan can be converted into actionable tasks with:

Task descriptions

Priority

Deadlines

Progress

Completion status

Project association

The objective is to bridge the gap between "I have an idea" and "I know what to do next."

📅 4. Deadline & Task Management

Users can organize their work around deadlines and monitor their progress.

MindForge provides dedicated experiences for:

Tasks

Calendar

Projects

Progress

History

Action plans

🚨 5. Rescue Mode

One of MindForge's key concepts is recovery instead of just reminders.

When users fall behind, the system can help reorganize the remaining work into a more manageable execution plan.

Traditional Productivity

Deadline approaching
        ↓
Reminder
        ↓
User ignores it

MindForge Approach

Deadline approaching
        ↓
Detect unfinished work
        ↓
Re-plan remaining tasks
        ↓
Prioritize critical actions
        ↓
Give the user a clear next step

The goal is to help users recover from missed progress instead of simply notifying them about it.

🤖 6. AI-Assisted Planning

MindForge uses AI to interpret natural-language input and assist with:

Goal decomposition

Task generation

Action planning

Prioritization

Re-planning

Next-task suggestions

🔥 What Makes MindForge Different?

Most productivity applications focus on task storage and reminders.

MindForge focuses on the complete journey:

THOUGHT
   ↓
UNDERSTANDING
   ↓
STRUCTURE
   ↓
ACTION
   ↓
EXECUTION
   ↓
RECOVERY

Traditional Productivity Apps

User → Creates Task → Gets Reminder → Completes Task

MindForge AI

User
 ↓
Speaks / Types naturally
 ↓
AI understands intent
 ↓
Mind Map
 ↓
Action Plan
 ↓
Prioritized Tasks
 ↓
Execution Tracking
 ↓
Re-planning / Rescue

This makes MindForge more than a task manager — it is designed as an AI-powered execution companion.

🏗️ System Architecture

                    ┌─────────────────────┐
                    │       USER          │
                    │  Voice / Text Input │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Next.js Frontend  │
                    │   User Interface    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    API / Backend     │
                    │ Authentication       │
                    │ Tasks & Projects     │
                    │ Action Planning     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     AI Layer        │
                    │ Natural Language    │
                    │ Understanding       │
                    │ Planning             │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
          ┌─────────────────┐   ┌─────────────────┐
          │   Mind Map      │   │   Action Plan   │
          │ Visualization   │   │ Tasks / Goals   │
          └────────┬────────┘   └────────┬────────┘
                   │                     │
                   └──────────┬──────────┘
                              ▼
                    ┌─────────────────────┐
                    │  Execution Engine   │
                    │ Progress / Calendar │
                    │ Rescue / Replanning │
                    └─────────────────────┘

🛠️ Technology Stack

Layer

Technology

Frontend

Next.js

Language

TypeScript

Styling

CSS

Backend

API routes / application backend

AI

Generative AI

Database

Database-backed persistence

Authentication

NextAuth

Visualization

Custom mind-map / flowchart system

PDF Export

Custom PDF export

Package Manager

npm

Version Control

Git + GitHub

📂 Project Structure

MindForge-AI/
│
├── backend/
│   └── README.md
│
├── frontend/
│   ├── app/
│   │   ├── action-plan/
│   │   ├── calendar/
│   │   ├── dashboard/
│   │   ├── history/
│   │   ├── mindmap/
│   │   ├── profile/
│   │   ├── progress/
│   │   ├── rescue/
│   │   └── tasks/
│   │
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   └── tsconfig.json
│
├── .gitignore
├── README.md
├── AGENTS.md
├── CLAUDE.md
└── start.bat

🔄 Example User Journey

Step 1 — User speaks

"I want to launch my YouTube channel next month."

Step 2 — MindForge understands the goal

The system identifies the main objective and supporting activities.

Step 3 — Mind Map is generated

Launch YouTube Channel
│
├── Research
├── Content Strategy
├── Script Writing
├── Recording
├── Video Editing
├── Thumbnail
└── Publishing

Step 4 — Action Plan

The system converts the structure into executable tasks.

Step 5 — User executes

Tasks can be tracked through the productivity dashboard.

Step 6 — Something goes wrong

If tasks are delayed, the user can use Rescue Mode to reorganize the remaining workload.

🎯 Target Users

MindForge can support people who frequently deal with complex or unstructured work.

🎓 Students

Exam preparation

Assignments

Projects

Internships

Placement preparation

💼 Professionals

Work planning

Meeting follow-ups

Project execution

Deadlines

🚀 Entrepreneurs

Startup planning

Product launches

Content planning

Business execution

🎨 Creators

Content planning

Video production

Publishing workflows

📈 Potential Impact

MindForge aims to reduce the friction between thinking and doing.

Instead of requiring users to manually translate their thoughts into multiple productivity tools, MindForge provides a single workflow:

Natural Thought
      ↓
AI Interpretation
      ↓
Visual Structure
      ↓
Actionable Tasks
      ↓
Execution
      ↓
Progress
      ↓
Recovery

This approach can make complex goals easier to understand and execute.

🔐 Security & Privacy

MindForge is designed with responsible handling of user data in mind.

Important principles include:

Do not expose API keys in the frontend

Keep secrets in environment variables

Avoid committing .env files

Use authenticated access for protected functionality

Store only the information required for application functionality

🌐 Live Demo

Try MindForge AI online:

https://mindforge-ai-f0qf.onrender.com

The live deployment is hosted on Render.

🚀 Getting Started

Prerequisites

Make sure you have installed:

Node.js

npm

Git

1. Clone the repository

git clone https://github.com/Omwatane17/MindForge-AI.git

cd mindforge-AI

2. Install frontend dependencies

cd frontend
npm install

3. Configure environment variables

Create a .env.local file inside the frontend directory.

Add the required environment variables for your configured AI, authentication and database services.

Never commit .env.local or API keys to GitHub.

4. Run the development server

npm run dev

The application will normally be available at:

http://localhost:3000

🧪 Current Prototype Capabilities

The current version demonstrates the core MindForge workflow:

Natural-language input

AI-assisted generation

Mind-map visualization

Action planning

Task management

Project organization

Calendar experience

Progress tracking

History

Rescue Mode

Authentication

PDF export functionality

🗺️ Future Roadmap

MindForge is designed to evolve beyond the current prototype.

Phase 1 — Core Intelligence

Improved goal decomposition

Better task prioritization

More reliable deadline extraction

Smarter next-task recommendations

Phase 2 — Advanced Interaction

Interactive drag-and-drop mind maps

AI productivity assistant

Conversational task modification

Advanced PDF/PNG exports

Phase 3 — Integrations

Google Calendar

Email

Notion

Trello

Slack

Productivity platforms

Phase 4 — Intelligent Execution

Proactive deadline detection

Adaptive scheduling

Workload balancing

Context-aware recommendations

Personalized execution strategies

🏆 Hackathon Vision

MindForge AI is built around a simple idea: AI should not only help people think — it should help them turn those thoughts into action.

We envision MindForge as an intelligent execution layer that connects:

Human Intent → AI Understanding → Structured Planning → Real-World Execution

👥 Team

Team MindForge

Built with ❤️ for the hackathon community.

Contributor

Role

Om Watane

Team Leader / AI, Backend & Architecture

Ambika Shelke

Frontend / Product Development

Tejaswani

AI / Development / Design

📄 License

This project is currently developed as a hackathon prototype.

License and open-source terms can be added based on the team's future distribution plans.

⭐ If you find MindForge interesting

Give the repository a ⭐ and follow the project as it evolves.

MindForge AI — Think less about organizing work. Start executing it.
