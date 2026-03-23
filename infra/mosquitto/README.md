# KWHU Mosquitto Runtime

This folder contains the KWHU-specific Mosquitto runtime files for local Docker and later VM deployment.

The broker is configured for:

- TLS on port `8883`
- dynamic security plugin authentication and ACLs
- a generated local CA and server certificate under `infra/mosquitto/runtime`
- wallet-linked publisher credentials provisioned by the metering service

Runtime-generated files are written to `infra/mosquitto/runtime/` and ignored by git.
