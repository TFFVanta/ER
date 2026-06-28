@echo off
npm install && npm run exo -- doctor && npm run build && git status --short
