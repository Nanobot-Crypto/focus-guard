## Goal

When the user clicks "Stop monitoring" on the dashboard, open a dialog that:
- Shows a random discouraging phrase pulled from the existing phrases list
- Has a **Cancel** button (always enabled, closes the dialog)
- Has a **Confirm stop** button that is **disabled for 40 seconds**, showing a live countdown, then becomes clickable to actually stop monitoring

Starting monitoring stays unchanged (single click, no dialog).

## Behavior details

- Dialog opens only when current state is `monitoring = true` and user clicks the stop button.
- A random phrase is picked from `api.getPhrases()` each time the dialog opens (in-memory, no persistence — refreshing/closing resets the cooldown).
- Countdown starts when the dialog opens. Confirm button label: `Stop anyway (40s)` → `Stop anyway (39s)` → … → `Stop anyway` once enabled.
- Cancel has no cooldown and just closes the dialog.
- Closing the dialog (Cancel, ESC, overlay click) clears the timer.
- If the dialog is reopened, the cooldown restarts from 40 and a new random phrase is chosen.

## Files to change

- **`src/routes/index.tsx`**
  - Replace the inline `onClick={() => toggle.mutate(monitoring ? "stop" : "start")}` with logic that opens a new `AlertDialog` when stopping.
  - Add a new `StopMonitoringDialog` component (in the same file) that:
    - Loads phrases via `useQuery({ queryKey: ["phrases"], queryFn: api.getPhrases })`.
    - On open, picks `phrases[Math.floor(Math.random() * phrases.length)]` and stores it in local state.
    - Runs a `setInterval` countdown from 40 to 0, cleared on close/unmount.
    - Renders the phrase as the dialog description, plus the two buttons described above.
  - Keep using the existing `toggle` mutation for the actual stop call.

No API, mock data, or styling tokens need to change. All styling uses existing semantic tokens and the existing `AlertDialog` primitives.

## Out of scope

- Persisting the cooldown across reloads (explicitly in-memory per user's answer).
- Changing the start-monitoring flow.
- Any backend / daemon changes.