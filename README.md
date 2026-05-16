# HARZAN TRAVEL Accounting App

A lightweight accounting app for `HARZAN TRAVEL` built as a static web app so it can be uploaded directly to GitHub and published with GitHub Pages.

## Features

- Add customers with phone number, full name, reference name, and address
- Add debt entries by type: ticket, visa, hotel, or others
- Restrict debt currency to `USD` or `IQD`
- Record customer payments with date, mode of payment, note, and currency
- Automatically calculate customer balances in both currencies
- Generate printable customer invoices automatically
- Keep data in browser storage with no server setup required

## Files

- `index.html` - dashboard page
- `customers.html` - customer adding and customer ledger page
- `debts.html` - debt entry page
- `payments.html` - payment section page
- `invoices.html` - auto invoice page
- `styles.css` - shared app styling
- `app.js` - shared app logic and local storage handling

## GitHub Compatibility

This app is already structured for GitHub:

- Static HTML, CSS, JS only
- No server required
- Relative asset paths for GitHub Pages
- `.nojekyll` included
- Automatic GitHub Pages workflow included in `.github/workflows/deploy-pages.yml`

## Publish On GitHub Pages

1. Upload the files to a GitHub repository.
2. Push to `main` or `master`.
3. In GitHub, open `Settings` > `Pages`.
4. Set `Source` to `GitHub Actions`.
5. The included workflow will deploy the app automatically.
6. After the workflow finishes, open the GitHub Pages URL.

## Important Note

This version uses `localStorage`, so customer, debt, payment, and invoice data are saved in the browser being used. That means:

- Data is not shared automatically between different users or devices
- Data can be lost if the browser storage is cleared

If you want this app to work as a shared online accounting system for multiple staff members, the next step would be adding a backend database such as Supabase or Firebase.
