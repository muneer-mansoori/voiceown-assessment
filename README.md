# Secure Node.js + MongoDB on GKE
A production-ready DevSecOps implementation showcasing secure deployment of a Node.js application with MongoDB on Google Kubernetes Engine (GKE). Features include container security scanning, hardened Kubernetes manifests, network policies, and infrastructure as code.

## 🏗️ Architecture

- **Application**: Node.js Express API with MongoDB integration
- **Container Security**: Multi-stage Docker builds with Trivy vulnerability scanning
- **Kubernetes Security**: Pod security standards, network policies, resource limits
- **Infrastructure**: Terraform-managed GKE cluster with audit logging
- **CI/CD**: GitLab pipeline with security gates and automated deployments
- **Monitoring**: Prometheus metrics, Grafana dashboards, EFK logging stack

## 📁 Project Structure

```
├── app/                    # Node.js  application
│   ├── src/server.js      # Express server implementation
│   ├── Dockerfile         # Multi-stage container build
│   └── package.json       # Dependencies and scripts
├── k8s/                   # Kubernetes manifests
│   ├── base/              # Core application resources
│   ├── hardening/         # Security policies and constraints
│   └── monitoring/        # Observability stack
├── terraform/gke/         # Infrastructure as code
├── .gitlab-ci.yml         # CI/CD pipeline
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (20.10+)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (1.24+)
- [Terraform](https://www.terraform.io/downloads) (1.0+)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- GitLab project with Container Registry enabled
- GCP project with billing enabled

### Optional Tools
- [Gatekeeper](https://open-policy-agent.github.io/gatekeeper/) for policy enforcement
- [Helm](https://helm.sh/docs/intro/install/) for monitoring stack deployment

### Local Development

1. **Start MongoDB locally**:
   ```bash
   docker run -d --name mongo -p 27017:27017 mongo:5.0
   ```

2. **Install dependencies and run the application**:
   ```bash
   cd app
   npm install  # First time setup to generate package-lock.json
   # npm ci     # Use this for subsequent installs
   
   # Set environment variables and start
   export MONGODB_URI="mongodb://localhost:27017/appdb"
   npm run start
   ```

3. **Test the API** (in a new terminal):
   ```bash
   curl http://localhost:3000/healthz
   # Expected response: {"status":"ok"}
   
   # Test other endpoints
   curl http://localhost:3000/api/time
   curl http://localhost:3000/metrics
   ```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Application port |
| `MONGODB_URI` | `mongodb://mongo:27017/appdb` | MongoDB connection string |
| `NODE_ENV` | `development` | Runtime environment |

### Container Build

```bash
# Build the Docker image
docker build -t secure-node-api:local app

# Run security scan (optional - requires Trivy installation)
# Install Trivy first: brew install aquasecurity/trivy/trivy
trivy image secure-node-api:local

# Stop local MongoDB if running
docker stop mongo || true

# Run the container with MongoDB
docker run -d -p 3000:3000 \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/appdb" \
  secure-node-api:local

# Test the containerized application
curl http://localhost:3000/healthz
```

## 🔧 Infrastructure Setup

### 1. Provision GKE Cluster

```bash
cd terraform/gke
terraform init
terraform plan -var="project_id=YOUR_PROJECT_ID"
terraform apply
```

### 2. Configure kubectl

```bash
gcloud container clusters get-credentials CLUSTER_NAME --region=REGION
```

### 3. Deploy Application

```bash
# Create namespace and secrets
kubectl apply -f k8s/base/namespace.yaml
kubectl -n secure-app create secret generic mongo-credentials \
  --from-literal=uri="mongodb://mongo:27017/appdb"

# Deploy core components
kubectl apply -f k8s/base/

# Apply security hardening
kubectl apply -f k8s/hardening/

# Deploy monitoring (optional)
kubectl apply -f k8s/monitoring/
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl -n secure-app get pods

# Test application
kubectl -n secure-app port-forward svc/api-service 3000:80
curl http://localhost:3000/healthz
```

## 🔄 CI/CD Pipeline

The GitLab CI pipeline implements a secure DevSecOps workflow:

1. **Security Scanning**: Trivy scans source code and fails on HIGH/CRITICAL vulnerabilities
2. **Container Build**: Kaniko builds images only after security scans pass
3. **Image Registry**: Pushes to Google Artifact Registry
4. **Deployment**: Applies Kubernetes manifests with security contexts
5. **Verification**: Health checks and smoke tests

### Required GitLab CI Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `GCP_PROJECT_ID` | GCP project identifier | `my-project-123` |
| `GAR_LOCATION` | Artifact Registry region | `us-central1` |
| `GAR_REPO` | Registry repository name | `secure-apps` |
| `GKE_CLUSTER` | GKE cluster name | `production-cluster` |
| `GKE_LOCATION` | Cluster region/zone | `us-central1-a` |
| `GCP_SA_KEY` | Service account JSON key | `{"type":"service_account"...}` |
| `MONGODB_URI` | Database connection string | `mongodb://user:pass@host:27017/db` |

### Service Account Permissions

The service account requires these IAM roles:
- `roles/artifactregistry.writer`
- `roles/container.developer`
- `roles/iam.serviceAccountTokenCreator` (for Workload Identity)

## 🔐 Security Features

### Container Security
- Multi-stage Docker builds with distroless base images
- Non-root user execution
- Read-only root filesystem
- Vulnerability scanning with Trivy
- No privilege escalation

### Kubernetes Security
- Pod Security Standards enforcement
- Network policies for traffic isolation
- Resource limits and requests
- Security contexts with minimal privileges
- Gatekeeper policy constraints

### Secrets Management
- Kubernetes Secrets for sensitive data
- **Production**: Enable GKE Workload Identity
- **Production**: Use Google Secret Manager integration
- **Production**: Enable envelope encryption with GCP KMS

## 📊 Monitoring & Observability

### Metrics
- Prometheus scraping on `/healthz` endpoint
- Custom application metrics
- Kubernetes cluster metrics
- Grafana dashboards for visualization

### Logging
- EFK stack (Elasticsearch, Fluentd, Kibana)
- Structured JSON logging
- GKE audit logging enabled

### Alerting
- PrometheusRule definitions in `k8s/monitoring/prometheus-alerts.yaml`
- Health check failures
- Resource utilization thresholds

## 🏛️ Compliance & Auditing

- **Audit Logging**: GKE API server audit logs via Terraform
- **Security Baselines**: CIS Kubernetes Benchmark compliance
- **Policy Enforcement**: Gatekeeper constraints for governance
- **Vulnerability Management**: Automated scanning and reporting

## 🔧 Troubleshooting

### Local Development Issues

**Port already in use**:
```bash
# Find process using port 3000
lsof -ti:3000
# Kill the process
kill -9 $(lsof -ti:3000)
# Or use a different port
PORT=3001 npm run start
```

**MongoDB connection issues**:
```bash
# Check if MongoDB container is running
docker ps | grep mongo
# Check MongoDB logs
docker logs mongo
# Restart MongoDB
docker restart mongo
```

**Package installation issues**:
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Kubernetes Issues

**Pod fails to start**:
```bash
kubectl -n secure-app describe pod <pod-name>
kubectl -n secure-app logs <pod-name>
```

**Network connectivity issues**:
```bash
# Check network policies
kubectl -n secure-app get networkpolicies

# Test connectivity
kubectl -n secure-app exec -it <pod-name> -- nslookup mongo-service
```

**Image pull errors**:
```bash
# Verify registry access
kubectl -n secure-app get secrets
kubectl -n secure-app describe secret regcred
```

## 📝 Configuration Notes

- Replace `ghcr.io/example/secure-node-api:latest` with your registry image
- Ingress annotations configured for GKE Ingress Controller
- MongoDB StatefulSet uses persistent volumes for data persistence
- Network policies allow only necessary pod-to-pod communication
- First-time setup requires `npm install` to generate `package-lock.json`
- Use `npm ci` for subsequent installs in CI/CD environments
- Default MongoDB URI assumes local development setup

### Development Tips

- Use `npm run dev` for development with auto-restart
- Check application logs for MongoDB connection status
- Ensure MongoDB is accessible before starting the application
- Use different ports if 3000 is already in use

## 🧹 Cleanup

### Local Development Cleanup

```bash
# Stop and remove MongoDB container
docker stop mongo
docker rm mongo

# Stop Node.js application (if running in background)
pkill -f "node src/server.js"

# Clean up Docker images (optional)
docker rmi secure-node-api:local mongo:5.0
```

### Kubernetes Cleanup

```bash
# Remove application resources
kubectl delete namespace secure-app

# Remove monitoring stack (if deployed)
kubectl delete -f k8s/monitoring/
```

### Infrastructure Cleanup

```bash
# Destroy GKE cluster
cd terraform/gke
terraform destroy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run security scans locally
4. Submit a pull request with tests

## 📄 License

MIT License - see LICENSE file for details
