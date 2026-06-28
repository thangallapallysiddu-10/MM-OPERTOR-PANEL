# how to setup operator panel use this text paste it in chatgpt then install acc to it !
1. Install Required Software
Node.js

Install:

Node.js 20 LTS

Verify:

node -v
npm -v
Git

Install Git and verify:

git --version
Visual Studio 2022/2026

Install:

Desktop development with C++

Required components:

MSVC C++ Build Tools
Windows SDK
CMake Tools
2. Clone Project
git clone <repo-url>

or use the ZIP/shared project folder.

Open:

OPERATOR_PANEL
3. Install Dependencies

Inside:

cd OPERATOR_PANEL

Run:

npm install
4. Frontend Only (Fastest)

If they only need UI development:

npm run dev

This starts:

Expo Web

Open:

http://localhost:8081

This is enough for:

UI development
Layout changes
Component work
Styling

No native engine required.

5. Full Desktop Application

If they need Electron:

npm run dev:desktop

This starts:

Expo Web
+
Electron
6. Native Audio Engine Setup (Optional)

Only required if they need:

Deck playback
Native microphone
Native DSP
Audio engine testing
Install vcpkg
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg
bootstrap-vcpkg.bat
Build Native Addon

From:

OPERATOR_PANEL

Run:

npm run build:native

Expected:

melodymeet_addon.node generated
7. Run Desktop With Native Audio
npm run dev:desktop

Verify:

await window.audio.getEngineInfo()

Expected:

{
  "initialized": true
}
Common Issues
Port Already In Use
npx kill-port 8081

then:

npm run dev
Native Build Fails

Verify:

Visual Studio C++ Tools installed
Windows SDK installed
CMake installed
Electron Opens But Audio Doesn't Work

Rebuild:

npm run build:native

Then:

npm run dev:desktop
For Frontend Team
UI Work Only

Run:

npm install
npm run dev

No need to:

Build native engine
Install JUCE
Install vcpkg
Build C++
Audio Team Only

Need:

npm run build:native
npm run dev:desktop

# Check your current state

bash
git status
This shows whether you already have local changes. If you do, don’t pull yet until you commit, stash, or finish them.

Get the latest changes from GitHub

bash
git pull origin main
This downloads the newest code from GitHub and updates your local main branch. If there are conflicts, Git will ask you to fix them.

Check again

bash
git status
This confirms whether the update completed cleanly and whether your working folder is okay.

Important rule
If git status shows your own unfinished changes before pulling, use one of these first:

git add . && git commit -m "my work" to save your work, or

git stash to temporarily hide your changes.

Very simple daily habit
Start work: git status → git pull origin main → git status

Then continue coding.

A safer version for a branch you’re working on is:

bash
git status
git pull origin your-branch-name
git status
