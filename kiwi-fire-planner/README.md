# FIRE Tracker App

Client-side React + Tailwind app for tracking expenses and estimating your time to FIRE.

## Features

- Add and remove expense entries tracked as weekly, monthly, or yearly values
- Automatic conversion to monthly-equivalent totals and annual expense calculations
- Investment inputs:
  - Current gross salary (NZD/year)
  - KiwiSaver contribution percentage (deducted from salary and employer-matched into investments)
  - Student loan deduction toggle
  - Current investment savings
  - Surplus strategy (one at a time):
    - Save percentage of investable surplus
    - Fixed monthly spend from surplus (with available-surplus safety cap)
  - Expected annual return
  - Inflation rate
  - Target mode:
    - FIRE target from goal salary and expenses
    - Custom portfolio target
  - Goal yearly salary (when FIRE mode is selected)
- NZ take-home calculation using PAYE + ACC earner levy
- Spendable take-home after employee KiwiSaver deduction
- Optional student loan repayment deduction
- Current-value target (today's dollars) based on projected time to target
- FIRE mode uses today's-value target for the 4% rule, then inflation-adjusts the portfolio target at your projected retirement date
- Portfolio growth graph under expenses, with axes and hover details (money, time, today's-value amount)
- Auto-calculated monthly investment:
  - Percentage mode: `max(monthly spendable pay - monthly expenses, 0) * save %`
  - Fixed-spend mode: `max(available surplus - fixed spend, 0)` (fixed spend capped to surplus)
  - KiwiSaver: `employee % of salary + matching employer % of salary` added on top of surplus investing
- 4% rule calculations:
  - Current safe withdrawal (`portfolio * 0.04`)
  - FIRE number from salary (`goalSalary / 0.04`)
  - Timeline projection to selected target mode
- Local storage persistence for all app data

## Run locally

```bash
npm install
npm run dev
```
