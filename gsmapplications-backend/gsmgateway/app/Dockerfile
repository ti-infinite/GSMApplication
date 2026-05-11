FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

RUN apk add --no-cache icu-libs
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

ARG TARGETARCH
WORKDIR /src

COPY ./*.sln ./
COPY ./NuGet.config* ./
COPY ./Directory.Build.props* ./
COPY ./Directory.Build.targets* ./
COPY ./Directory.Packages.props* ./
COPY ./global.json* ./

COPY ./src/*.csproj ./src/
COPY ./src/GSMGateway.Api/*.csproj ./src/GSMGateway.Api/
COPY ./src/GSMGateway.Entities/*.csproj ./src/GSMGateway.Entities/
COPY ./src/GSMGateway.Abstractions/*.csproj ./src/GSMGateway.Abstractions/
COPY ./src/GSMGateway.Infrastructure/*.csproj ./src/GSMGateway.Infrastructure/
COPY ./src/GSMGateway.Business/*.csproj ./src/GSMGateway.Business/
COPY ./src/GSMGateway.Tenant/*.csproj ./src/GSMGateway.Tenant/

RUN --mount=type=cache,target=/root/.nuget/packages,id=nuget-packages,sharing=locked \
    --mount=type=cache,target=/root/.local/share/NuGet/v3-cache,id=nuget-v3,sharing=locked \
    case "$TARGETARCH" in \
      "arm64") RID="linux-musl-arm64" ;; \
      "amd64") RID="linux-musl-x64" ;; \
      *) echo "Arquitectura no soportada: $TARGETARCH" && exit 1 ;; \
    esac && \
    dotnet restore ./src/GSMGateway.Api/GSMGateway.Api.csproj -r "$RID" --verbosity minimal

COPY ./src ./src

RUN case "$TARGETARCH" in \
      "arm64") RID="linux-musl-arm64" ;; \
      "amd64") RID="linux-musl-x64" ;; \
      *) echo "Arquitectura no soportada: $TARGETARCH" && exit 1 ;; \
    esac && \
    dotnet publish ./src/GSMGateway.Api/GSMGateway.Api.csproj \
      -c Release \
      -o /app/out \
      -r "$RID" \
      /p:SelfContained=false \
      /p:StripSymbols=true \
      /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache wget && adduser -u 1001 -D appuser

COPY --from=build /app/out ./
RUN chown -R appuser:appuser /app

USER appuser

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:80
EXPOSE 80

HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/api/health || exit 1

ENTRYPOINT ["dotnet", "GSMGateway.Api.dll"]