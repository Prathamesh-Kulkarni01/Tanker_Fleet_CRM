# **App Name**: Tanker Ledger

## Core Features:

- Trip Entry: Allows supervisors to record driver trips with date, driver selection, trip type, and trip count. Simplifies data input using dropdowns and numeric inputs, posting the records into a PostgreSQL database.
- Slab Configuration: Enables the owner to define trip types and payout slabs with minimum trips, maximum trips and corresponding payout amounts. Uses a simple web form to commit to a PostgreSQL database.
- Monthly Calculation: Automatically calculates total trips (ABC + XYZ) per driver for each month and matches them against predefined payout slabs, which are stored in a PostgreSQL database.
- Ledger Generation: Generates a monthly ledger view displaying the date, ABC trips, XYZ trips, total trips, and final payout, in a register-like format.
- Month Lock: Allows the owner to lock a specific month, preventing further edits to trip entries or slab calculations for that period.
- Payment Tracking: Lets the owner record advance and remaining payments made to drivers, and settlement completion status which posts to the PostgreSQL database; drivers can view their payment status.
- Payout Prediction Tool: Provides drivers with a dashboard view of their current month's total trips, slab progress, and estimated payout. The estimated payout shown to the driver will consider typical end-of-month patterns and other factors from historical data using an AI reasoning tool to determine when to account for them.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), reminiscent of water and reliability, is suitable for the overall aesthetics of the app.
- Background color: Light blue (#E3F2FD), provides a clean and calm backdrop for data-heavy interfaces.
- Accent color: Soft purple (#7E57C2), will draw attention to key actions and interactive elements.
- Body and headline font: 'PT Sans' for clear readability on various devices; a versatile choice suitable for both headings and body text. 
- Use simple, clear icons related to trip management, payment tracking, and reporting, ensuring they are intuitive for users with varying levels of tech experience.
- Mobile-first responsive design with a focus on large, easily tappable buttons and clear data presentation, ensuring ease of use on smaller screens.
- Subtle transitions and loading animations to enhance user experience without being intrusive, such as a smooth transition when locking a month or updating data.