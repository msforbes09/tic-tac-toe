# YAGNI — You Aren't Gonna Need It

Build only what the current task and the specs ask for.

- No speculative options, flags, config keys, props, or parameters "in case". Add them when a test needs them.
- No abstractions for a single use. Extract on the second real caller, not before.
- No generic utilities, base classes, or plugin points without a present consumer.
- Scope is fixed by the specs: replay, undo, matchmaking, accounts, and chat are out. Do not lay groundwork for them.
- When a task could be done two ways, pick the one with less code and fewer moving parts unless a test shows it is insufficient.
- Delete dead code and unused exports you find in the files you touch; do not leave "might be useful" code behind.
