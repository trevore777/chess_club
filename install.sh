#!/bin/bash
npm install
[ -f .env ] || cp .env.example .env
npm run db:init
npm run db:seed
npm run dev
