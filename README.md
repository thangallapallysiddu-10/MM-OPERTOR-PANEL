C:\PROJECTS\MM-OPERTOR-PANEL\Melodymeet-frontend\OPERATOR_PANEL
Then run:
npm install
(if you've already done this recently, you can skip it)
Now rebuild the native addon:
npm run build:native
Wait until you see:
melodymeet_addon.node
Build succeeded

Step 1: Start Electron
Run:
npm run dev:desktop
Wait until you see logs similar to:
AudioEngine initialized successfully
