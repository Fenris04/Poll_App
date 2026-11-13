# Poll App

A responsive web application for creating, participating in, and viewing online surveys. Built with Angular and Supabase, Poll App allows users to share their opinions and explore voting results through a simple and user-friendly interface.

## Features

- **Create Surveys:** Create custom surveys with titles, descriptions, categories, and expiration dates.
- **Multiple Questions:** Add multiple questions and answer options to a survey.
- **Single and Multiple Choice:** Choose between single-choice and multiple-choice questions.
- **Vote on Surveys:** Participate in active surveys by selecting answers.
- **Survey Results:** View voting results with percentage-based progress bars.
- **Realtime Updates:** Refresh survey results when new votes are recorded.
- **Survey Categories:** Filter surveys by category.
- **Active and Past Surveys:** Browse active and expired surveys separately.
- **Ending Soon:** Discover surveys that will expire within the next seven days.
- **Responsive Design:** Optimized layouts for desktop, tablet, and mobile devices.

## Technologies Used

| Technology | Purpose |
|---|---|
| Angular | Frontend framework |
| TypeScript | Application logic and type safety |
| HTML | Application structure |
| SCSS | Styling and responsive design |
| Supabase | Database and backend operations |
| Supabase Realtime | Live voting result updates |

The application uses Angular standalone components, Signals for reactive state management, and modern Angular template control flow.

Animations and hover effects are implemented using CSS/SCSS transitions without the Angular Animations library.

## Getting Started

### Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- Angular CLI (optional when using `npx`)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:

   ```bash
   cd <project-directory>
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm start
   ```

5. Open the application in your browser:

   ```
   http://localhost:4200/
   ```

The application requires access to a configured Supabase project to load surveys and submit votes.

## Production Build

To create an optimized production build, run:

```bash
npm run build
```

Angular generates the production files inside the `dist/` directory.

Depending on the Angular project configuration, the browser files are located in:

```text
dist/<project-name>/browser/
```

## Deployment

Poll App can be deployed to a web server using FTP or SFTP.

1. Create a production build.
2. Open the generated `dist/<project-name>/browser/` directory.
3. Upload its contents to the public directory of the web server.
4. Ensure the web server supports Angular client-side routing.

If the application is hosted in a subdirectory, configure the correct base URL when building.

Example:

```bash
npm run build -- --base-href /angular-projects/poll-app/
```

The server must also be configured to serve `index.html` for application routes that do not correspond to physical files.

## Project Structure

```text
src/
├── app/
│   ├── components/
│   │   ├── header/
│   │   ├── hero/
│   │   └── survey-card/
│   ├── pages/
│   │   ├── home/
│   │   ├── create-survey/
│   │   └── survey-detail/
│   ├── services/
│   │   └── supabase.ts
│   ├── app.config.ts
│   └── app.routes.ts
├── index.html
└── styles.scss

public/
└── assets/
```

### Main Components

**Home:** Displays available surveys, categories, active and past surveys, and surveys that are ending soon.

**Create Survey:** Provides a form for creating surveys with multiple questions and answer options.

**Survey Detail:** Displays individual surveys, handles voting, and presents survey results.

**Header:** Provides the application header and navigation.

**Hero:** Displays the introductory section of the homepage.

**Survey Card:** Presents survey information in a reusable card layout.

**Supabase Service:** Handles database requests, survey creation, voting, results, and the Supabase client connection.

## Database and Backend

Supabase is used to store and retrieve survey data.

The application works with the following database tables:

- `surveys`
- `survey_questions`
- `survey_options`

It also uses Supabase database functions for creating surveys, submitting votes, and retrieving voting results.

Supabase Realtime is used to receive notifications about updated survey results.

Database permissions and Row Level Security (RLS) policies should be configured to protect application data.

## Accessibility and Responsive Design

The application includes responsive layouts for different screen sizes, visible keyboard focus styles, accessible form controls, and support for reduced-motion preferences.

The interface uses CSS Grid, Flexbox, and SCSS media queries