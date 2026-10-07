# Alexen VPN agent: runs AmneziaWG (userspace amneziawg-go) and OpenVPN on a
# server, configured and read by the panel over mutual TLS (agent.py).
FROM golang:1.25-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends git make gcc libc6-dev && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/amnezia-vpn/amneziawg-go /src/awg-go \
 && cd /src/awg-go && CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /out/amneziawg-go .
RUN git clone --depth 1 https://github.com/amnezia-vpn/amneziawg-tools /src/awg-tools \
 && cd /src/awg-tools/src && make && cp wg /out/awg

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 openvpn openssl iptables iproute2 ca-certificates procps wireguard-tools \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/amneziawg-go /out/awg /usr/local/bin/
COPY agent.py /app/agent.py
ENV PYTHONUNBUFFERED=1
CMD ["python3", "/app/agent.py"]
