#!/bin/bash
# Scripted v0.2 demo for the launch GIF. Output is what a real
# `npx blindcache-mcp` + semantic search session looks like, paced
# for screen reading.

BLUE="\033[1;34m"
CYAN="\033[1;36m"
GREEN="\033[1;32m"
GREY="\033[0;90m"
BOLD="\033[1m"
DIM="\033[2m"
NC="\033[0m"

pause() { sleep "${1:-0.3}"; }

clear
sleep 0.6

printf "${BLUE}\$${NC} npx blindcache-mcp\n"
pause 0.9
printf "\n"

printf "${GREY}[blindcache]${NC} opening vault…\n"
pause 0.5
printf "${GREEN}✓${NC} vault ready ${DIM}(1.9s)${NC}\n"
pause 0.3
printf "${GREEN}✓${NC} embedder loaded ${DIM}— Xenova/all-MiniLM-L6-v2 (local, 23MB, 384-dim)${NC}\n"
pause 0.8

printf "\n${BOLD}${CYAN}────── new in v0.2: semantic search ──────${NC}\n\n"
pause 0.8

printf "${BLUE}\$${NC} append 10 memories\n"
pause 0.5
printf "  ${DIM}•${NC} Pair-programmed with Maya on Stripe webhook retry logic\n"
pause 0.18
printf "  ${DIM}•${NC} Reminder: dentist appointment for early June\n"
pause 0.18
printf "  ${DIM}•${NC} Rust async cancellation — Tokio's CancellationToken\n"
pause 0.18
printf "  ${DIM}•${NC} Q3 hiring plan: 2 backend engineers + 1 designer\n"
pause 0.18
printf "  ${DIM}•${NC} Listened to Lex Fridman × Yann LeCun on JEPA\n"
pause 0.18
printf "  ${DIM}•${NC} Grocery list: olive oil, sourdough, basil\n"
pause 0.25
printf "  ${DIM}… 10 total in ~2.1s (210ms median)${NC}\n"
pause 0.9

printf "\n${BLUE}\$${NC} search ${BOLD}\"payment processing bugs\"${NC}\n"
pause 0.6
printf "${GREEN}✓${NC} Pair-programmed with Maya on Stripe webhook retry logic\n"
printf "  ${DIM}score 0.27 · 366ms${NC}\n"
pause 0.9

printf "\n${BLUE}\$${NC} search ${BOLD}\"AI research papers\"${NC}\n"
pause 0.6
printf "${GREEN}✓${NC} Listened to Lex Fridman × Yann LeCun on JEPA\n"
printf "  ${DIM}score 0.31 · 312ms${NC}\n"
pause 0.9

printf "\n${BLUE}\$${NC} search ${BOLD}\"what should I cook tonight\"${NC}\n"
pause 0.6
printf "${GREEN}✓${NC} Grocery list: olive oil, sourdough, basil\n"
printf "  ${DIM}score 0.35 · 198ms${NC}\n"
pause 1.0

printf "\n"
printf "  ${BOLD}embeddings computed locally${NC} — plaintext never sent for embed\n"
pause 0.4
printf "  ${BOLD}encrypted, sharded${NC} across Nillion's 3-node cluster\n"
pause 0.8

printf "\n"
printf "  ${CYAN}npx blindcache-mcp${NC}  ${DIM}·  apache 2.0  ·  github.com/nikshepsvn/blindcache${NC}\n"
pause 1.8
