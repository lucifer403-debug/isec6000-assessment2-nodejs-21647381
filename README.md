# ISEC6000 Assessment 2 – Node.js CI/CD Pipeline (21647381)

Fork of the AWS Elastic Beanstalk Express sample, extended with a secure Jenkins CI/CD pipeline.

## Repository layout
| Path | Purpose |
|------|---------|
| `app.js` | Express application (exported for testing) |
| `server.js` | Starts the app on port 8080 |
| `tests/` | Jest + Supertest unit tests |
| `Jenkinsfile` | Pipeline as code (Node 16 agent, tests, scan, security gate, Docker build/push) |
| `Dockerfile`, `.dockerignore` | Production container image (non-root, Alpine) |

## Pipeline stages
1. Checkout – records the commit being built
2. Install Dependencies – `npm ci` in a `node:16` container
3. Unit Tests – `npm test` (JUnit + coverage reports)
4. Dependency Vulnerability Scan – `npm audit` reports archived
5. Security Gate – build fails on any **High/Critical** vulnerability
6. Build Docker Image – tagged with the build number and `latest`
7. Push to Docker Hub – `lucifer403debug/isec6000-assessment2-21647381`

## Related repositories
- Jenkins + Docker-in-Docker Compose configuration: `isec6000-assessment2-jenkins-compose-21647381`

## Run locally
```bash
npm ci
npm test
npm start   # http://localhost:8080
```
