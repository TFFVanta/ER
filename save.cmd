@echo off
npm run build && npm run test && git add -A && git commit -m "%*" && git status --short
