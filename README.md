# PlateauCare Intelligence

### Population and Workforce Health Early Warning

PlateauCare Intelligence is an AI-assisted public-health surveillance and early-warning platform designed to support disease monitoring and coordinated public-health decision-making in Plateau State, Nigeria.

It combines disease, environmental, workforce, and community health indicators, with an architecture intended to support future expansion.

## Objectives

- Strengthen disease surveillance and early-warning capabilities.
- Combine population, environmental, workforce, and community indicators.
- Identify unusual patterns in submitted health data.
- Provide explainable risk assessments to authorised personnel.
- Support public-health monitoring and response planning.

## Core Modules

- Disease surveillance
- Environmental monitoring
- Workforce monitoring
- Community monitoring
- AI intelligence and risk assessment
- Response management
- Audit logging


## Technology Stack

- Backend: Python, Django, Django REST Framework, PostgreSQL.
- AI and data processing: scikit-learn, NumPy, Pandas, Joblib.
- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Visualisation: Recharts, Leaflet.
- API communication: Axios.

## System Architecture

The React frontend communicates with a Django REST API. PostgreSQL stores application records. The intelligence module prepares selected indicators and applies an Isolation Forest model to support anomaly-based risk assessment.


## AI Model and Responsible Use

The current intelligence module uses an Isolation Forest anomaly-detection approach. Its outputs are decision-support signals, not confirmed outbreak predictions, diagnoses, or disease probabilities.

The current model was developed and tested using simulated data. Prospective real-world public-health validation has not yet been established. Risk assessments should be reviewed by qualified public-health personnel alongside verified local information.

## Security and Data Protection

The backend uses token-based authentication and role-based permissions to restrict access to protected information and operations.

Never commit passwords, API keys, private credentials, production secrets, or identifiable health information to this repository.


## Local Development

### Backend

Configure backend/.env with your secret key and PostgreSQL settings.

Install dependencies with: pip install -r requirements.txt

Run migrations with: python manage.py migrate

Start the backend with: python manage.py runserver

### Frontend

In another terminal, enter frontend, run npm install, then npm run dev.

The Vite development server normally runs at http://localhost:5173.

## API Authentication

The token endpoint is /api/auth/token/.

Send the returned token using the Authorization header: Token YOUR_TOKEN.

## Current Verification

- Backend automated test suite: 188 tests passed in the recorded full-suite run.

- Frontend production build: completed successfully.

- The frontend build reports a large JavaScript bundle warning.

## Project Vision

Start by addressing public-health monitoring needs in Plateau State, with an adaptable architecture for potential expansion across Nigeria, Africa, and other regions.

## Disclaimer

This is a software decision-support project. It does not replace medical judgement, laboratory confirmation, official surveillance procedures, or public-health authority decisions.
