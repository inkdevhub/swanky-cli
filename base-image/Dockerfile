# Start from the base image
FROM --platform=linux/amd64 mcr.microsoft.com/devcontainers/base:ubuntu-22.04

LABEL org.opencontainers.image.source=https://github.com/AstarNetwork/swanky-cli

# Update the package lists
RUN apt-get update

# Install Node.js
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs

# Install binaryen, pkg-config, and libssl-dev
RUN apt-get install -y binaryen pkg-config libssl-dev

# Download and install swanky-cli and verify the installation
RUN curl -L https://github.com/AstarNetwork/swanky-cli/releases/download/v2.2.3/swanky-v2.2.3-b7052fb-linux-x64.tar.gz | tar xz -C /opt && \
  ln -s /opt/swanky/bin/swanky /usr/local/bin/swanky

# Install Rustup and Rust, additional components, packages, and verify the installations
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
  /bin/bash -c "source $HOME/.cargo/env && \
  rustup toolchain install nightly-2023-02-07 && \
  rustup default nightly-2023-02-07 && \
  rustup component add rust-src --toolchain nightly-2023-02-07 && \
  rustup target add wasm32-unknown-unknown --toolchain nightly-2023-02-07 && \
  cargo install cargo-dylint dylint-link && \
  cargo install cargo-contract --force --version 2.1.0 && \
  rustc --version"

# Install Yarn 1.x
RUN npm install -g yarn@1

# Verify installations
RUN node --version && \
  wasm-opt --version && \
  pkg-config --version && \
  openssl version && \
  swanky --version && \
  yarn --version

# Clean up the package lists to reduce image size
RUN apt-get clean && rm -rf /var/lib/apt/lists/*