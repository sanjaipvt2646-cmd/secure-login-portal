
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        AWS_ACCOUNT_ID = '887074880802'
        AWS_REGION = 'eu-north-1'
        ECR_REPOSITORY = 'secure-login-portal'
        ECR_REGISTRY = '887074880802.dkr.ecr.eu-north-1.amazonaws.com'
        ECR_IMAGE = '887074880802.dkr.ecr.eu-north-1.amazonaws.com/secure-login-portal'
        PROJECT_DIR = '/home/ubuntu/secure-login-portal'
        COMPOSE_PROJECT = 'secure-login-portal'
        APP_URL = 'http://localhost:3000'
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
                    echo "Project files verified."
                '''
            }
        }

        stage('Verify AWS Access') {
            steps {
                sh '''
                    set -e
                    aws sts get-caller-identity
                    aws ecr describe-repositories \
                      --repository-names "$ECR_REPOSITORY" \
                      --region "$AWS_REGION"
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e
                    docker build \
                      -t "$ECR_IMAGE:latest" \
                      -t "$ECR_IMAGE:$BUILD_NUMBER" .
                '''
            }
        }

        stage('Login to AWS ECR') {
            steps {
                sh '''
                    set -e
                    aws ecr get-login-password --region "$AWS_REGION" |
                    docker login --username AWS --password-stdin "$ECR_REGISTRY"
                '''
            }
        }

        stage('Push Image to ECR') {
            steps {
                sh '''
                    set -e
                    docker push "$ECR_IMAGE:latest"
                    docker push "$ECR_IMAGE:$BUILD_NUMBER"
                '''
            }
        }

        stage('Deploy from ECR') {
            steps {
                sh '''
                    set -e

                    test -r "$PROJECT_DIR/.env"
                    test -f "$PROJECT_DIR/docker-compose.yml"

                    docker compose \
                      -p "$COMPOSE_PROJECT" \
                      --env-file "$PROJECT_DIR/.env" \
                      -f "$PROJECT_DIR/docker-compose.yml" \
                      --project-directory "$PROJECT_DIR" \
                      pull app

                    docker compose \
                      -p "$COMPOSE_PROJECT" \
                      --env-file "$PROJECT_DIR/.env" \
                      -f "$PROJECT_DIR/docker-compose.yml" \
                      --project-directory "$PROJECT_DIR" \
                      up -d --no-build --no-deps app
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -e

                    for i in $(seq 1 15); do
                        if curl -fsS "$APP_URL/" >/dev/null; then
                            echo "Application health check successful."
                            exit 0
                        fi
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
            echo 'SUCCESS: Secure Login Portal deployed from AWS ECR!'
        }

        failure {
            echo 'FAILURE: Check Jenkins Console Output.'
        }
    }
}
