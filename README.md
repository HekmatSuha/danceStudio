# Dance CRM

Dance CRM is a comprehensive platform for managing dance studios. It features a mobile application for students to discover studios, book classes, and manage their profiles, alongside a powerful web-based administration dashboard for studio owners and staff to oversee schedules, payments, users, and reports.

## Workspaces
- `apps/mobile`: Expo React Native client for students.
- `apps/web-admin`: Next.js admin dashboard for studio owners.
- `supabase`: Database schema and policies (managed via SQL scripts in root).

## Roles

The system supports the following user roles:

- **Main Admin (Platform Owner)**: Has full access to the system. Manages global settings, onboarded studios, and platform-wide configurations.
- **Studio Admin (Owner)**: Manages a specific dance studio. Responsibilities include managing instructors, creating class schedules, viewing bookings, and handling studio-specific settings.
- **Instructor**: Can view their assigned class rosters and schedule.
- **Student (User)**: Uses the mobile app to browse studios, view class details, book spots, and make payments.

## Pages and Descriptions

### Mobile App (Student Portal)
- **Auth**:
  - **Login/Register**: secure authentication for users.
- **Tabs**:
  - **Home**: Browse available dance studios.
  - **Bookings**: View upcoming and past class bookings.
  - **Profile**: Manage personal information, payment methods, and settings.
- **Studio**:
  - **Studio Details**: View information about a specific studio, including location, description, and available classes.
- **Classes**:
  - **Class Details**: detailed view of a specific class, including instructor info and schedule.
  - **Instructor Roster**: View details about instructors.

### Web Admin (Studio Management)
- **Login**: Secure access for administrators.
- **Dashboard**: High-level overview of studio performance, recent bookings, and key metrics.
- **Studios**: Manage studio locations and details.
- **Classes**: Create and manage the class schedule, assign instructors, and set capacities.
- **Bookings**: View and manage student bookings for classes.
- **Profile**: Manage admin profile settings.
- **Payments**: Track and manage transactions.

## Installation & Running

**Prerequisites:**
- [Node.js](https://nodejs.org/) (LTS version recommended)
- npm (comes with Node)

**Steps:**

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the Web Admin:**
    ```bash
    npm run dev:web
    ```
    Access the dashboard at `http://localhost:3000`.

3.  **Run the Mobile App:**
    ```bash
    npx expo start:mobile
    ```
    This starts the Expo development server. You can:
    - Scan the QR code with the **Expo Go** app on your phone.
    - Press `a` for Android Emulator.
    - Press `i` for iOS Simulator.
    - Press `w` for Web browser.

## Build

To build the applications for production:

- **Web Admin**:
  ```bash
  npm --workspace apps/web-admin run build
  ```

- **Mobile (Android)**:
  ```bash
  npm --workspace apps/mobile run android
  ```

- **Mobile (iOS)**:
  ```bash
  npm --workspace apps/mobile run ios
  ```