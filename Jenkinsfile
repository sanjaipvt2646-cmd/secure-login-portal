
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        PROJECT_DIR = '/home/ubuntu/secure-login-portal'
        COMPOSE_PROJECT = 'secure-login-portal'
        APP_URL = 'http://localhost:3000'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub...'
                checkout scm
            }
        }

        stage('Verify Project') {
            steps {
                sh '''
                    set -e
                    test -f Dockerfile
                    test -f docker-compose.yml
                    test -f package.json
                    test -f server.js
                    echo "Project files verified successfully."
                '''
            }
        }

        stage('Docker Build and Deploy') {
            steps {
                sh '''
                    set -e

                    echo "Building and deploying application..."

                    docker compose \
                      -p "$COMPOSE_PROJECT" \
                      --env-file "$PROJECT_DIR/.env" \
                      -f "$WORKSPACE/docker-compose.yml" \
                      up -d --build --no-deps app

                    echo "Application deployment completed."
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e

                    echo "Checking application health..."

                    for i in $(seq 1 15); do
                        if curl -fsS "$APP_URL/api/health" > /dev/null; then
                            echo "Application health check successful!"
                            exit 0
                        fi

                        echo "Waiting for application... attempt $i"
                        sleep 5
                    done

                    echo "Application health check failed."
                    docker logs secure-login-portal-app-1 --tail 50
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Secure Login Portal deployed successfully!'
        }

        failure {
            echo 'FAILED: Check Jenkins console output for errors.'
        }

        always {
            echo 'Jenkins pipeline execution completed.'
        }
    }
}
