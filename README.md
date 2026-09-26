# FloCard Community Event Notification Mockup

This is a presentation-only prototype of the proposed Community Event Participants notification workflow.

It does not call the FloCard API, update a database, invoke Power Automate, or send email/SMS.

## Run

For the full JSON-backed experience, open PowerShell in this folder and run:

```powershell
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Double-clicking `index.html` also works; browsers that block local JSON loading will use the equivalent built-in fallback sample list.

## Demonstrated interactions

- Participants and Pre-Registered Participants tabs.
- Participant search and pagination.
- Notification controls only on the Participants tab.
- Exactly two recipient modes: All Participants and Select from List.
- Searchable, scrollable, unlimited multi-select with name and masked email.
- Subject and rich-text email editor, including formatting, links, text color and local image insertion.
- Email preview.
- Recipient-count confirmation.
- Mock success dialog with number of recipients notified.
- In-memory Notification badge/history update.
- Validation errors for missing content or missing manual selection.

To demonstrate a provider-style failure result, append `?simulateError=1` to the URL before confirming a send:

```text
http://localhost:8080/?simulateError=1
```

## Files

- `index.html` — page and dialog structure.
- `styles.css` — FloCard-inspired dark theme and responsive presentation.
- `app.js` — static interaction logic.
- `participants.json` — 100 participant and 20 pre-registered sample records with unique emails and phone numbers.
- `assets/notification-ui-reference.png` — final approved-direction visual reference.

