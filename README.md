
# UniNest - Student Accommodation Hub

UniNest is a web application designed to help students find, view, and book accommodation. It also provides a platform for landlords to list and manage their properties.

## ✨ Features

*   **User Roles:** Separate experiences for Students and Landlords.
*   **Property Listings:** Browse, search, and filter properties.
*   **Detailed Property Views:** View property images, amenities, descriptions, and landlord details.
*   **Student Profiles:** Students can save favorite properties and manage their rental information.
*   **Landlord Dashboard:** Landlords can add, edit, manage their properties, and view booking interests.
*   **Booking/Application System:** Students can express interest or apply to book properties.
*   **Reviews & Ratings:** Students can review properties (feature in progress/partially implemented).
*   **Secure Authentication:** Firebase powered authentication for users.
*   **Image Uploads:** For user profiles and property listings.

## 🛠️ Tech Stack

*   **Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **UI Components:** ShadCN UI
*   **Styling:** Tailwind CSS
*   **Authentication & Database:** Firebase (Auth, Firestore, Storage)
*   **Generative AI (Backend):** Genkit (Google AI)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 20.x or later recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js) or [Yarn](https://yarnpkg.com/)
*   A Firebase project set up.
*   A Google AI (Gemini) API Key for Genkit functionalities.

### Environment Variables

1.  Create a `.env.local` file in the root of your project.
2.  Add your Firebase project configuration and Gemini API key to this file. It should look like this:

    ```env
    # Firebase Configuration (replace with your actual Firebase project config)
    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
    NEXT_PUBLIC_FIREBASE_APP_ID=1:your-app-id:web:your-web-app-id
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX # Optional

    # Gemini API Key for Genkit
    GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    ```

    *   You can find your Firebase configuration in your Firebase project settings.
    *   You can get your Gemini API key from [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

### Running Locally

To run the application locally, you'll need to start two development servers:

1.  **Start the Next.js development server:**
    ```bash
    npm run dev
    ```
    This will typically start the frontend application on `http://localhost:9002`.

2.  **Start the Genkit development server (for AI functionalities):**
    Open a new terminal window/tab and run:
    ```bash
    npm run genkit:dev
    ```
    This usually starts the Genkit server on `http://localhost:3400` (or as configured).

## 📁 Project Structure

A brief overview of the key directories:

*   `src/app/`: Contains the Next.js App Router pages and layouts.
    *   `src/app/(auth)/`: Routes related to authentication (login, signup).
    *   `src/app/landlord/`: Routes specific to the landlord dashboard and property management.
    *   `src/app/property/[id]/`: Dynamic route for individual property detail pages.
    *   `src/app/profile/`: Student profile page.
    *   `src/app/globals.css`: Global styles and Tailwind CSS theme configuration.
    *   `src/app/layout.tsx`: Main root layout for the application.
*   `src/components/`: Reusable UI components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/layout/`: Header, Footer components.
    *   `src/components/property/`: Components related to property listings and details.
    *   `src/components/reviews/`: Components for displaying and submitting reviews.
*   `src/lib/`: Utility functions, Firebase configuration, and data management logic.
    *   `src/lib/firebase.ts`: Firebase app initialization.
    *   `src/lib/data.ts`: Functions for interacting with Firestore (fetching/saving data).
    *   `src/lib/types.ts`: TypeScript type definitions.
*   `src/ai/`: Genkit related code.
    *   `src/ai/genkit.ts`: Genkit initialization.
    *   `src/ai/flows/`: Genkit flows for AI functionalities.
*   `src/contexts/`: React Context providers (e.g., `AuthContext.tsx`).
*   `public/`: Static assets.

## ☁️ Deployment

This application is configured for deployment on Firebase App Hosting.
The `apphosting.yaml` file contains basic configuration for the App Hosting backend.
Builds and deployments are typically managed through the Firebase console or Firebase CLI.

## 🙌 Contributing

Contributions are welcome! If you have suggestions or find a bug, please feel free to open an issue or submit a pull request.

---

