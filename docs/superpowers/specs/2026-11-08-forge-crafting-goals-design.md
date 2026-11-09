# FORGE crafting goals

Give the workshop a clear next objective: choose a blueprint, see the remaining materials and return to real tasks or habits to earn them. This is an implementation choice within the user's continuing ATLAS/FORGE improvement request.

Use the existing vanilla application and award ledger. Persist only a validated `craftGoal` recipe ID in `data.game`; derive stock, missing resources and progress. Never reserve resources or duplicate tasks. A goal appears across Journey tabs and offers tasks/habits links, then a craft action when affordable. The workshop's blueprints can track, switch or clear a goal.

Progress counts only needed units of each material. Suggested task/habit counts are upper estimates from their normal drops; milestone bonuses may finish sooner. Reopening tasks never counts as another earning action. A successful craft of the target clears it and selects the new item for placement; a failed save restores goal, materials and selection. Crafting another recipe retains the goal and recalculates its progress. At the inventory cap, show the reason crafting is unavailable.

Alternatives considered: reserve materials for a goal (unnecessary second accounting system); suggest the cheapest recipe automatically (less user choice). Chosen: one explicit, persistent blueprint goal with live resource accounting.

No new service, dependency, schema migration, XP reward, paid asset or penalty. Old saves default to no goal; unknown IDs are discarded. Keep phone layouts usable at 320px, large text and keyboard controls.
