
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        APP_CONTAINER = 'secure-login-portal-app-1'
        APP_URL = 'http://localhost:3000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Files') {
            steps {
                sh '''
                    test -f Dockerfile
                    test -f docker-compose.yml
                    test -f package.json
                    test -f server.js
                    echo "Project files verified"
                '''
            }
        }

        stage('Build and Deploy') {
            steps {
                sh '''
                    set -e
                    docker compose \
                      --project-directory /home/ubuntu/secure-login-portal \
                      -f /home/ubuntu/secure-login-portal/docker-compose.yml \
                      up -d --build --no-deps app
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e
                    for i in $(seq 1 15); do
                        if curl -fsS "$APP_URL/api/health" >/dev/null; then
                            echo "Application is healthy"
                            exit 0
                        fi
                        sleep 5
                    done

                    echo "Health check failed"
                    docker logs "$APP_CONTAINER" --tail 50
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'Secure Login Portal deployed successfully!'
        }
        failure {
            echo 'Deployment failed. Check Console Output.'
        }
    }
}
