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
