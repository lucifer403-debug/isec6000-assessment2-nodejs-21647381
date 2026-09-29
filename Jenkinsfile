// =====================================================================
// ISEC6000 Assessment 2 - CI/CD pipeline for the Express sample app
// Student ID: 21647381
//
// Flow: Checkout -> Install -> Unit Tests -> Dependency Scan ->
//       Security Gate -> Docker Build -> Docker Push
// The scan and the gate both use one saved npm audit result
// (see ci/audit-gate.js).
//
// Node stages run inside a Node 16 container (build agent).
// Docker stages run on the Jenkins controller, which talks to the
// Docker-in-Docker service over TLS (see the compose repository).
// =====================================================================
pipeline {
    // Each stage chooses its own agent (Node 16 container or controller).
    agent any

    options {
        // Log retention: keep the last 20 builds, and artifacts for the last 10.
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
        // Stop a hung build instead of blocking the executor forever.
        timeout(time: 30, unit: 'MINUTES')
        // Only one build at a time, so image tags and reports never clash.
        disableConcurrentBuilds()
    }

    triggers {
        // Check GitHub for new commits on main about every 5 minutes.
        // (Polling is used because the Jenkins VM is not reachable by webhooks.)
        pollSCM('H/5 * * * *')
    }

    environment {
        // Docker Hub repository the image is pushed to.
        IMAGE_NAME = 'lucifer403debug/isec6000-assessment2-21647381'
        // Every build gets a unique, traceable image tag.
        IMAGE_TAG  = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                // Record exactly which commit this build is testing.
                sh 'git log -1 --pretty=format:"Commit: %h | Author: %an | Message: %s"'
                // Start every build with an empty reports folder so no file
                // from an earlier build can be archived with this one.
                sh 'rm -rf reports && mkdir -p reports'
            }
        }

        stage('Install Dependencies') {
            agent {
                docker {
                    image 'node:16'        // Required Node 16 build agent
                    reuseNode true         // Use the same checked-out workspace
                    args '-e HOME=/tmp'    // Writable home for the npm cache
                }
            }
            steps {
                sh 'node --version && npm --version'
                // npm ci installs the exact versions in package-lock.json,
                // so every build uses the same, reproducible dependency tree.
                sh 'npm ci'
            }
        }

        stage('Unit Tests') {
            agent {
                docker {
                    image 'node:16'
                    reuseNode true
                    args '-e HOME=/tmp'
                }
            }
            steps {
                // Runs Jest; writes reports/junit.xml and a coverage report.
                sh 'npm test'
            }
            post {
                always {
                    // Publish test results so Jenkins shows pass/fail trends.
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                }
            }
        }

        stage('Dependency Vulnerability Scan') {
            agent {
                docker {
                    image 'node:16'
                    reuseNode true
                    args '-e HOME=/tmp'
                }
            }
            steps {
                // ONE scan. npm audit exits non-zero whenever it finds anything,
                // so the exit code is ignored here; instead ci/audit-gate.js
                // validates the saved JSON and writes the readable reports.
                // The Security Gate stage then decides from this same file.
                sh '''
                    npm audit --json > reports/npm-audit.json || true
                    node ci/audit-gate.js report reports/npm-audit.json reports
                '''
            }
        }

        stage('Security Gate (High/Critical)') {
            agent {
                docker {
                    image 'node:16'
                    reuseNode true
                    args '-e HOME=/tmp'
                }
            }
            steps {
                script {
                    // 0 = pass, 1 = High/Critical found, 2 = scan missing or invalid.
                    def rc = sh(script: 'node ci/audit-gate.js gate reports/npm-audit.json', returnStatus: true)
                    if (rc == 1) {
                        error('SECURITY GATE FAILED: High/Critical vulnerabilities found. ' +
                              'The image will NOT be built or pushed. See reports/npm-audit.txt.')
                    }
                    if (rc != 0) {
                        error('SECURITY GATE FAILED: the dependency scan did not produce a valid result, ' +
                              'so risk could not be assessed. The image will NOT be built or pushed.')
                    }
                    echo 'SECURITY GATE PASSED: no High/Critical vulnerabilities found.'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                // Runs on the controller; the Docker CLI talks to DinD over TLS.
                sh '''
                    docker version
                    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest .
                    docker image ls ${IMAGE_NAME}
                    mkdir -p reports
                    docker image inspect ${IMAGE_NAME}:${IMAGE_TAG} > reports/image-inspect.json
                '''
            }
        }

        stage('Push to Docker Hub') {
            steps {
                // Credentials come from the Jenkins credential store and are
                // masked in the log. Single quotes stop Groovy from exposing them.
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                                  usernameVariable: 'DH_USER',
                                                  passwordVariable: 'DH_TOKEN')]) {
                    sh '''
                        echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
                        docker push ${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${IMAGE_NAME}:latest
                    '''
                }
            }
            post {
                always {
                    sh 'docker logout || true'
                }
            }
        }
    }

    post {
        always {
            // Keep reports (tests, coverage, audit, image details) with the build.
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true, fingerprint: true
        }
        success {
            echo "SUCCESS: ${IMAGE_NAME}:${IMAGE_TAG} built, scanned and pushed."
        }
        failure {
            echo 'FAILURE: check the stage that failed above and the archived reports.'
        }
    }
}
