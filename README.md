# Odessa

![GitHub CI](https://github.com/mit-ccc/odessa/actions/workflows/main.yml/badge.svg) [![React](https://badges.aleen42.com/src/react.svg)](https://react.dev/) [![Python](https://badges.aleen42.com/src/python.svg)](https://www.python.org/) [![Docker](https://badges.aleen42.com/src/docker.svg)](https://www.docker.com/)

Oh, a DEcentralized Social Systems App!

## Development

Odessa is a React Native app which uses GraphQL to talk to a Python
backend connected to a Postgres database. Tech you'll need to know:

- React Native
- Python
- GraphQL (Ariadne is the Python framework)
- Postgres
- SQLAlchemy
- Docker

## If this is your first time accessing Odessa

Make sure to have the following installed:

- command-line dependencies
    - Node, React Native Paper, React Navigation, android-platform-tools, android-sdk, docker, docker-compose, postgresql@14, and pip-tools (if updating future requirements)
    - Install cocoapods and gradle in the `OdessaApp/` directory
- Docker desktop
- [JDK](https://www.oracle.com/java/technologies/downloads/) ≤ 21 for gradle compatibility
- XCode, with iOS installed
- Android Studio, with a Pixel 5 with API 33 installed
- 1Password and access to the Eng-deployment vault

With these installed, head over to the `services/` directory README for further instructions.
