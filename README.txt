Sleepy Hollow Guild Ledger v2

Upload the CONTENTS of this folder to your GitHub Pages repository root.

Customer kiosk:
https://sleepyhollowguild.github.io/guild-ledger/customer/

Merchant dashboard:
https://sleepyhollowguild.github.io/guild-ledger/merchant/

Files:
- customer/index.html: iPad customer kiosk
- merchant/index.html: iPhone merchant dashboard/order queue
- data/inventory.js: current ManaBox inventory data
- firebase/config.js: Firebase Realtime Database config
- assets/css/app.css: shared styling
- assets/js/*.js: app logic
- assets/images/sleepy-hollow-brand-board.png: branding background

Firebase rules for testing:
{
  "rules": {
    "orders": {
      ".read": true,
      ".write": true
    }
  }
}

Use open rules only while testing. Lock them down before events.

Market workflow:
1. Open /customer/ on the iPad.
2. Open /merchant/ on your iPhone.
3. Customer adds cards and sends order with their name.
4. Order appears live on your phone.
5. Pull cards, mark ready, take Square payment, complete sale.
6. Export sold cards CSV from merchant dashboard at the end of the day for ManaBox cleanup.

Inventory updater:
Open tools/inventory-updater.html locally or from GitHub Pages. Upload your ManaBox CSV, optionally upload your showcase pricing CSV, then download inventory.js. Replace data/inventory.js in GitHub with the new file. This updates the inventory without touching customer/merchant HTML.

V2 live inventory update notes:
- Completing a sale on the merchant dashboard now writes sold quantities to Firebase at /inventoryAdjustments.
- The customer kiosk listens to /inventoryAdjustments and subtracts sold quantities from the visible inventory immediately.
- If a card reaches 0 available copies, it disappears from customer search/results.
- The merchant dashboard has a 📦 Update Inventory button that opens /tools/inventory-updater.html.
- Use Reset Market Day only after exporting sold cards and updating ManaBox / data/inventory.js, because it clears the live deduction layer.

Firebase test rules now need these paths:
{
  "rules": {
    "orders": { ".read": true, ".write": true },
    "sales": { ".read": true, ".write": true },
    "inventoryAdjustments": { ".read": true, ".write": true }
  }
}
