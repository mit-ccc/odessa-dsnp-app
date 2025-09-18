#!/bin/bash
# Script to start accounts and graph gateway services on the given Frequency net

# Function to display help message
show_help() {
    echo "Usage: services/start.sh [options]"
    echo "Options:"
    echo "  -h, --help                 Show this help message and exit"
    echo "  -n, --name                 Specify the project name"
}

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) show_help; exit 0 ;;
        -n|--name) BASE_NAME="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; show_help; exit 1 ;;
    esac
    shift
done

ENV_FILE=.env.dsnp  # Should change this based on dev/prod!

# Check for Docker and Docker Compose
if ! command -v docker &> /dev/null || ! command -v docker compose &> /dev/null; then
    printf "Docker and Docker Compose are required but not installed. Please install them and try again.\n"
    exit 1
fi

echo "Using environment file: $ENV_FILE"

set -a; source ${ENV_FILE}; set +a

COMPOSE_FILE="-f docker-compose.dsnp.yaml"
PROFILES="--profile frequency-node --profile dsnp-gateway"

# Start all services in detached mode
echo -e "\nStarting all services..."
docker compose ${COMPOSE_FILE} ${PROFILES} up -d
