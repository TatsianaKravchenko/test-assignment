FROM golang:1.25-bookworm AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends protobuf-compiler \
 && rm -rf /var/lib/apt/lists/*
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest \
 && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
ENV PATH="/root/go/bin:${PATH}"

WORKDIR /src

COPY go.mod ./
COPY proto ./proto

RUN protoc \
    --go_out=. --go_opt=module=report-service \
    --go-grpc_out=. --go-grpc_opt=module=report-service \
    proto/report.proto

COPY main.go ./
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/report-service .

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/report-service /report-service
EXPOSE 50051
ENTRYPOINT ["/report-service"]
