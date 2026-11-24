
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        PROJECT_DIR = '/home/ubuntu/secure-login-portal'
        APP_URL = 'http://localhost:3000'
        APP_CONTAINER = 'secure-login-portal-app-1'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Project Files') {
            steps {
                sh '''
                    set -e
                    test -f Dockerfile
                    test -f docker-compose.yml
                    test -f package.json
                    test -f server.js
                    echo "All project files verified."
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e
                    docker build -t secure-login-portal-app:$BUILD_NUMBER .
                    echo "Docker image built successfully."
                '''
            }
        }

        stage('Deploy Application') {
            steps {
                sh '''
                    set -e
                    docker compose \
                      -p secure-login-portal \
                      --project-directory "$PROJECT_DIR" \
                      -f "$PROJECT_DIR/docker-compose.yml" \
                      up -d --no-deps --no-build app
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e
                    for i in $(seq 1 15); do
                        if curl -fsS "$APP_URL/" >/dev/null; then
                            echo "Application is responding successfully."
                            exit 0
                        fi
                        sleep 5
                    done

                    echo "Application health check failed."
                    docker logs "$APP_CONTAINER" --tail 50
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Secure Login Portal deployed!'
        }

        failure {
            echo 'FAILURE: Check Jenkins Console Output.'
        }
    }
}
