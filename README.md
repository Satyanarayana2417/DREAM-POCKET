# Expense Harmony

Build a complete, production-ready **Home Expense Manager web application** using **React + Vite + JavaScript**, with **Firebase Authentication + Firestore** as the backend/database and **Cloudinary** for image/receipt uploads.

The application must be **mobile-first, fully responsive, professional, clean, and modern**, using **light colors only**.

## 1. TECHNOLOGY REQUIREMENTS

Use:

- React
- Vite
- JavaScript
- React Router
- Firebase Authentication
- Firebase Firestore
- Cloudinary
- CSS / modern responsive CSS
- Lucide React or another clean icon library
- Chart.js or Recharts for charts

Do NOT use Next.js.

Do not use unnecessary libraries.

The application must work perfectly on:

- Mobile phones
- Tablets
- Laptops
- Desktop screens

The mobile experience is the highest priority.

---

# 2. FIREBASE CONFIGURATION

Use this Firebase configuration:

```js
const firebaseConfig = {
  apiKey: "@secret:GOOGLE_API_KEY ",
  authDomain: "expensemanager-36736.firebaseapp.com",
  projectId: "expensemanager-36736",
  storageBucket: "expensemanager-36736.firebasestorage.app",
  messagingSenderId: "1060457615492",
  appId: "1:1060457615492:web:2f171aa91a3e86a23c32d1",
  measurementId: "@secret:GOOGLE_ANALYTICS_MEASUREMENT_ID ",
};
```

Firebase Authentication is already enabled.

Enable/support:

- Email + Password authentication
- Google authentication

---

# 3. CLOUDINARY

Use Cloudinary for all expense receipt/image uploads.

Cloudinary:

```text
Cloud Name: dnpc9cgta
Upload Preset: expense manager
```

Flow:

```text
User selects image
        ↓
Upload image to Cloudinary
        ↓
Cloudinary returns secure URL
        ↓
Save URL in Firestore
        ↓
Display image from Cloudinary URL
```

Never store the actual image file inside Firestore.

Only store the Cloudinary URL.

Handle:

- Upload progress
- Upload failure
- Image preview
- Remove/change selected image
- Successful upload

Images should be optimized for mobile loading.

---

# 4. AUTHENTICATION

Create a professional authentication system.

## Signup

Signup fields:

- Username
- Email
- Password
- Confirm Password

On signup:

1. Create Firebase Authentication account.
2. Get Firebase UID.
3. Create a document in:

```text
users/{uid}
```

Store:

```js
{
  uid,
  username,
  email,
  photoURL,
  provider: "email",
  createdAt
}
```

Validate:

- Required fields
- Valid email
- Password minimum requirements
- Password confirmation
- Duplicate email
- Firebase errors

---

# 5. GOOGLE LOGIN

Add:

**Continue with Google**

When a user logs in with Google:

- Authenticate through Firebase
- Get Google profile information
- Create/update the corresponding `users/{uid}` document
- Save:

  - uid
  - username/display name
  - email
  - photoURL
  - provider
  - createdAt

Do not create duplicate user documents.

---

# 6. LOGIN

Login page:

- Email
- Password
- Login button
- Google Login button
- Link to Signup
- Forgot Password

After successful login:

```text
Login → Dashboard
```

If a user is not authenticated and tries to access the application:

```text
Protected route → Login
```

Persist Firebase authentication state.

---

# 7. USER DATA SECURITY

This is extremely important.

Every expense and budget must belong to a specific Firebase user.

Use:

```js
userId: auth.currentUser.uid;
```

Every query must filter by the logged-in user's UID.

A user must NEVER be able to see another user's:

- Expenses
- Budgets
- Receipts
- Profile information

Create proper Firestore security rules.

Users can:

- Read their own user document
- Update their own user document
- Create/read/update/delete their own expenses
- Create/read/update/delete their own budgets

No public access to private expense data.

---

# 8. APPLICATION STRUCTURE

Create these main pages:

```text
/login
/signup
/forgot-password
/
/expenses
/add-expense
/edit-expense/:id
/budget
/profile
```

Use protected routes for all authenticated pages.

---

# 9. MAIN DASHBOARD

The dashboard should be the main home screen.

Design it as a professional financial dashboard.

## Header

Show:

- Greeting
- User name
- Profile picture
- Notification/menu area if needed
- Logout option

Example:

```text
Good Morning, Satya
Manage your home expenses easily.
```

---

# 10. MONTHLY BUDGET

The user should be able to create a budget for each month.

Example:

```text
September 2026
Monthly Budget
₹30,000
```

The user enters:

- Month
- Monthly budget amount

Store:

```text
budgets/{budgetId}
```

Example:

```js
{
  userId: "UID",
  month: "2026-09",
  budget: 30000,
  createdAt,
  updatedAt
}
```

Only one budget should exist for each:

```text
user + month
```

If the budget already exists:

Show:

```text
Edit Budget
```

instead of creating a duplicate.

---

# 11. MONTHLY BUDGET CALCULATION

For the selected month calculate:

```text
Monthly Budget
-
Total Expenses
=
Remaining Budget
```

Example:

```text
Monthly Budget       ₹30,000
Total Spent          ₹18,500
Remaining            ₹11,500
```

Also calculate:

```text
Percentage Used
```

Example:

```text
61.7% used
```

Display a clean progress bar.

Use different visual states:

- Normal spending
- Near budget limit
- Budget exceeded

Do not allow the calculation to become negative incorrectly.

If expenses exceed the budget:

```text
Budget Exceeded
₹2,500 over budget
```

---

# 12. EXPENSE SYSTEM

Expenses are the actual transactions.

The same expense data should be used for:

- Monthly budget calculations
- Monthly expense reports
- Past 7 days
- Category analysis
- Charts
- Expense history

Do NOT create two separate databases for "budget expenses" and "normal expenses".

---

# 13. ADD EXPENSE

Create a highly usable mobile-first Add Expense screen.

Fields:

### Expense Name

Example:

```text
Grocery Shopping
```

### Amount

Example:

```text
₹1,850
```

### Category

Provide:

- Food
- Groceries
- Travel
- Shopping
- Bills
- Healthcare
- Education
- Entertainment
- Home
- EMI
- Utilities
- Other

Allow a clean category selector.

### Date

Default to today's date.

Allow the user to change it.

### Description

Optional.

### Receipt/Image

Optional.

Allow:

- Camera on mobile
- Gallery upload
- Desktop file upload

Show image preview.

Upload the image to Cloudinary.

Store only the Cloudinary URL in Firestore.

---

# 14. EXPENSE FIRESTORE DOCUMENT

Store expenses like:

```js
{
  userId: "firebase-user-id",
  title: "Grocery Shopping",
  amount: 1850,
  category: "Groceries",
  date: "2026-09-22",
  description: "Monthly groceries",
  imageUrl: "https://res.cloudinary.com/...",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

---

# 15. EXPENSE LIST

Create a professional expense history page.

Each expense card should display:

```text
Groceries
Monthly Shopping

₹1,850

22 Sep 2026
Groceries
```

If an image exists:

- Show a small thumbnail.

Clicking an expense opens:

```text
Expense Details
```

Show:

- Name
- Amount
- Category
- Date
- Description
- Receipt
- Created date

Actions:

```text
Edit
Delete
```

Ask for confirmation before deletion.

---

# 16. FILTERS

Create a powerful but simple filtering system.

Main filters:

```text
This Month
Past 7 Days
Select Month
Custom Date Range
```

Also allow:

```text
Category
```

and:

```text
Search
```

Search by:

- Expense name
- Description
- Category

Sorting:

```text
Newest First
Oldest First
Highest Amount
Lowest Amount
```

Filters must work well on mobile.

Use a bottom sheet/modal for filters on small screens.

---

# 17. THIS MONTH

When selecting:

```text
This Month
```

show only expenses belonging to the current month.

Calculate:

- Total spent
- Number of expenses
- Category totals
- Budget usage
- Remaining budget

---

# 18. PAST 7 DAYS

When selecting:

```text
Past 7 Days
```

show expenses from the previous 7 days including today.

Calculate:

```text
Total spent
Expense count
Category distribution
```

Do not confuse this with the monthly budget.

The monthly budget should still be calculated based on the selected month.

---

# 19. MONTH SELECTOR

Allow the user to select:

```text
January
February
March
...
December
```

and year.

Example:

```text
September 2026
```

When selected:

- Fetch that month's expenses
- Fetch that month's budget
- Calculate totals
- Update charts
- Update budget progress

---

# 20. DASHBOARD CARDS

At the top of the dashboard show four cards:

### Monthly Budget

```text
₹30,000
```

### Spent

```text
₹18,500
```

### Remaining

```text
₹11,500
```

### Expenses

```text
24
```

Cards should be responsive.

On mobile:

```text
2 × 2 grid
```

or a horizontally scrollable compact card layout if necessary.

---

# 21. RECENT EXPENSES

Dashboard should show:

```text
Recent Expenses
```

Show latest 5–8 expenses.

Each item:

```text
Icon
Expense Name
Category
Date
Amount
```

Provide:

```text
View All
```

button.

---

# 22. CHARTS

Add useful charts.

## Category Spending

Use a donut/pie chart.

Example:

```text
Groceries     35%
Bills         20%
Travel        15%
Food          15%
Other         15%
```

## Monthly Spending

Use a bar/line chart.

Show spending across days or months depending on selected filter.

Charts must be responsive.

On mobile, charts should fit within the screen without horizontal scrolling.

---

# 23. QUICK ADD

Dashboard should have a prominent:

```text
+ Add Expense
```

button.

On mobile, consider a floating action button.

On desktop, use a normal primary button.

---

# 24. BUDGET PAGE

Create a dedicated Budget page.

Show:

```text
Current Month
₹30,000 Budget

Spent
₹18,500

Remaining
₹11,500
```

Include:

- Budget progress
- Spending percentage
- Budget status
- Edit budget
- Month selector

Also show previous



## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
